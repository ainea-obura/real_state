import django_filters

from django.db.models import Count, Q
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.filters import OrderingFilter
from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Position, Users
from utils.custom_pagination import CustomPageNumberPagination
from utils.serilaizer import flatten_errors

from .serializer import (
    PositionCreateSerializer,
    PositionListResponseSerializer,
    PositionStatsSerializer,
    PositionTableItemSerializer,
    PositionUpdateSerializer,
)


class PositionFilter(django_filters.FilterSet):
    """
    Filter for positions with search functionality.
    """

    q = django_filters.CharFilter(method="filter_q")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    is_deleted = django_filters.BooleanFilter(field_name="is_deleted")

    class Meta:
        model = Position
        fields = ["q", "name", "is_deleted"]

    def filter_q(self, queryset, name, value):
        """
        Search in name and description fields.
        """
        return queryset.filter(
            Q(name__icontains=value) | Q(description__icontains=value)
        )


@extend_schema(
    tags=["Positions"],
    description="List all positions (paginated, filterable, searchable).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PositionTableListView(ListAPIView):
    serializer_class = PositionTableItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = PositionFilter
    ordering_fields = ["name", "created_at", "modified_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Get positions queryset with optional filtering.
        """
        queryset = Position.objects.filter(is_deleted=False)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        List positions with pagination and filtering.
        """
        is_dropdown = request.query_params.get("is_dropdown", "false").lower() == "true"
        if is_dropdown:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            data = {
                "count": queryset.count(),
                "results": serializer.data,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = {
                "count": queryset.count(),
                "results": serializer.data,
            }
            return Response(
                {"error": False, "data": data},
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)
        data = {
            "count": queryset.count(),
            "results": serializer.data,
        }
        return Response(
            {"error": False, "data": data},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Positions"],
    request=PositionCreateSerializer,
    responses={201: PositionCreateSerializer},
    description="Create a new position.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class PositionCreateView(CreateAPIView):
    serializer_class = PositionCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Create a new position.
        """
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        position = serializer.save()

        # Return the created position
        response_serializer = PositionTableItemSerializer(position)
        return Response(
            {
                "error": False,
                "message": "Position created successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Positions"],
    request=PositionUpdateSerializer,
    responses={200: PositionUpdateSerializer},
    description="Update an existing position.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class PositionUpdateView(UpdateAPIView):
    serializer_class = PositionUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get position queryset.
        """
        return Position.objects.filter(is_deleted=False)

    def update(self, request, *args, **kwargs):
        """
        Update an existing position.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        position = serializer.save()

        # Return the updated position
        response_serializer = PositionTableItemSerializer(position)
        return Response(
            {
                "error": False,
                "message": "Position updated successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Positions"],
    description="Delete a position (soft delete).",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class PositionDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, position_id):
        """
        Soft delete a position.
        """
        position = Position.objects.get(id=position_id, is_deleted=False)

        # Check if position has staff assigned
        staff_count = Users.objects.filter(position=position, is_deleted=False).count()

        if staff_count > 0:
            return Response(
                {
                    "error": True,
                    "message": f"Cannot delete position. {staff_count} staff member(s) are currently assigned to this position. Please reassign them first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft delete the position
        position.is_deleted = True
        position.save()

        return Response(
            {
                "error": False,
                "message": "Position deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Positions"],
    description="Restore a soft-deleted position.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class PositionRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, position_id):
        """
        Restore a soft-deleted position.
        """
        position = Position.objects.get(id=position_id, is_deleted=True)

        # Restore the position
        position.restore()

        # Return the restored position
        response_serializer = PositionTableItemSerializer(position)
        return Response(
            {
                "error": False,
                "message": "Position restored successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
