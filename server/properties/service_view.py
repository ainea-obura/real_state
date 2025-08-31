from rest_framework import status
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

from properties.models import Service
from properties.serializers.serviceSerialzier import (
    ServiceSerializer,
    ServiceCreateSerializer,
    ServiceUpdateSerializer,
    ServiceListSerializer,
)
from utils.custom_pagination import CustomPageNumberPagination


@extend_schema(
    tags=["Services"],
    summary="Create a new service",
    description="Create a new service with pricing and billing configuration",
    request=ServiceCreateSerializer,
    responses={
        201: ServiceSerializer,
        400: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
    examples=[
        OpenApiExample(
            "Fixed Price Service",
            value={
                "name": "Cleaning Service",
                "description": "Regular cleaning service for apartments",
                "pricing_type": "FIXED",
                "base_price": "50.00",
                "currency": "USD",
                "frequency": "MONTHLY",
                "billed_to": "TENANT",
            },
        ),
        OpenApiExample(
            "Percentage Service",
            value={
                "name": "Management Fee",
                "description": "Property management fee",
                "pricing_type": "PERCENTAGE",
                "percentage_rate": "5.00",
                "currency": "USD",
                "frequency": "MONTHLY",
                "billed_to": "OWNER",
            },
        ),
        OpenApiExample(
            "Variable Service",
            value={
                "name": "Utility Service",
                "description": "Variable utility charges",
                "pricing_type": "VARIABLE",
                "currency": "USD",
                "frequency": "MONTHLY",
                "billed_to": "TENANT",
            },
        ),
    ],
)
class ServiceCreateView(CreateAPIView):
    """
    Create a new service using DRF Generic View
    """

    serializer_class = ServiceCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            service = serializer.save()

            # Clear cache
            # clear_redis_cache("services_list:*")

            # Get all services after creation
            all_services = Service.objects.all().order_by("-created_at")
            services_serializer = ServiceListSerializer(all_services, many=True)

            return Response(
                {
                    "isError": False,
                    "message": "Service created successfully",
                    "data": {
                        "count": all_services.count(),
                        "results": services_serializer.data,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Services"],
    summary="Get all services",
    description="Retrieve a paginated list of all services with optional filtering",
    parameters=[
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
            name="pricing_type",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Filter by pricing type (FIXED, PERCENTAGE, VARIABLE)",
        ),
        OpenApiParameter(
            name="billed_to",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Filter by billing target (TENANT, OWNER)",
        ),
        OpenApiParameter(
            name="search",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="Search services by name or description",
        ),
    ],
    responses={
        200: ServiceListSerializer,
        401: OpenApiTypes.OBJECT,
    },
)
class ServiceListView(ListAPIView):
    """
    Get all services with pagination and filtering using DRF Generic View
    """

    serializer_class = ServiceListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["pricing_type", "billed_to"]
    search_fields = ["name", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Service.objects.prefetch_related("property_services").all()

    def list(self, request, *args, **kwargs):
        try:
            is_dropdown = request.query_params.get("is_dropdown", "false")
            queryset = self.filter_queryset(self.get_queryset())

            if is_dropdown is not None and is_dropdown.lower() == "true":
                # No pagination, no cache, return all services
                serializer = self.get_serializer(queryset, many=True)
                return Response(
                    {
                        "isError": False,
                        "message": "Services retrieved successfully",
                        "data": {
                            "count": queryset.count(),
                            "results": serializer.data,
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            # Default: paginated response
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return Response(
                    {
                        "isError": False,
                        "message": "Services retrieved successfully",
                        "data": self.get_paginated_response(serializer.data).data,
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {
                    "isError": False,
                    "message": "Services retrieved successfully",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

@extend_schema(
    tags=["Services"],
    summary="Get service by ID",
    description="Retrieve a specific service by its ID",
    responses={
        200: ServiceSerializer,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
class ServiceRetrieveView(RetrieveAPIView):
    """
    Get a specific service by ID using DRF Generic View
    """

    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    queryset = Service.objects.all()
    lookup_field = "id"

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(
                {
                    "isError": False,
                    "message": "Service retrieved successfully",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        except Service.DoesNotExist:
            return Response(
                {
                    "isError": True,
                    "message": "Service not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Services"],
    summary="Update service",
    description="Update an existing service",
    request=ServiceUpdateSerializer,
    responses={
        200: ServiceSerializer,
        400: OpenApiTypes.OBJECT,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
class ServiceUpdateView(UpdateAPIView):
    """
    Update a specific service using DRF Generic View
    """

    serializer_class = ServiceUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Service.objects.all()
    lookup_field = "id"

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop("partial", False)
            instance = self.get_object()
            
            # If pricing_type is VARIABLE, ignore currency field
            data = request.data.copy()
            if data.get('pricing_type') == 'VARIABLE':
                data.pop('currency', None)
            
            serializer = self.get_serializer(
                instance, data=data, partial=partial
            )
            serializer.is_valid(raise_exception=True)
            updated_service = serializer.save()

            # Clear cache
            # clear_redis_cache("services_list:*")
            # clear_redis_cache(f"service_detail_{instance.id}:*")

            # Get all services after update
            all_services = Service.objects.all().order_by("-created_at")
            services_serializer = ServiceListSerializer(all_services, many=True)

            return Response(
                {
                    "isError": False,
                    "message": "Service updated successfully",
                    "data": {
                        "count": all_services.count(),
                        "results": services_serializer.data,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Service.DoesNotExist:
            return Response(
                {
                    "isError": True,
                    "message": "Service not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Services"],
    summary="Delete service",
    description="Delete a specific service",
    responses={
        204: None,
        404: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
    },
)
class ServiceDestroyView(DestroyAPIView):
    """
    Delete a specific service using DRF Generic View
    """

    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    queryset = Service.objects.all()
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            service_id = instance.id
            instance.delete()

            # Clear cache
            # clear_redis_cache("services_list:*")
            # clear_redis_cache(f"service_detail_{service_id}:*")

            # Get all services after deletion
            all_services = Service.objects.all().order_by("-created_at")
            services_serializer = ServiceListSerializer(all_services, many=True)

            return Response(
                {
                    "isError": False,
                    "message": "Service deleted successfully",
                    "data": {
                        "count": all_services.count(),
                        "results": services_serializer.data,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Service.DoesNotExist:
            return Response(
                {
                    "isError": True,
                    "message": "Service not found",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {
                    "isError": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
