from rest_framework import status as drf_status
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
    DestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django.utils import timezone

from properties.models import PropertyService, LocationNode, ProjectDetail, Service
from properties.serializers.project_service_serialerer import (
    ProjectServiceOverviewSerializer,
    ProjectServiceListSerializer,
    ProjectServiceCreateSerializer,
    ProjectServiceUpdateSerializer,
    ProjectServiceDeleteSerializer,
    get_project_service_overview,
    calculate_project_service_statistics,
    ServiceAssignmentSerializer,
)
from utils.custom_pagination import CustomPageNumberPagination
from utils.redis_cache_helper import clear_redis_cache
from utils.format import format_money_with_currency


@extend_schema(
    tags=["Project Services"],
    summary="Get project service overview",
    description="Retrieve comprehensive service overview for a specific project including statistics and assignments",
    parameters=[
        OpenApiParameter(
            name="project_id",
            type=OpenApiTypes.UUID,
            location=OpenApiParameter.PATH,
            description="Project Detail ID to get service overview for",
        ),
    ],
    responses={
        200: ProjectServiceOverviewSerializer,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectServiceOverviewView(RetrieveAPIView):
    """
    Get comprehensive project service overview with statistics and assignments
    """

    serializer_class = ProjectServiceOverviewSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "project_id"

    def get_queryset(self):
        # This is a custom view that doesn't use standard queryset
        return ProjectDetail.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        try:
            project_detail_id = kwargs.get("project_detail_id")

            # Get project service overview
            overview_data = get_project_service_overview(project_detail_id)

            if not overview_data:
                return Response(
                    {
                        "isError": True,
                        "message": "Project not found or no services available",
                    },
                    drf_status.HTTP_404_NOT_FOUND,
                )

            serializer = self.get_serializer(overview_data)
            return Response(
                {
                    "isError": False,
                    "message": "Project service overview retrieved successfully",
                    "data": serializer.data,
                },
                drf_status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Services"],
    summary="Get project service statistics",
    description="Retrieve service statistics for a specific project",
    parameters=[
        OpenApiParameter(
            name="project_id",
            type=OpenApiTypes.UUID,
            location=OpenApiParameter.PATH,
            description="Project Detail ID to get statistics for",
        ),
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectServiceStatisticsView(RetrieveAPIView):
    """
    Get project service statistics
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "project_id"

    def get_queryset(self):
        return ProjectDetail.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        try:
            project_detail_id = kwargs.get("project_detail_id")

            # Calculate project service statistics
            statistics = calculate_project_service_statistics(project_detail_id)

            if not statistics:
                return Response(
                    {
                        "isError": True,
                        "message": "Project not found",
                    },
                    drf_status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "isError": False,
                    "message": "Project service statistics retrieved successfully",
                    "data": statistics,
                },
                drf_status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Services"],
    summary="List project service assignments",
    description="Retrieve paginated list of service assignments for a project",
    parameters=[
        OpenApiParameter(
            name="project_id",
            type=OpenApiTypes.UUID,
            location=OpenApiParameter.PATH,
            description="Project Detail ID to list services for",
        ),
        OpenApiParameter(
            name="page",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description="Page number for pagination",
        ),
        OpenApiParameter(
            name="page_size",
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description="Number of items per page",
        ),
        OpenApiParameter(
            name="status",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Filter by service status (ACTIVE, PAUSED, CANCELLED)",
        ),
        OpenApiParameter(
            name="service_type",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Filter by service type (UNIT, BLOCK, HOUSE, PROJECT)",
        ),
        OpenApiParameter(
            name="search",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Search services by name or description",
        ),
    ],
    responses={
        200: ProjectServiceListSerializer,
        401: OpenApiTypes.OBJECT,
    },
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectServiceListView(ListAPIView):
    """
    List project service assignments with pagination and filtering
    """

    serializer_class = ProjectServiceListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["status"]
    search_fields = ["service__name", "service__description"]

    def get_queryset(self):
        project_detail_id = self.kwargs.get("project_detail_id")

        # Get project detail and node, then all descendants
        try:
            project_detail = ProjectDetail.objects.get(
                id=project_detail_id, is_deleted=False
            )
            project_node = project_detail.node
            descendants = project_node.get_descendants(include_self=True)

            return (
                PropertyService.objects.filter(
                    property_node__in=descendants, is_deleted=False
                )
                .select_related(
                    "service", "property_node", "meter", "last_billed_reading"
                )
                .prefetch_related("property_node__unit_detail")
            )
        except ProjectDetail.DoesNotExist:
            return PropertyService.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)

            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return Response(
                    {
                        "isError": False,
                        "message": "Project services retrieved successfully",
                        "data": self.get_paginated_response(serializer.data).data,
                    },
                    drf_status.HTTP_200_OK,
                )

            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {
                    "isError": False,
                    "message": "Project services retrieved successfully",
                    "data": serializer.data,
                },
                drf_status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Services"],
    summary="Create project service assignment",
    description="Assign a service to a property within a project",
    request=ProjectServiceCreateSerializer,
    responses={
        201: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
    examples=[
        OpenApiExample(
            "Fixed Price Service Assignment",
            value={
                "service_id": "uuid-of-service",
                "property_node_ids": ["uuid-of-property"],
                "status": "ACTIVE",
                "currency": "USD",
                "is_metered": False,
            },
        ),
        OpenApiExample(
            "Metered Service Assignment",
            value={
                "service_id": "uuid-of-service",
                "property_node_ids": ["uuid-of-property"],
                "status": "ACTIVE",
                "currency": "USD",
                "is_metered": True,
                "custom_price": "25.00",
            },
        ),
    ],
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ProjectServiceCreateView(CreateAPIView):
    """
    Create new service assignment for a project
    """

    serializer_class = ProjectServiceCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            service_id = serializer.validated_data["service_id"]
            property_node_ids = serializer.validated_data["property_node_ids"]
            assignment_status = serializer.validated_data["status"]
            currency = serializer.validated_data.get("currency")
            start_date = serializer.validated_data.get("start_date")
            if not start_date:
                start_date = timezone.now().date()
            end_date = serializer.validated_data.get("end_date")
            is_metered = serializer.validated_data["is_metered"]
            custom_price = serializer.validated_data.get("custom_price")

            # Validate service existence
            try:
                service = Service.objects.get(
                    id=service_id, is_active=True, is_deleted=False
                )
            except Service.DoesNotExist:
                return Response(
                    {
                        "isError": True,
                        "message": "Service not found or inactive",
                    },
                    drf_status.HTTP_400_BAD_REQUEST,
                )

            created_assignments = []
            errors = []
            from properties.models import LocationNode

            for node_id in property_node_ids:
                # Validate property node existence
                try:
                    property_node = LocationNode.objects.get(
                        id=node_id,
                        node_type__in=["UNIT", "BLOCK", "HOUSE", "PROJECT"],
                        is_deleted=False,
                    )
                except LocationNode.DoesNotExist:
                    errors.append(
                        {
                            "node_id": str(node_id),
                            "node_name": str(node_id),
                            "error": f"Property node not found",
                        }
                    )
                    continue
                # Check for duplicate assignment (ignore soft-deleted)
                existing_assignment = PropertyService.objects.filter(
                    service=service, property_node=property_node, is_deleted=False
                ).first()
                if existing_assignment:
                    errors.append(
                        {
                            "node_id": str(node_id),
                            "node_name": property_node.name,
                            "error": f"Service already assigned to {property_node.name}",
                        }
                    )
                    continue
                # Validate currency for FIXED and PERCENTAGE pricing types
                if service.pricing_type in ["FIXED", "PERCENTAGE"] and not currency:
                    errors.append(
                        {
                            "node_id": str(node_id),
                            "node_name": property_node.name,
                            "error": f"Currency is required for {service.pricing_type} services.",
                        }
                    )
                    continue
                # Create assignment
                try:
                    assignment = PropertyService.objects.create(
                        service_id=service_id,
                        property_node_id=node_id,
                        status=assignment_status,
                        currency_id=currency if currency else None,
                        start_date=start_date,
                        end_date=end_date,
                        is_metered=is_metered,
                        custom_price=custom_price,
                    )
                    created_assignments.append(assignment)
                except Exception as e:
                    errors.append(
                        {
                            "node_id": str(node_id),
                            "node_name": property_node.name,
                            "error": f"Failed to assign service to {property_node.name}: {str(e)}",
                        }
                    )

            # After collecting errors, group duplicate assignment errors by type
            duplicate_nodes = []
            duplicate_node_ids = set()
            other_errors = []
            for err in errors:
                # Only group nodes that actually have a duplicate assignment
                if (
                    "already assigned" in err["error"]
                    or "duplicate key value violates unique constraint" in err["error"]
                ) and err["error"] == f"Service already assigned to {err['node_name']}":
                    duplicate_nodes.append(err["node_name"])
                    duplicate_node_ids.add(err["node_id"])
                else:
                    other_errors.append(err)

            # Only group and show node names that actually have a duplicate assignment
            grouped_errors = []
            if duplicate_nodes:
                grouped_errors.append(
                    {
                        "error": f"Service already assigned to: {', '.join(duplicate_nodes)}"
                    }
                )
            grouped_errors.extend(other_errors)

            # Clear cache
            clear_redis_cache("project_services:*")

            # If there is a grouped error (e.g., 'Service already assigned to: ...'), use it as the message
            response_message = "Failed to create any service assignments"
            for err in grouped_errors:
                if "error" in err and err["error"].startswith(
                    "Service already assigned to:"
                ):
                    response_message = err["error"]
                    break
            if errors and not created_assignments:
                return Response(
                    {
                        "isError": True,
                        "message": response_message,
                        "errors": grouped_errors,
                    },
                    drf_status.HTTP_400_BAD_REQUEST,
                )

            # Serialize all created assignments
            serializer = ServiceAssignmentSerializer(created_assignments, many=True)
            return Response(
                {
                    "isError": bool(errors),
                    "message": (
                        response_message
                        if errors
                        else f"{len(created_assignments)} service assignment(s) created successfully"
                    ),
                    "data": serializer.data,
                    "errors": grouped_errors if errors else None,
                },
                (
                    drf_status.HTTP_201_CREATED
                    if created_assignments
                    else drf_status.HTTP_400_BAD_REQUEST
                ),
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Services"],
    summary="Update project service assignment",
    description="Update an existing service assignment",
    request=ProjectServiceUpdateSerializer,
    responses={
        200: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class ProjectServiceUpdateView(UpdateAPIView):
    """
    Update existing service assignment
    """

    serializer_class = ProjectServiceUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = PropertyService.objects.all()
    lookup_field = "id"

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop("partial", False)
            instance = self.get_object()
            serializer = self.get_serializer(
                instance, data=request.data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            updated_assignment = serializer.save()

            # Clear cache
            clear_redis_cache("project_services:*")

            return Response(
                {
                    "isError": False,
                    "message": "Service assignment updated successfully",
                    "data": {
                        "id": updated_assignment.id,
                        "status": updated_assignment.status,
                        "currency": updated_assignment.currency,
                        "start_date": updated_assignment.start_date,
                        "end_date": updated_assignment.end_date,
                        "is_metered": updated_assignment.is_metered,
                        "custom_price": (
                            format_money_with_currency(updated_assignment.custom_price)
                            if updated_assignment.custom_price
                            else None
                        ),
                    },
                },
                drf_status.HTTP_200_OK,
            )
        except PropertyService.DoesNotExist:
            return Response(
                {
                    "isError": True,
                    "message": "Service assignment not found",
                },
                drf_status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Services"],
    summary="Delete project service assignment",
    description="Delete a service assignment (soft delete)",
    request=ProjectServiceDeleteSerializer,
    responses={
        200: OpenApiTypes.OBJECT,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True),
    name="dispatch",
)
class ProjectServiceDeleteView(DestroyAPIView):
    """
    Delete service assignment (soft delete)
    """

    serializer_class = ProjectServiceDeleteSerializer
    permission_classes = [IsAuthenticated]
    queryset = PropertyService.objects.all()
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            assignment_id = instance.id

            # Soft delete
            instance.is_deleted = True
            instance.save()

            # Clear cache
            clear_redis_cache("project_services:*")

            return Response(
                {
                    "isError": False,
                    "message": "Service assignment deleted successfully",
                    "data": {
                        "id": assignment_id,
                        "deleted": True,
                    },
                },
                drf_status.HTTP_200_OK,
            )
        except PropertyService.DoesNotExist:
            return Response(
                {
                    "isError": True,
                    "message": "Service assignment not found",
                },
                drf_status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                drf_status.HTTP_400_BAD_REQUEST,
            )
