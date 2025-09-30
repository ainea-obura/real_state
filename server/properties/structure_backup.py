from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import CreateAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import (
    BasementDetail,
    BlockDetail,
    FloorDetail,
    LocationNode,
    ProjectDetail,
    RoomDetail,
    SlotDetail,
    UnitDetail,
    VillaDetail,
)
from properties.serializers.common import (
    ApartmentCreateSerializer,
    ApartmentEditSerializer,
    BasementCreateSerializer,
    BlockCreateSerializer,
    BlockEditSerializer,
    HouseCreateSerializer,
    LocationNodeSerializer,
    LocationNodeTreeSerializer,
    NodeDeleteSerializer,
    RoomCreateSerializer,
    RoomEditSerializer,
    VillaEditSerializer,
)

CACHE_TIMEOUT = 600  # 10 minutes


def check_floor_safety(floor_node):
    """
    Check if a floor can be safely deleted (no units or rooms)
    Returns: (is_safe, message)
    """
    # Check for units
    units = LocationNode.objects.filter(
        parent=floor_node, node_type="UNIT", is_deleted=False
    )
    if units.exists():
        return False, f"Floor has {units.count()} units that must be removed first"

    # Check for rooms (directly under floor)
    rooms = LocationNode.objects.filter(
        parent=floor_node, node_type="ROOM", is_deleted=False
    )
    if rooms.exists():
        return False, f"Floor has {rooms.count()} rooms that must be removed first"

    return True, "Floor is safe to delete"


def update_floor_numbers(block_node):
    """
    Update floor numbers after deletion to maintain sequential numbering
    """
    floors = LocationNode.objects.filter(
        parent=block_node, node_type="FLOOR", is_deleted=False
    ).order_by("floor_detail__number")

    for i, floor in enumerate(floors):
        floor.floor_detail.number = i
        floor.floor_detail.save()
        floor.name = f"Floor {i}"
        floor.save()


def manage_floors_for_block(block_node, new_floor_count):
    """
    Manage floors for a block: add or remove floors as needed
    Returns: (added_count, removed_count, messages)
    """
    current_floors = LocationNode.objects.filter(
        parent=block_node, node_type="FLOOR", is_deleted=False
    ).order_by("floor_detail__number")

    current_count = current_floors.count()
    messages = []
    added_count = 0
    removed_count = 0

    if new_floor_count > current_count:
        # Add floors
        floors_to_add = new_floor_count - current_count
        for i in range(floors_to_add):
            floor_num = current_count + i
            floor_node = LocationNode.objects.create(
                name=f"Floor {floor_num}",
                node_type="FLOOR",
                parent=block_node,
            )
            FloorDetail.objects.create(
                node=floor_node,
                number=floor_num,
                description="",  # Empty string instead of None
            )
            added_count += 1
        messages.append(f"Added {added_count} floors")

    elif new_floor_count < current_count:
        # Remove floors (from highest to lowest)
        floors_to_remove = current_count - new_floor_count
        floors_to_delete = list(current_floors)[-floors_to_remove:]

        for floor_node in floors_to_delete:
            is_safe, message = check_floor_safety(floor_node)
            if not is_safe:
                raise ValueError(f"Cannot delete floor: {message}")

            # Delete floor detail first
            FloorDetail.objects.filter(node=floor_node).delete()
            # Delete the floor node
            floor_node.delete()
            removed_count += 1

        # Update remaining floor numbers
        update_floor_numbers(block_node)
        messages.append(f"Removed {removed_count} floors")

    return added_count, removed_count, messages


def manage_floors_for_villa(villa_node, new_floor_count):
    """
    Manage floors for a villa: add or remove floors as needed
    Returns: (added_count, removed_count, messages)
    """
    current_floors = LocationNode.objects.filter(
        parent=villa_node, node_type="FLOOR", is_deleted=False
    ).order_by("floor_detail__number")

    current_count = current_floors.count()
    messages = []
    added_count = 0
    removed_count = 0

    if new_floor_count > current_count:
        # Add floors
        floors_to_add = new_floor_count - current_count
        for i in range(floors_to_add):
            floor_num = current_count + i
            floor_node = LocationNode.objects.create(
                name=f"Floor {floor_num}",
                node_type="FLOOR",
                parent=villa_node,
            )
            FloorDetail.objects.create(
                node=floor_node,
                number=floor_num,
                description="",  # Empty string instead of None
            )
            added_count += 1
        messages.append(f"Added {added_count} floors")

    elif new_floor_count < current_count:
        # Remove floors (from highest to lowest)
        floors_to_remove = current_count - new_floor_count
        floors_to_delete = list(current_floors)[-floors_to_remove:]

        for floor_node in floors_to_delete:
            is_safe, message = check_floor_safety(floor_node)
            if not is_safe:
                raise ValueError(f"Cannot delete floor: {message}")

            # Delete floor detail first
            FloorDetail.objects.filter(node=floor_node).delete()
            # Delete the floor node
            floor_node.delete()
            removed_count += 1

        # Update remaining floor numbers
        update_floor_numbers(villa_node)
        messages.append(f"Removed {removed_count} floors")

    return added_count, removed_count, messages


