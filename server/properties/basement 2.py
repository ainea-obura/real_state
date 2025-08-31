from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from properties.models import LocationNode, ProjectDetail, SlotAssignment
from properties.serializers.basement import (
    AssignSlotsToUnitSerializer,
    AssignSlotToUnitsSerializer,
    DeleteAllUnitAssignmentsSerializer,
    DeleteSlotAssignmentSerializer,
    SlotAssignmentListSerializer,
)


@extend_schema(
    tags=["Basement"],
    description="Assign a slot to multiple units. If the slot is already assigned, the response will indicate this and return the current assignment(s) without making changes.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class AssignSlotToUnitsView(CreateAPIView):
    serializer_class = AssignSlotToUnitsSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot_id = serializer.validated_data["slot_id"]
        unit_ids = serializer.validated_data["unit_ids"]

        # Validate slot exists and is a SLOT node
        try:
            slot = LocationNode.objects.get(id=slot_id, node_type="SLOT")
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Slot not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if slot is already assigned
        existing_assignments = SlotAssignment.objects.filter(
            slot=slot, is_deleted=False
        ).select_related("unit")
        if existing_assignments.exists():
            current_assignments = [
                {
                    "unit_id": str(assignment.unit.id),
                    "unit_name": assignment.unit.name,
                }
                for assignment in existing_assignments
            ]
            return Response(
                {
                    "error": True,
                    "message": "Slot is already assigned.",
                    "data": {
                        "slot_id": str(slot_id),
                        "current_assignments": current_assignments,
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Assign slot to each unit
        created = []
        for unit_id in unit_ids:
            try:
                unit = LocationNode.objects.get(
                    id=unit_id, node_type__in=["UNIT", "HOUSE", "VILLA"]
                )
            except LocationNode.DoesNotExist:
                transaction.set_rollback(True)
                return Response(
                    {
                        "error": True,
                        "message": f"Unit {unit_id} not found.",
                        "data": None,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            assignment = SlotAssignment.objects.create(slot=slot, unit=unit)
            created.append(str(assignment.id))

        return Response(
            {
                "error": False,
                "message": "Slot assigned to units successfully.",
                "data": {
                    "slot_id": str(slot_id),
                    "unit_ids": [str(uid) for uid in unit_ids],
                    "assignments": created,
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Basement"],
    description="List all slot assignments for a project, grouped by unit. Each unit includes its assigned slots.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True),
    name="dispatch",
)
class SlotAssignmentListView(ListAPIView):
    serializer_class = SlotAssignmentListSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response(
                {
                    "error": True,
                    "message": "project_id is required",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            project = ProjectDetail.objects.get(id=project_id)
            project_node = project.node
        except ProjectDetail.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Project not found",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        # Get all units under the project (including houses and villas)
        unit_nodes = LocationNode.objects.filter(
            tree_id=project_node.tree_id,
            lft__gt=project_node.lft,
            rght__lt=project_node.rght,
            node_type__in=["UNIT", "HOUSE", "VILLA"],
        )
        # For each unit, get assigned slots (not soft-deleted)
        results = []
        for unit in unit_nodes:
            assignments = SlotAssignment.objects.filter(
                unit=unit, is_deleted=False
            ).select_related("slot")
            slots = [
                {
                    "slot_id": assignment.slot.id,
                    "slot_name": assignment.slot.name,
                }
                for assignment in assignments
            ]
            results.append(
                {
                    "unit_id": unit.id,
                    "unit_name": unit.name,
                    "slots": slots,
                }
            )
        return Response(
            {
                "error": False,
                "message": "Slot assignments fetched successfully.",
                "data": results,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Basement"],
    description="Delete a slot assignment (remove a slot from a unit) by setting is_deleted=True.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class DeleteSlotAssignmentView(CreateAPIView):
    serializer_class = DeleteSlotAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot_id = serializer.validated_data["slot_id"]
        unit_id = serializer.validated_data["unit_id"]
        assignments = SlotAssignment.objects.filter(
            slot_id=slot_id, unit_id=unit_id, is_deleted=False
        )
        updated = assignments.update(is_deleted=True)
        if updated:
            return Response(
                {
                    "error": False,
                    "message": "Slot assignment deleted successfully.",
                    "data": None,
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "error": True,
                    "message": "Slot assignment not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )


@extend_schema(
    tags=["Basement"],
    description="Delete all slot assignments for a unit by setting is_deleted=True.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class DeleteAllUnitAssignmentsView(CreateAPIView):
    serializer_class = DeleteAllUnitAssignmentsSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit_id = serializer.validated_data["unit_id"]
        assignments = SlotAssignment.objects.filter(unit_id=unit_id, is_deleted=False)
        updated = assignments.update(is_deleted=True)
        return Response(
            {
                "error": False,
                "message": f"Deleted {updated} slot assignment(s) for unit.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Basement"],
    description="Assign multiple slots to a unit. Each slot can only belong to one unit. If a slot is already assigned, return an error with details; do not overwrite or soft-delete.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class AssignSlotsToUnitView(CreateAPIView):
    serializer_class = AssignSlotsToUnitSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        unit_id = serializer.validated_data["unit_id"]
        slot_ids = serializer.validated_data["slot_ids"]
        # Find already assigned slots
        already_assigned = SlotAssignment.objects.filter(
            slot_id__in=slot_ids, is_deleted=False
        )
        if already_assigned.exists():
            data = ", ".join([item.slot.name for item in already_assigned])
            return Response(
                {
                    "error": True,
                    "message": f"{data} are already assigned to this unit.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        for slot_id in slot_ids:
            SlotAssignment.objects.create(
                slot_id=slot_id,
                unit_id=unit_id,
            )
        return Response(
            {
                "error": False,
                "message": f"Assigned {len(slot_ids)} slot(s) to unit.",
                "data": None,
            },
            status=status.HTTP_201_CREATED,
        )
