from django.db import transaction
from django.db.models import Q
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import LocationNode, MaintenanceRequest, ProjectDetail
from properties.serializers.maintenance import (
    MaintenanceRequestCreateSerializer,
    MaintenanceRequestSerializer,
)
from utils.custom_pagination import CustomPageNumberPagination
from utils.serilaizer import flatten_errors


class MaintenancePagination(CustomPageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema(
    tags=["Maintenance"],
    description="List all maintenance requests for a project. Supports pagination and filtering by project_id.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True),
    name="dispatch",
)
class MaintenanceRequestListView(ListAPIView):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = MaintenancePagination

    def get_queryset(self):
        project_id = self.request.query_params.get("project_id")
        qs = MaintenanceRequest.objects.filter(is_deleted=False)
        if project_id:
            try:
                project_detail = ProjectDetail.objects.get(id=project_id)
                project_node = project_detail.node
                qs = qs.filter(
                    Q(node=project_node) |
                    Q(
                        node__tree_id=project_node.tree_id,
                        node__lft__gt=project_node.lft,
                        node__rght__lt=project_node.rght,
                    )
                )
            except ProjectDetail.DoesNotExist:
                return MaintenanceRequest.objects.none()
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Maintenance"],
    description="Create a new maintenance request.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class MaintenanceRequestCreateView(CreateAPIView):
    serializer_class = MaintenanceRequestCreateSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)}
            )
        serializer.save(created_by=request.user)
        return Response(
            {"error": False, "message": "Maintenance request created successfully"},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Maintenance"],
    description="Retrieve a single maintenance request by id.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True),
    name="dispatch",
)
class MaintenanceRequestDetailView(RetrieveAPIView):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return MaintenanceRequest.objects.filter(is_deleted=False)


@extend_schema(
    tags=["Maintenance"],
    description="Update a maintenance request by id.",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="PUT", block=True),
    name="dispatch",
)
class MaintenanceRequestUpdateView(UpdateAPIView):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return MaintenanceRequest.objects.filter(is_deleted=False)

    @transaction.atomic
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


@extend_schema(
    tags=["Maintenance"],
    description="Soft-delete a maintenance request by id (set is_deleted=True).",
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True),
    name="dispatch",
)
class MaintenanceRequestDeleteView(DestroyAPIView):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return MaintenanceRequest.objects.filter(is_deleted=False)

    @transaction.atomic
    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(
            {"detail": "Deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


@extend_schema(
    tags=["Maintenance"],
    description="Get maintenance request stats (total, open, in_progress, resolved, closed, urgent) optionally filtered by project_id.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True),
    name="dispatch",
)
class MaintenanceRequestStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        project_id = request.query_params.get("project_id")
        qs = MaintenanceRequest.objects.filter(is_deleted=False)
        if project_id:
            try:
                project_detail = ProjectDetail.objects.get(id=project_id)
                project_node = project_detail.node
                qs = qs.filter(
                    Q(node=project_node) |
                    Q(
                        node__tree_id=project_node.tree_id,
                        node__lft__gt=project_node.lft,
                        node__rght__lt=project_node.rght,
                    )
                )
            except ProjectDetail.DoesNotExist:
                qs = MaintenanceRequest.objects.none()
        total = qs.count()
        open_count = qs.filter(status="open").count()
        in_progress_count = qs.filter(status="in_progress").count()
        resolved_count = qs.filter(status="resolved").count()
        closed_count = qs.filter(status="closed").count()
        urgent_count = qs.filter(priority="urgent").count()
        return Response(
            {
                "total": total,
                "open": open_count,
                "in_progress": in_progress_count,
                "resolved": resolved_count,
                "closed": closed_count,
                "urgent": urgent_count,
            }
        )


@extend_schema(
    tags=["Maintenance"],
    description="Update the status of a maintenance request (status transitions only).",
    request={"application/json": MaintenanceRequestSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="PATCH", block=True),
    name="dispatch",
)
class MaintenanceRequestStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id, *args, **kwargs):
        try:
            instance = MaintenanceRequest.objects.get(id=id, is_deleted=False)
        except MaintenanceRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        status_value = request.data.get("status")
        allowed_statuses = ["open", "in_progress", "resolved", "closed"]
        if status_value not in allowed_statuses:
            raise ValidationError({"status": "Invalid status value."})
        # Optionally: validate allowed transitions
        instance.status = status_value
        instance.save()
        return Response(MaintenanceRequestSerializer(instance).data)