@extend_schema(
    tags=["Structure"],
    description="Create blocks under a project. Each block must have a name and number of floors.",
    request=BlockCreateSerializer(many=True),
    responses={201: LocationNodeSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class BlockCreateView(CreateAPIView):
    serializer_class = BlockCreateSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.filter(is_deleted=False)

    def create(self, request, *args, **kwargs):
        project_id = kwargs.get("pk")
        # Validate that the request body is a non-empty list
        if not isinstance(request.data, list) or len(request.data) == 0:
            return Response(
                {
                    "error": True,
                    "message": "At least one block must be provided.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        blocks_data = serializer.validated_data

        # Pre-validation: check for duplicate block names in input
        block_names = [block["name"] for block in blocks_data]
        if len(block_names) != len(set(block_names)):
            return Response(
                {
                    "error": True,
                    "message": "Duplicate block names in input.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Pre-validation: check for existing blocks/floors in DB
        project = get_object_or_404(ProjectDetail, id=project_id)
        parent_node = project.node
        existing_block_names = set(
            LocationNode.objects.filter(
                parent=parent_node, node_type="BLOCK"
            ).values_list("name", flat=True)
        )
        for block in blocks_data:
            if block["name"] in existing_block_names:
                return Response(
                    {
                        "error": True,
                        "message": f"Block '{block['name']}' already exists under this project.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            created_blocks = []
            for block in blocks_data:
                block_name = block["name"]
                num_floors = block["floors"]

                # Create block node
                block_node = LocationNode.objects.create(
                    name=block_name,
                    node_type="BLOCK",
                    parent=parent_node,
                )
                # Create block detail with default values
                BlockDetail.objects.create(
                    node=block_node,
                    name=block_name,
                    description="",  # Empty string instead of None
                )

                # Create floor nodes under this block
                for floor_num in range(num_floors + 1):
                    floor_node = LocationNode.objects.create(
                        name=f"Floor {floor_num}",
                        node_type="FLOOR",
                        parent=block_node,
                    )
                    FloorDetail.objects.create(
                        node=floor_node,
                        number=floor_num,
                        description="",  # Empty string instead of None
                    )

                created_blocks.append(block_node)

            # Instead of returning only created blocks, return the full tree after creation
            tree = LocationNodeTreeSerializer(
                parent_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": "Blocks and floors created successfully",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )


@extend_schema(
    tags=["Structure"],
    description="Get the full tree of location nodes under a project (blocks, floors, etc). Returns a nested tree structure.",
    responses={200: LocationNodeTreeSerializer},
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="GET", block=True),
    name="dispatch",
)
class LocationNodeTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        project_id = kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=project_id)
        root_node = project.node
        # Instead of serializing the root node, serialize its direct children as the tree root
        children = root_node.children.all()
        tree = LocationNodeTreeSerializer(children, many=True).data
        return Response(
            {"error": False, "data": {"count": 0, "results": tree}},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Structure"],
    description="Delete all location nodes and their details under a project (except the project node itself). Clears the location tree cache.",
    responses={200: dict},
)
@method_decorator(
    ratelimit(key="ip", rate="2/m", method="DELETE", block=True),
    name="dispatch",
)
class DeleteLocationTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        project_id = kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=project_id)
        root_node = project.node
        descendants = root_node.get_descendants()
        for node in descendants:
            if node.node_type == "BLOCK":
                BlockDetail.objects.filter(node=node).delete()
            elif node.node_type == "FLOOR":
                FloorDetail.objects.filter(node=node).delete()
            # Add more detail deletions as needed
            node.delete()
        return Response(
            {
                "error": False,
                "message": "All location nodes and details under this project have been deleted.",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Structure"],
    description="Create villas (with floors) under a project. Each villa must have a unique name.",
    request=HouseCreateSerializer,
    responses={201: LocationNodeTreeSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class HouseCreateView(CreateAPIView):
    serializer_class = HouseCreateSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.filter(is_deleted=False)

    def create(self, request, *args, **kwargs):
        project_id = kwargs.get("pk")
        if not isinstance(request.data, list) or len(request.data) == 0:
            return Response(
                {
                    "error": True,
                    "message": "At least one house must be provided.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        houses_data = serializer.validated_data

        # Check for duplicate house names in input
        villa_names = [house["name"] for house in houses_data]
        if len(villa_names) != len(set(villa_names)):
            return Response(
                {
                    "error": True,
                    "message": "Duplicate house names in input.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        project = get_object_or_404(ProjectDetail, id=project_id)
        parent_node = project.node
        existing_house_names = set(
            LocationNode.objects.filter(
                parent=parent_node, node_type="HOUSE"
            ).values_list("name", flat=True)
        )
        for house in houses_data:
            if house["name"] in existing_house_names:
                return Response(
                    {
                        "error": True,
                        "message": f"House '{house['name']}' already exists under this project.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            for house in houses_data:
                house_name = house["name"]
                management_mode = house["management_mode"]
                num_floors = house["floors"]
                service_charge = house.get("service_charge")
                house_node = LocationNode.objects.create(
                    name=house_name,
                    node_type="HOUSE",
                    parent=parent_node,
                )
                VillaDetail.objects.create(
                    node=house_node,
                    name=house_name,
                    management_mode=management_mode,
                    service_charge=service_charge,
                )
                # Create floor nodes under this villa
                for floor_num in range(num_floors):
                    floor_node = LocationNode.objects.create(
                        name=f"Floor {floor_num}",
                        node_type="FLOOR",
                        parent=house_node,
                    )
                    FloorDetail.objects.create(
                        node=floor_node,
                        number=floor_num,
                        description="",  # Empty string instead of None
                    )

            # Return the full tree after creation
            tree = LocationNodeTreeSerializer(
                parent_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": "Houses and floors created successfully",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )


@extend_schema(
    tags=["Structure"],
    description="Create basements under a project. Each basement must have a name and number of slots.",
    request=BasementCreateSerializer(many=True),
    responses={201: LocationNodeSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class BasementCreateView(CreateAPIView):
    serializer_class = BasementCreateSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return ProjectDetail.objects.filter(is_deleted=False)

    def create(self, request, *args, **kwargs):
        project_id = kwargs.get("pk")
        if not isinstance(request.data, list) or len(request.data) == 0:
            return Response(
                {
                    "error": True,
                    "message": "At least one parking must be provided.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        basements_data = serializer.validated_data

        # Pre-validation: check for duplicate basement names in input
        basement_names = [basement["name"] for basement in basements_data]
        if len(basement_names) != len(set(basement_names)):
            return Response(
                {
                    "error": True,
                    "message": "Duplicate parking names in input.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        project = get_object_or_404(ProjectDetail, id=project_id)
        parent_node = project.node
        existing_basement_names = set(
            LocationNode.objects.filter(
                parent=parent_node, node_type="BASEMENT"
            ).values_list("name", flat=True)
        )
        for basement in basements_data:
            if basement["name"] in existing_basement_names:
                return Response(
                    {
                        "error": True,
                        "message": f"parking '{basement['name']}' already exists under this project.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            created_basements = []
            for basement in basements_data:
                basement_name = basement["name"]
                num_slots = basement["slots"]

                # Create basement node
                basement_node = LocationNode.objects.create(
                    name=basement_name,
                    node_type="BASEMENT",
                    parent=parent_node,
                )
                BasementDetail.objects.create(node=basement_node, name=basement_name)

                # Create slot nodes under this basement
                for slot_num in range(num_slots):
                    slot_node = LocationNode.objects.create(
                        name=f"Slot {slot_num}",
                        node_type="SLOT",
                        parent=basement_node,
                    )
                    SlotDetail.objects.create(node=slot_node, number=slot_num)

                created_basements.append(basement_node)

            # Instead of returning only created basements, return the full tree after creation
            tree = LocationNodeTreeSerializer(
                parent_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": "parking and slots created successfully",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )


@extend_schema(
    tags=["Structure"],
    description="Create an apartment under a floor in a block for a specific project.",
    request=ApartmentCreateSerializer,
    responses={201: LocationNodeTreeSerializer(many=True)},
)
class ApartmentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        serializer = ApartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        block_id = validated["block"]
        floor_id = validated["floor"]
        unit_data = validated["unit"]

        # Ensure project exists
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node

        # Ensure block is under this project
        try:
            block_node = LocationNode.objects.get(
                id=block_id, node_type="BLOCK", is_deleted=False, parent=project_node
            )
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Block not found under this project.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure floor is under this block
        try:
            floor_node = LocationNode.objects.get(
                id=floor_id, node_type="FLOOR", is_deleted=False, parent=block_node
            )
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": "Floor not found under this block.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate unit identifier under this floor
        identifier = unit_data.get("identifier")
        if identifier:
            exists = LocationNode.objects.filter(
                parent=floor_node,
                node_type="UNIT",
                unit_detail__identifier=identifier,
                is_deleted=False,
            ).exists()
            if exists:
                return Response(
                    {
                        "error": True,
                        "message": f"Unit with identifier '{identifier}' already exists on this floor.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            # Create the LocationNode for the unit
            unit_node = LocationNode.objects.create(
                name=unit_data["identifier"],
                node_type="UNIT",
                parent=floor_node,
            )
            # Create the UnitDetail
            UnitDetail.objects.create(node=unit_node, **unit_data)

            # Return the full tree after creation
            tree = LocationNodeTreeSerializer(
                project_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": "Unit created successfully.",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )


@extend_schema(
    tags=["Structure"],
    description="Edit an apartment (unit) under a floor in a block for a specific project.",
    request=ApartmentEditSerializer,
    responses={200: LocationNodeTreeSerializer(many=True)},
)
class ApartmentEditView(UpdateAPIView):
    serializer_class = ApartmentEditSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "apartment_id"

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        return LocationNode.objects.filter(
            parent__parent__parent=project.node, node_type="UNIT", is_deleted=False
        )

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        apartment_id = kwargs.get("apartment_id")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        block_id = validated["block"]
        floor_id = validated["floor"]
        unit_data = validated["apartment"]

        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node

        # Validate block and floor
        block_node = get_object_or_404(
            LocationNode,
            id=block_id,
            node_type="BLOCK",
            is_deleted=False,
            parent=project_node,
        )
        floor_node = get_object_or_404(
            LocationNode,
            id=floor_id,
            node_type="FLOOR",
            is_deleted=False,
            parent=block_node,
        )

        # Validate unit exists under this floor
        unit_node = get_object_or_404(
            LocationNode,
            id=apartment_id,
            node_type="UNIT",
            is_deleted=False,
            parent=floor_node,
        )
        unit_detail = get_object_or_404(UnitDetail, node=unit_node)

        # Prevent duplicate identifier under this floor
        identifier = unit_data.get("identifier")
        if identifier:
            exists = (
                LocationNode.objects.filter(
                    parent=floor_node,
                    node_type="UNIT",
                    unit_detail__identifier=identifier,
                    is_deleted=False,
                )
                .exclude(id=apartment_id)
                .exists()
            )
            if exists:
                return Response(
                    {
                        "error": True,
                        "message": f"Unit with identifier '{identifier}' already exists on this floor.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            # Update the LocationNode name (identifier)
            if identifier:
                unit_node.name = identifier
                unit_node.save(update_fields=["name"])
            # Update the UnitDetail fields
            for field, value in unit_data.items():
                setattr(unit_detail, field, value)
            unit_detail.save()

            # Return the full tree after update
            tree = LocationNodeTreeSerializer(
                project_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": "Unit updated successfully.",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_200_OK,
            )


@extend_schema(
    tags=["Structure"],
    description="Create a room under an apartment or house floor. Supports both apartment rooms (block, floor, apartment) and house rooms (house, floor).",
    request=RoomCreateSerializer,
    responses={201: LocationNodeTreeSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class RoomCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        serializer = RoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        floor_id = validated["floor"]
        room_data = validated["room"]

        # Determine scenario and validate required fields
        block_id = validated.get("block")
        apartment_id = validated.get("apartment")
        house_id = validated.get("house")

        # Ensure project exists
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node

        # Validate floor exists
        try:
            floor_node = LocationNode.objects.get(
                id=floor_id, node_type="FLOOR", is_deleted=False
            )
        except LocationNode.DoesNotExist:
            return Response(
                {"error": True, "message": "Floor not found.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Scenario 1: Room under Apartment (block -> floor -> apartment -> room)
        if block_id and apartment_id:
            # Validate block is under this project
            try:
                block_node = LocationNode.objects.get(
                    id=block_id,
                    node_type="BLOCK",
                    is_deleted=False,
                    parent=project_node,
                )
            except LocationNode.DoesNotExist:
                return Response(
                    {
                        "error": True,
                        "message": "Block not found under this project.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate floor is under this block
            if floor_node.parent != block_node:
                return Response(
                    {
                        "error": True,
                        "message": "Floor is not under the specified block.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate apartment exists under this floor
            try:
                apartment_node = LocationNode.objects.get(
                    id=apartment_id,
                    node_type="UNIT",
                    is_deleted=False,
                    parent=floor_node,
                )
            except LocationNode.DoesNotExist:
                return Response(
                    {
                        "error": True,
                        "message": "Apartment not found under this floor.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            parent_node = apartment_node
            scenario = "apartment"

        # Scenario 2: Room under House (house -> floor -> room)
        elif house_id:
            # Validate house is under this project
            try:
                house_node = LocationNode.objects.get(
                    id=house_id,
                    node_type="HOUSE",
                    is_deleted=False,
                    parent=project_node,
                )
            except LocationNode.DoesNotExist:
                return Response(
                    {
                        "error": True,
                        "message": "House not found under this project.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate floor is under this house
            if floor_node.parent != house_node:
                return Response(
                    {
                        "error": True,
                        "message": "Floor is not under the specified house.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            parent_node = floor_node
            scenario = "house"

        else:
            return Response(
                {
                    "error": True,
                    "message": "Either provide 'block' and 'apartment' for apartment rooms, or 'house' for house rooms.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate room names under the same parent
        room_name = (
            f"{room_data['room_type'].title()} {room_data.get('size', '')}".strip()
        )
        exists = LocationNode.objects.filter(
            parent=parent_node, node_type="ROOM", name=room_name, is_deleted=False
        ).exists()
        if exists:
            return Response(
                {
                    "error": True,
                    "message": f"Room '{room_name}' already exists under this parent.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Create the LocationNode for the room
            room_node = LocationNode.objects.create(
                name=room_name,
                node_type="ROOM",
                parent=parent_node,
            )

            # Create the RoomDetail
            RoomDetail.objects.create(node=room_node, **room_data)

            # Return the full tree after creation
            tree = LocationNodeTreeSerializer(
                project_node.children.all(), many=True
            ).data
            message = f"Room created successfully under {scenario}."
            return Response(
                {
                    "error": False,
                    "message": message,
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )


@extend_schema(
    tags=["Structure"],
    description="Edit a room under an apartment or house floor.",
    request=RoomEditSerializer,
    responses={200: LocationNodeTreeSerializer(many=True)},
)
class RoomEditView(UpdateAPIView):
    serializer_class = RoomEditSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "room_id"

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        return LocationNode.objects.filter(
            parent__parent__parent=project.node, node_type="ROOM", is_deleted=False
        )

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        room_id = kwargs.get("room_id")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        floor_id = validated["floor"]
        room_data = validated["room"]
        block_id = validated.get("block")
        apartment_id = validated.get("apartment")
        house_id = validated.get("house")

        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node
        floor_node = get_object_or_404(
            LocationNode, id=floor_id, node_type="FLOOR", is_deleted=False
        )

        # Determine parent node (apartment or house)
        if block_id and apartment_id:
            # Apartment scenario
            block_node = get_object_or_404(
                LocationNode,
                id=block_id,
                node_type="BLOCK",
                is_deleted=False,
                parent=project_node,
            )
            if floor_node.parent != block_node:
                return Response(
                    {
                        "error": True,
                        "message": "Floor is not under the specified block.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            apartment_node = get_object_or_404(
                LocationNode,
                id=apartment_id,
                node_type="UNIT",
                is_deleted=False,
                parent=floor_node,
            )
            parent_node = apartment_node
            scenario = "apartment"
        elif house_id:
            # House scenario
            house_node = get_object_or_404(
                LocationNode,
                id=house_id,
                node_type="HOUSE",
                is_deleted=False,
                parent=project_node,
            )
            if floor_node.parent != house_node:
                return Response(
                    {
                        "error": True,
                        "message": "Floor is not under the specified house.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parent_node = floor_node
            scenario = "house"
        else:
            return Response(
                {
                    "error": True,
                    "message": "Either provide 'block' and 'apartment' for apartment rooms, or 'house' for house rooms.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate room exists under this parent
        room_node = get_object_or_404(
            LocationNode,
            id=room_id,
            node_type="ROOM",
            is_deleted=False,
            parent=parent_node,
        )
        room_detail = get_object_or_404(RoomDetail, node=room_node)

        # Prevent duplicate room name under this parent
        room_name = (
            f"{room_data['room_type'].title()} {room_data.get('size', '')}".strip()
        )
        exists = (
            LocationNode.objects.filter(
                parent=parent_node, node_type="ROOM", name=room_name, is_deleted=False
            )
            .exclude(id=room_id)
            .exists()
        )
        if exists:
            return Response(
                {
                    "error": True,
                    "message": f"Room '{room_name}' already exists under this parent.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update the LocationNode name
            room_node.name = room_name
            room_node.save(update_fields=["name"])
            # Update the RoomDetail fields
            for field, value in room_data.items():
                setattr(room_detail, field, value)
            room_detail.save()

            # Return the full tree after update
            tree = LocationNodeTreeSerializer(
                project_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": f"Room updated successfully under {scenario}.",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_200_OK,
            )


@extend_schema(
    tags=["Structure"],
    description="Edit a block's name and floor count under a project.",
    request=BlockEditSerializer,
    responses={200: LocationNodeTreeSerializer(many=True)},
)
class BlockEditView(UpdateAPIView):
    serializer_class = BlockEditSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "block_id"

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        return LocationNode.objects.filter(
            parent=project.node, node_type="BLOCK", is_deleted=False
        )

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        block_id = kwargs.get("block_id")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_name = serializer.validated_data["name"]
        new_floor_count = serializer.validated_data["floors"]

        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node
        block_node = get_object_or_404(
            LocationNode,
            id=block_id,
            node_type="BLOCK",
            is_deleted=False,
            parent=project_node,
        )

        # Prevent duplicate block names under this project
        if (
            LocationNode.objects.filter(
                parent=project_node, node_type="BLOCK", name=new_name, is_deleted=False
            )
            .exclude(id=block_id)
            .exists()
        ):
            return Response(
                {
                    "error": True,
                    "message": f"Block with name '{new_name}' already exists under this project.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update block name
            block_node.name = new_name
            block_node.save(update_fields=["name"])

            # Manage floors
            try:
                added_count, removed_count, messages = manage_floors_for_block(
                    block_node, new_floor_count
                )

                # Build success message
                success_message = f"Block '{new_name}' updated successfully."
                if messages:
                    success_message += f" {', '.join(messages)}."

                tree = LocationNodeTreeSerializer(
                    project_node.children.all(), many=True
                ).data
                return Response(
                    {
                        "error": False,
                        "message": success_message,
                        "data": {"count": len(tree), "results": tree},
                    },
                    status=status.HTTP_200_OK,
                )

            except ValueError as e:
                return Response(
                    {
                        "error": True,
                        "message": str(e),
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )


@extend_schema(
    tags=["Structure"],
    description="Edit a villa's name, floor count, and management mode under a project.",
    request=VillaEditSerializer,
    responses={200: LocationNodeTreeSerializer(many=True)},
)
class VillaEditView(UpdateAPIView):
    serializer_class = VillaEditSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "villa_id"

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        return LocationNode.objects.filter(
            parent=project.node, node_type="HOUSE", is_deleted=False
        )

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        villa_id = kwargs.get("villa_id")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_name = serializer.validated_data["name"]
        new_floor_count = serializer.validated_data["floors"]
        new_management_mode = serializer.validated_data.get("management_mode")
        new_service_charge = serializer.validated_data.get("service_charge")

        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node
        villa_node = get_object_or_404(
            LocationNode,
            id=villa_id,
            node_type="HOUSE",
            is_deleted=False,
            parent=project_node,
        )

        # Prevent duplicate villa names under this project
        if (
            LocationNode.objects.filter(
                parent=project_node, node_type="HOUSE", name=new_name, is_deleted=False
            )
            .exclude(id=villa_id)
            .exists()
        ):
            return Response(
                {
                    "error": True,
                    "message": f"Villa with name '{new_name}' already exists under this project.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update villa name
            villa_node.name = new_name
            villa_node.save(update_fields=["name"])

            # Update villa detail if management_mode or service_charge provided
            villa_detail = get_object_or_404(VillaDetail, node=villa_node)
            if new_management_mode is not None:
                villa_detail.management_mode = new_management_mode
            if new_service_charge is not None:
                villa_detail.service_charge = new_service_charge
            villa_detail.save()

            # Manage floors
            try:
                added_count, removed_count, messages = manage_floors_for_villa(
                    villa_node, new_floor_count
                )

                # Build success message
                success_message = f"Villa '{new_name}' updated successfully."
                if new_management_mode:
                    success_message += (
                        f" Management mode updated to {new_management_mode}."
                    )
                if messages:
                    success_message += f" {', '.join(messages)}."

                tree = LocationNodeTreeSerializer(
                    project_node.children.all(), many=True
                ).data
                return Response(
                    {
                        "error": False,
                        "message": success_message,
                        "data": {"count": len(tree), "results": tree},
                    },
                    status=status.HTTP_200_OK,
                )

            except ValueError as e:
                return Response(
                    {
                        "error": True,
                        "message": str(e),
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )


@extend_schema(
    tags=["Structure"],
    description="Delete any node (block, unit/apartment, room, house, floor, etc.) and all its descendants. Accepts node_type and id in the request body.",
    request=NodeDeleteSerializer,
    responses={200: LocationNodeTreeSerializer(many=True)},
)
class NodeDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, *args, **kwargs):
        serializer = NodeDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        node_type = serializer.validated_data["node_type"].upper()
        node_id = serializer.validated_data["id"]

        project = get_object_or_404(ProjectDetail, id=pk, is_deleted=False)
        project_node = project.node

        # Validate node exists and is under this project
        try:
            node = LocationNode.objects.get(
                id=node_id, node_type=node_type, is_deleted=False
            )
        except LocationNode.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": f"{node_type} node not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ensure node is a descendant of the project node
        current = node
        is_descendant = False
        while current.parent is not None:
            if current.parent == project_node:
                is_descendant = True
                break
            current = current.parent
        if not is_descendant and node != project_node:
            return Response(
                {
                    "error": True,
                    "message": "Node is not under this project.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        def delete_node_and_descendants(node):
            # Recursively delete all descendants and their details
            for child in node.children.all():
                delete_node_and_descendants(child)
            # Delete details for this node type
            if node.node_type == "BLOCK":
                BlockDetail.objects.filter(node=node).delete()
            elif node.node_type == "FLOOR":
                FloorDetail.objects.filter(node=node).delete()
            elif node.node_type == "UNIT":
                UnitDetail.objects.filter(node=node).delete()
            elif node.node_type == "HOUSE":
                VillaDetail.objects.filter(node=node).delete()
            elif node.node_type == "ROOM":
                RoomDetail.objects.filter(node=node).delete()
            # Delete the node itself
            node.delete()

        with transaction.atomic():
            delete_node_and_descendants(node)
            tree = LocationNodeTreeSerializer(
                project_node.children.all(), many=True
            ).data
            return Response(
                {
                    "error": False,
                    "message": f"{node_type.title()} and all its descendants deleted successfully.",
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_200_OK,
            )


@extend_schema(
    tags=["Structure"],
    description="Bulk upload structure from Excel format. Creates blocks, floors, and units in one atomic transaction.",
    request=dict,
    responses={201: LocationNodeTreeSerializer(many=True)},
)
@method_decorator(
    ratelimit(key="ip", rate="2/m", method="POST", block=True),
    name="dispatch",
)
class BulkStructureUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Get the project ID from kwargs
        project_id = kwargs.get("pk")

        # Validate project_id is not None
        if project_id is None:
            return Response(
                {
                    "error": True,
                    "message": "Project ID is missing. This indicates a routing configuration issue.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate UUID format
        try:
            import uuid

            # Convert to UUID object to validate format
            project_uuid = uuid.UUID(str(project_id))
        except (ValueError, TypeError) as e:
            return Response(
                {
                    "error": True,
                    "message": f"Invalid project ID format: {project_id}. Must be a valid UUID.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate request data
        if not isinstance(request.data, list) or len(request.data) == 0:
            return Response(
                {
                    "error": True,
                    "message": "At least one structure row must be provided.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate each row has required fields
        for i, row in enumerate(request.data):
            if not isinstance(row, dict):
                return Response(
                    {
                        "error": True,
                        "message": f"Row {i + 1} must be an object.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            required_fields = ["block_house_name", "floor", "units"]
            for field in required_fields:
                if field not in row:
                    return Response(
                        {
                            "error": True,
                            "message": f"Row {i + 1} missing required field: {field}",
                            "data": None,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Get project and validate it exists
        try:
            project = get_object_or_404(
                ProjectDetail, id=project_uuid, is_deleted=False
            )
            parent_node = project.node
        except ProjectDetail.DoesNotExist:
            return Response(
                {
                    "error": True,
                    "message": f"Project with ID {project_uuid} not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check for existing blocks/houses in DB and collect them for potential floor additions
        existing_blocks = {
            node.name: node
            for node in LocationNode.objects.filter(
                parent=parent_node, node_type="BLOCK", is_deleted=False
            )
        }
        existing_houses = {
            node.name: node
            for node in LocationNode.objects.filter(
                parent=parent_node, node_type="HOUSE", is_deleted=False
            )
        }

        # Group data by block/house name for processing
        structure_data = {}
        for row in request.data:
            name = row["block_house_name"]
            floor = row["floor"]
            units = row["units"]

            if name not in structure_data:
                structure_data[name] = []

            structure_data[name].append({"floor": floor, "units": units})

        # Check for duplicate floors within the same block/house
        for name, floors_data in structure_data.items():
            floor_numbers = [floor_data["floor"] for floor_data in floors_data]
            if len(floor_numbers) != len(set(floor_numbers)):
                # Find and list the duplicate floors
                from collections import Counter

                duplicate_floors = [
                    floor
                    for floor, count in Counter(floor_numbers).items()
                    if count > 1
                ]
                duplicate_details = []
                for dup_floor in duplicate_floors:
                    # Add +2 because: +1 for 0-based index, +1 for header row
                    rows_with_floor = [
                        i + 2
                        for i, row in enumerate(request.data)
                        if row["block_house_name"] == name and row["floor"] == dup_floor
                    ]
                    duplicate_details.append(
                        f"Floor {dup_floor} in '{name}' (rows: {', '.join(map(str, rows_with_floor))})"
                    )

                return Response(
                    {
                        "error": True,
                        "message": f"Duplicate floors found within the same block/house: {', '.join(duplicate_details)}",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            created_blocks = []
            created_houses = []
            updated_blocks = []
            updated_houses = []

            for name, floors_data in structure_data.items():
                # Check if this structure already exists
                existing_block = existing_blocks.get(name)
                existing_house = existing_houses.get(name)

                if existing_block:
                    # Add floors to existing block
                    for floor_data in floors_data:
                        floor_num = floor_data["floor"]
                        units_count = floor_data["units"]

                        # Check if floor already exists
                        existing_floor = LocationNode.objects.filter(
                            parent=existing_block,
                            node_type="FLOOR",
                            floor_detail__number=floor_num,
                            is_deleted=False,
                        ).first()

                        if existing_floor:
                            continue

                        # Create new floor under existing block
                        floor_node = LocationNode.objects.create(
                            name=f"Floor {floor_num}",
                            node_type="FLOOR",
                            parent=existing_block,
                        )
                        FloorDetail.objects.create(
                            node=floor_node,
                            number=floor_num,
                            description="",  # Empty string instead of None
                        )

                        # Create units if specified
                        if units_count != "-" and units_count > 0:
                            for unit_num in range(1, units_count + 1):
                                # Extract letter after "Block " (e.g., "Block A" -> "A")
                                block_letter = (
                                    name.split(" ")[-1] if " " in name else name[0]
                                )
                                unit_identifier = (
                                    f"{block_letter}{floor_num}{unit_num:02d}"
                                )

                                # Create unit node
                                unit_node = LocationNode.objects.create(
                                    name=unit_identifier,
                                    node_type="UNIT",
                                    parent=floor_node,
                                )

                                # Create unit detail with default values
                                UnitDetail.objects.create(
                                    node=unit_node,
                                    management_mode="SERVICE_ONLY",  # Default, can be edited later
                                    status="available",
                                    identifier=unit_identifier,
                                    size="",  # Can be edited later
                                    sale_price=None,
                                    rental_price=None,
                                    description="",  # Empty string instead of None
                                    management_status="for_rent",
                                    currency=None,
                                    unit_type=None,
                                    service_charge=None,
                                )

                    updated_blocks.append(existing_block)

                elif existing_house:
                    # Add floors to existing house
                    for floor_data in floors_data:
                        floor_num = floor_data["floor"]

                        # Check if floor already exists
                        existing_floor = LocationNode.objects.filter(
                            parent=existing_house,
                            node_type="FLOOR",
                            floor_detail__number=floor_num,
                            is_deleted=False,
                        ).first()

                        if existing_floor:
                            continue

                        # Create new floor under existing house
                        floor_node = LocationNode.objects.create(
                            name=f"Floor {floor_num}",
                            node_type="FLOOR",
                            parent=existing_house,
                        )
                        FloorDetail.objects.create(
                            node=floor_node,
                            number=floor_num,
                            description="",  # Empty string instead of None
                        )

                    updated_houses.append(existing_house)

                else:
                    # Create new structure (block or house)
                    # Determine if this is a block or house based on units
                    has_units = any(
                        floors_data[i]["units"] != "-" for i in range(len(floors_data))
                    )

                    if has_units:
                        # This is a BLOCK - create block with floors and units
                        block_node = LocationNode.objects.create(
                            name=name,
                            node_type="BLOCK",
                            parent=parent_node,
                        )
                        BlockDetail.objects.create(
                            node=block_node,
                            name=name,
                            description="",  # Empty string instead of None
                        )
                        created_blocks.append(block_node)

                        # Create floors and units
                        for floor_data in floors_data:
                            floor_num = floor_data["floor"]
                            units_count = floor_data["units"]

                            # Create floor
                            floor_node = LocationNode.objects.create(
                                name=f"Floor {floor_num}",
                                node_type="FLOOR",
                                parent=block_node,
                            )
                            FloorDetail.objects.create(
                                node=floor_node,
                                number=floor_num,
                                description="",  # Empty string instead of None
                            )

                            # Create units if specified
                            if units_count != "-" and units_count > 0:
                                for unit_num in range(1, units_count + 1):
                                    # Extract letter after "Block " (e.g., "Block A" -> "A")
                                    block_letter = (
                                        name.split(" ")[-1] if " " in name else name[0]
                                    )
                                    unit_identifier = (
                                        f"{block_letter}{floor_num}{unit_num:02d}"
                                    )

                                    # Create unit node
                                    unit_node = LocationNode.objects.create(
                                        name=unit_identifier,
                                        node_type="UNIT",
                                        parent=floor_node,
                                    )

                                    # Create unit detail with default values
                                    UnitDetail.objects.create(
                                        node=unit_node,
                                        management_mode="SERVICE_ONLY",  # Default, can be edited later
                                        status="available",
                                        identifier=unit_identifier,
                                        size="",  # Can be edited later
                                        sale_price=None,
                                        rental_price=None,
                                        description="",  # Empty string instead of None
                                        management_status="for_rent",
                                        currency=None,
                                        unit_type=None,
                                        service_charge=None,
                                    )

                        created_blocks.append(block_node)

                    else:
                        # This is a HOUSE - create house with floors only
                        house_node = LocationNode.objects.create(
                            name=name,
                            node_type="HOUSE",
                            parent=parent_node,
                        )
                        VillaDetail.objects.create(
                            node=house_node,
                            name=name,
                            management_mode="SERVICE_ONLY",  # Default, can be edited later
                            service_charge=None,
                        )
                        created_houses.append(house_node)

                        # Create floors only (no units)
                        for floor_data in floors_data:
                            floor_num = floor_data["floor"]

                            floor_node = LocationNode.objects.create(
                                name=f"Floor {floor_num}",
                                node_type="FLOOR",
                                parent=house_node,
                            )
                            FloorDetail.objects.create(
                                node=floor_node,
                                number=floor_num,
                                description="",  # Empty string instead of None
                            )

            # Return the full tree after creation
            tree = LocationNodeTreeSerializer(
                parent_node.children.all(), many=True
            ).data

            # Build success message
            success_message = "Bulk structure operation completed successfully. "
            if created_blocks:
                success_message += f"Created {len(created_blocks)} new blocks. "
            if created_houses:
                success_message += f"Created {len(created_houses)} new houses. "
            if updated_blocks:
                success_message += (
                    f"Added floors to {len(updated_blocks)} existing blocks. "
                )
            if updated_houses:
                success_message += (
                    f"Added floors to {len(updated_houses)} existing houses. "
                )

            return Response(
                {
                    "error": False,
                    "message": success_message,
                    "data": {"count": len(tree), "results": tree},
                },
                status=status.HTTP_201_CREATED,
            )
