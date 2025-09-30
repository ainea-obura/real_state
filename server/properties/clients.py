import json

import django_filters

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.serilaizer import flatten_errors

from .models import LocationNode, PropertyOwner
from .serializers.clients import (
    AgencySerializer,
    OwnerInvoiceSummarySerializer,
    OwnerPropertiesSerializer,
    OwnerRetrieveSerializer,
    OwnerSerializer,
    ProjectOwnerAssignSerializer,
    ProjectOwnerReadSerializer,
    ProjectOwnerSearchSerializer,
    PropertyOwnerIncomeDetailSerializer,
    TenantSerializer,
)


class TenantOwnerFilters(django_filters.FilterSet):
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    first_name = django_filters.CharFilter(
        field_name="first_name", lookup_expr="icontains"
    )
    last_name = django_filters.CharFilter(
        field_name="last_name", lookup_expr="icontains"
    )
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = Users
        fields = ["email", "first_name", "last_name", "is_active"]


@extend_schema(
    tags=["Tenants"], description="List all tenants (paginated, cached, filterable)."
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TenantListView(ListAPIView):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = TenantOwnerFilters

    def get_queryset(self):
        return Users.objects.filter(type="tenant", is_active=True).select_related("city")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(tags=["Tenants"], description="Create a new tenant.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class TenantCreateView(CreateAPIView):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": False,
                    "message": flatten_errors(serializer.errors),
                },
            )
        
        # Check for email duplicates
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    
                )
        
        tenant = serializer.save(type="tenant")
        return Response(
            {
                "error": False,
                "message": "Tenant created successfully",
                "data": TenantSerializer(tenant).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Tenants"], description="Retrieve a tenant by ID (cached).")
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TenantRetrieveView(RetrieveAPIView):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="tenant", is_active=True).select_related("city")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(tags=["Tenants"], description="Update a tenant by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class TenantUpdateView(UpdateAPIView):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="tenant", is_active=True).select_related("city")

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Check for email duplicates (excluding current instance)
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exclude(id=instance.id).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    
                )
        
        with transaction.atomic():
            tenant = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Tenant updated successfully",
                "data": TenantSerializer(tenant).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Tenants"], description="Delete a tenant by ID.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="DELETE", block=True),
    name="dispatch",
)
class TenantDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="tenant")  # Don't filter by is_active for delete view

    def delete(self, request, *args, **kwargs):
        try:
            tenant = self.get_object()
            tenant_name = f"{tenant.first_name} {tenant.last_name}"
            
            # Check if tenant has any active property assignments
            from properties.models import PropertyTenant
            active_assignments = PropertyTenant.objects.filter(
                tenant_user=tenant,
                is_deleted=False
            )
            
            if active_assignments.exists():
                return Response(
                    {
                        "error": True,
                        "message": f"Cannot delete tenant {tenant_name}. They have active property assignments. Please vacate them first.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Soft delete the tenant
            tenant.is_active = False
            tenant.save(update_fields=["is_active"])
            
            return Response(
                {
                    "error": False,
                    "message": f"Tenant {tenant_name} deleted successfully",
                    "data": None,
                },
                status=status.HTTP_200_OK,
            )
            
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Failed to delete tenant: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --- OWNERS ---


@extend_schema(
    tags=["Owners"], description="List all owners (paginated, cached, filterable)."
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class OwnerListView(ListAPIView):
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = TenantOwnerFilters

    def get_queryset(self):
        return Users.objects.filter(type="owner").select_related("city")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(tags=["Owners"], description="Create a new owner.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class OwnerCreateView(CreateAPIView):
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check for email duplicates
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    
                )
        
        with transaction.atomic():
            owner = serializer.save(type="owner")
        return Response(
            {
                "error": False,
                "message": "Owner created successfully",
                "data": OwnerSerializer(owner).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Owners"],
    description="Retrieve comprehensive owner data including properties, income, invoices, documents, and stats (cached).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class OwnerRetrieveView(RetrieveAPIView):
    serializer_class = OwnerRetrieveSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="owner").select_related("city")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": {"count": 0, "results": [serializer.data]}},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Owners"], description="Update an owner by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class OwnerUpdateView(UpdateAPIView):
    serializer_class = OwnerSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="owner").select_related("city")

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Check for email duplicates (excluding current instance)
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exclude(id=instance.id).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    
                )
        
        with transaction.atomic():
            owner = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Owner updated successfully",
                "data": OwnerSerializer(owner).data,
            },
            status=status.HTTP_200_OK,
        )


# --- OWNER PROPERTIES ---
@extend_schema(
    tags=["Owner Properties"],
    description="Retrieve comprehensive owner properties data including portfolio stats, property ownerships, tenants, and maintenance data (cached).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class OwnerPropertiesView(RetrieveAPIView):
    serializer_class = OwnerPropertiesSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="owner").select_related("city")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": {"count": 0, "results": [serializer.data]}},
            status=status.HTTP_200_OK,
        )


# --- OWNER INCOME DETAIL ---
@extend_schema(
    tags=["Owner Income"],
    description="Retrieve comprehensive owner income data including stats, transactions, management fees, monthly breakdown, and pending payments (cached).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class OwnerIncomeDetailView(RetrieveAPIView):
    serializer_class = PropertyOwnerIncomeDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="owner").select_related("city")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": {"count": 0, "results": [serializer.data]}},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Projects"],
    description="Get all project owners with their owned properties using project detail ID.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectOwnersReadView(RetrieveAPIView):
    """
    GET: Retrieve all project owners with their owned properties.
    Accepts project_detail_id and finds the location node through ProjectDetail.
    Returns data in the same format as projectOwners.tsx mock data.
    """

    serializer_class = ProjectOwnerReadSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "project_detail_id"

    def get_queryset(self):
        from .models import ProjectDetail

        return ProjectDetail.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        """Get all project owners for a specific project using project detail ID"""
        try:
            project_detail_id = kwargs.get("project_detail_id")

            # Generate cache key based on project_detail_id and company
            company = request.user.owned_companies.first()
            company_id = company.company.id if company else "no_company"
            # cache_key = f"project_owners:{project_detail_id}:{company_id}"
            # cached_data = cache.get(cache_key)

            # if cached_data:
            #     return Response(
            #         {
            #             "error": False,
            #             "data": {"count": 0, "results": [cached_data]},
            #         },
            #         status=status.HTTP_200_OK,
            #     )

            # Get the project detail and then the location node
            from .models import ProjectDetail

            project_detail = get_object_or_404(
                ProjectDetail,
                id=project_detail_id,
                is_deleted=False,
            )

            # Use the ProjectOwnerReadSerializer with the ProjectDetail instance
            serializer = ProjectOwnerReadSerializer(project_detail)
            response_data = serializer.data

            # Cache the response for 5 minutes
            # cache.set(cache_key, response_data, timeout=300)  # 5 minutes

            return Response(
                {
                    "error": False,
                    "data": {"count": 0, "results": [response_data]},
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Project Owners"],
    description="Search owners by name or phone for project assignment.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ProjectOwnerSearchView(RetrieveAPIView):
    """
    Search owners by name or phone for project assignment.
    Returns filtered list of owners matching search criteria.
    """

    serializer_class = ProjectOwnerSearchSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "search"

    def get_queryset(self):
        """Filter owners by search term"""
        queryset = Users.objects.filter(type="owner", is_deleted=False).select_related(
            "city"
        )

        # Get search term from URL parameter
        search_term = self.kwargs.get("search", "").strip()

        if search_term:
            # Search by name (first_name, last_name, or full name) or phone
            queryset = queryset.filter(
                Q(first_name__icontains=search_term)
                | Q(last_name__icontains=search_term)
                | Q(phone__icontains=search_term)
                | Q(email__icontains=search_term)
            )

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Custom retrieve method with caching"""
        search_term = self.kwargs.get("search", "").strip()

        # Create cache key based on search term
        # cache_key = f"owner-search:search:{search_term}"

        # cached = cache.get(cache_key)
        # if cached:
        #     return Response(
        #         {
        #             "error": False,
        #             "data": {"count": 0, "results": [json.loads(cached)]},
        #         },
        #         status=status.HTTP_200_OK,
        #     )

        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        # cache.set(
        #     cache_key, json.dumps(data, default=str), timeout=600
        # )  # 10 minutes cache
        return Response(
            {
                "error": False,
                "data": {"count": 0, "results": data},
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Project Owners"],
    description="Assign owner to properties (houses and units) within a project.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ProjectOwnerAssignView(CreateAPIView):
    """
    POST: Assign owner to properties within a project.
    Accepts owner_id, project_id, and either properties array or houses array.
    Creates PropertyOwner records and returns assignment results.
    Note: Frontend passes detail IDs (VillaDetail.id, UnitDetail.id), not node IDs.
    """

    serializer_class = ProjectOwnerAssignSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Handle owner assignment to properties"""
        try:
            # Get project_detail_id from URL for additional security
            url_project_detail_id = kwargs.get("project_detail_id")

            # Validate input data using serializer with project_detail_id in context
            serializer = self.get_serializer(
                data=request.data, context={"project_detail_id": url_project_detail_id}
            )
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            # Get validated data from serializer
            owner = validated_data["owner"]
            project = validated_data["project"]
            validated_properties = validated_data["validated_properties"]

            # Create PropertyOwner assignments
            created_assignments = []
            errors = []

            with transaction.atomic():
                for property_info in validated_properties:
                    node = property_info["node"]
                    property_type = property_info["type"]

                    # Check if node is already owned
                    existing_owner = PropertyOwner.objects.filter(
                        node=node, is_deleted=False
                    ).first()

                    if existing_owner:
                        if existing_owner.owner_user == owner:
                            # Already owned by this user, skip
                            continue
                        else:
                            # Owned by different user, add to errors
                            errors.append(
                                f"{property_type} {node.name} is already owned by {existing_owner.owner_user.get_full_name()}"
                            )
                            continue

                    # Create new ownership assignment
                    try:
                        property_owner = PropertyOwner.objects.create(
                            node=node, owner_user=owner, owner_company=None
                        )
                        created_assignments.append(
                            {
                                "id": str(property_owner.id),
                                "node_name": node.name,
                                "node_type": node.node_type,
                                "owner_name": owner.get_full_name(),
                                "property_type": property_type,
                                "node_id": str(
                                    node.id
                                ),  # Include the node ID for reference
                            }
                        )
                    except Exception as e:
                        errors.append(
                            f"Failed to assign {property_type} {node.name}: {str(e)}"
                        )

            # Clear related caches
            # clear_redis_cache(f"project_owners:{url_project_detail_id}:*")
            # clear_redis_cache(f"owner-detail:{owner.id}")
            # clear_redis_cache(f"owner-properties:{owner.id}")
            # clear_redis_cache(f"owner-income-detail:{owner.id}")

            # Prepare response
            success = len(errors) == 0
            response_data = {
                "success": success,
                "created_assignments": len(created_assignments),
                "errors": errors,
                "assignments": created_assignments,
            }

            if success:
                message = f"Successfully assigned {len(created_assignments)} properties to {owner.get_full_name()}"
                return Response(
                    {"error": False, "message": message, "data": response_data},
                    status=status.HTTP_201_CREATED,
                )
            else:
                message = f"Assignment completed with {len(errors)} errors"
                return Response(
                    {"error": True, "message": message, "data": response_data},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except serializers.ValidationError as e:
            return Response(
                {
                    "error": True,
                    "message": "Validation error",
                    "data": {"errors": e.detail},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"An unexpected error occurred: {str(e)}",
                    "data": {"errors": [str(e)]},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(
    tags=["Project Owners"],
    description="Delete property ownership by node ID.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class PropertyOwnershipDeleteView(RetrieveAPIView):
    """
    DELETE: Remove property ownership by node ID.
    Accepts node_id and project_detail_id.
    Deletes PropertyOwner record and returns success response.
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "node_id"

    def get_queryset(self):
        # This view doesn't use queryset for retrieval, but we need it for the base class
        return LocationNode.objects.filter(is_deleted=False)

    def delete(self, request, *args, **kwargs):
        """Handle property ownership deletion"""
        try:
            node_id = kwargs.get("node_id")
            project_detail_id = kwargs.get("project_detail_id")

            # Validate that the node exists and belongs to the project
            from .models import ProjectDetail

            project_detail = get_object_or_404(
                ProjectDetail,
                id=project_detail_id,
                is_deleted=False,
            )

            # Find the node in the project's structure
            node = get_object_or_404(
                LocationNode,
                id=node_id,
                is_deleted=False,
            )

            # Check if node belongs to the project (is a descendant of project node)
            project_node = project_detail.node
            if not node.is_descendant_of(project_node) and node.id != project_node.id:
                return Response(
                    {
                        "error": True,
                        "message": "Node does not belong to the specified project",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Find and delete the PropertyOwner record
            property_owner = PropertyOwner.objects.filter(
                node=node, is_deleted=False
            ).first()

            if not property_owner:
                return Response(
                    {
                        "error": True,
                        "message": "No ownership record found for this property",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Store owner info for response
            owner_name = (
                property_owner.owner_user.get_full_name()
                if property_owner.owner_user
                else (
                    property_owner.owner_company.name
                    if property_owner.owner_company
                    else "Unknown Owner"
                )
            )

            with transaction.atomic():
                # Hard Delete the PropertyOwner record
                property_owner.delete()

            # Clear related caches
            # clear_redis_cache(f"project_owners:{project_detail_id}:*")
            # if property_owner.owner_user:
            #     clear_redis_cache(f"owner-detail:{property_owner.owner_user.id}")
            #     clear_redis_cache(f"owner-properties:{property_owner.owner_user.id}")
            #     clear_redis_cache(f"owner-income-detail:{property_owner.owner_user.id}")

            return Response(
                {
                    "error": False,
                    "message": f"Successfully removed ownership of {node.name} from {owner_name}",
                    "data": {
                        "deleted_ownership": {
                            "node_id": str(node.id),
                            "node_name": node.name,
                            "node_type": node.node_type,
                            "owner_name": owner_name,
                        }
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"An unexpected error occurred: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --- AGENCIES ---


class AgencyOwnerFilters(django_filters.FilterSet):
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    first_name = django_filters.CharFilter(
        field_name="first_name", lookup_expr="icontains"
    )
    last_name = django_filters.CharFilter(
        field_name="last_name", lookup_expr="icontains"
    )
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = Users
        fields = ["email", "first_name", "last_name", "is_active"]


@extend_schema(
    tags=["Agencies"], description="List all agencies (paginated, cached, filterable)."
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class AgencyListView(ListAPIView):
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = AgencyOwnerFilters

    def get_queryset(self):
        return Users.objects.filter(type="agent").select_related("city")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        params = request.query_params.dict()
        params.pop("page", None)
        params.pop("page_size", None)
        filters = json.dumps(params, sort_keys=True)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = serializer.data
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(tags=["Agencies"], description="Create a new agent.")
@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=True),
    name="dispatch",
)
class AgencyCreateView(CreateAPIView):
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            if hasattr(serializer, "errors") and serializer.errors:
                error_list = []
                for field, errors in serializer.errors.items():
                    for err in errors:
                        error_list.append(f"{field}: {str(err)}")
                error_message = "; ".join(error_list) if error_list else str(e)
            else:
                error_message = str(e)
            return Response(
                {"error": True, "message": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check for email duplicates
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        agent = serializer.save(type="agent")
        return Response(
            {
                "error": False,
                "message": "Agency created successfully",
                "data": AgencySerializer(agent).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Agencies"], description="Retrieve an agent by ID (cached).")
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class AgencyRetrieveView(RetrieveAPIView):
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="agent").select_related("city")

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(tags=["Agencies"], description="Update an agent by ID.")
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PUT", block=True),
    name="dispatch",
)
class AgencyUpdateView(UpdateAPIView):
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Users.objects.filter(type="agent").select_related("city")

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Check for email duplicates (excluding current instance)
        email = request.data.get('email')
        if email and email.strip():
            if Users.objects.filter(email=email).exclude(id=instance.id).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        with transaction.atomic():
            agent = serializer.save()
        return Response(
            {
                "error": False,
                "message": "Agency updated successfully",
                "data": AgencySerializer(agent).data,
            },
            status=status.HTTP_200_OK,
        )


class OwnerInvoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None, owner_id=None):
        owner_id = owner_id or pk
        try:
            owner = Users.objects.get(id=owner_id, type="owner", is_deleted=False)
        except Users.DoesNotExist:
            return Response({"error": True, "message": "Owner not found"}, status=404)
        currency = get_serialized_default_currency()
        serializer = OwnerInvoiceSummarySerializer(
            {"owner": owner, "currency": currency}
        )
        return Response({"error": False, "data": serializer.data})


@extend_schema(
    tags=["Clients"],
    description="Bulk upload clients (tenants and owners) from Excel format. Creates multiple clients in one atomic transaction.",
    request=dict,
    responses={201: dict},
)
@method_decorator(
    ratelimit(key="ip", rate="2/m", method="POST", block=True),
    name="dispatch",
)
class BulkClientUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        print("🚀 Backend: BulkClientUploadView.post() called")
        print("🚀 Backend: Request data type:", type(request.data))
        print("🚀 Backend: Request data:", request.data)
        
        # Validate request data
        if not isinstance(request.data, list) or len(request.data) == 0:
            print("❌ Backend: Invalid request data - not a list or empty")
            return Response(
                {
                    "error": True,
                    "message": "At least one client row must be provided.",
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

            required_fields = ["first_name", "last_name", "email", "phone", "gender", "status", "type"]
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

            # Validate type field
            if row["type"] not in ["tenant", "owner"]:
                return Response(
                    {
                        "error": True,
                        "message": f"Row {i + 1}: Type must be either 'tenant' or 'owner'",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate gender field
            if row["gender"] not in ["Male", "Female"]:
                return Response(
                    {
                        "error": True,
                        "message": f"Row {i + 1}: Gender must be either 'Male' or 'Female'",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate status field
            if row["status"] not in ["Active", "Inactive"]:
                return Response(
                    {
                        "error": True,
                        "message": f"Row {i + 1}: Status must be either 'Active' or 'Inactive'",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Process bulk upload with transaction
        results = []
        created_count = 0
        
        print("🚀 Backend: Starting bulk upload processing...")
        
        with transaction.atomic():
            for i, row in enumerate(request.data):
                try:
                    print(f"🚀 Backend: Processing row {i + 1}: {row}")
                    
                    # Check for email duplicates (only active users)
                    email = row.get('email', '').strip()
                    if email and Users.objects.filter(email=email, is_active=True).exists():
                        print(f"❌ Backend: Email '{email}' already exists (active user)")
                        results.append({
                            "row": i + 1,
                            "type": row["type"],
                            "success": False,
                            "error": f"Email '{email}' already exists",
                        })
                        continue
                    
                    # Check if there's an inactive user with this email (for reactivation)
                    existing_inactive_user = None
                    existing_inactive_user = Users.objects.filter(email=email, is_active=False).first()
                    if existing_inactive_user:
                        print(f"🔄 Backend: Reactivating inactive user with email '{email}'")
                        # Reactivate the user and update their data
                        existing_inactive_user.first_name = row["first_name"].strip()
                        existing_inactive_user.last_name = row["last_name"].strip()
                        existing_inactive_user.phone = row["phone"].strip()
                        existing_inactive_user.gender = row["gender"]
                        existing_inactive_user.type = row["type"]
                        existing_inactive_user.is_active = True
                        existing_inactive_user.save()
                        
                        user = existing_inactive_user
                        print(f"✅ Backend: User reactivated successfully: {user.id}")
                    else:
                        # Generate unique username
                        base_username = email.split('@')[0] if email else f"{row['first_name'].strip()}_{row['last_name'].strip()}"
                        username = base_username
                        counter = 1
                        while Users.objects.filter(username=username).exists():
                            username = f"{base_username}_{counter}"
                            counter += 1

                        print(f"🚀 Backend: Generated username: {username}")

                        # Create user based on type
                        user_data = {
                            "username": username,
                            "email": email,
                            "first_name": row["first_name"].strip(),
                            "last_name": row["last_name"].strip(),
                            "phone": row["phone"].strip(),
                            "gender": row["gender"],
                            "type": row["type"],
                            "is_active": row["status"] == "Active",
                        }

                        print(f"🚀 Backend: Creating user with data: {user_data}")
                        
                        # Create the user
                        user = Users.objects.create(**user_data)
                        print(f"✅ Backend: User created successfully: {user.id}")
                    
                    # If it's an owner, create Owner record
                    if row["type"] == "owner":
                        from company.models import Owner
                        # Get current user's company (handle different user types)
                        current_user_company = None
                        try:
                            # Try to get company from owner relationship
                            if hasattr(request.user, 'owner_set'):
                                current_user_company = request.user.owner_set.first().company
                            # Try to get company from tenant relationship
                            elif hasattr(request.user, 'tenant_set'):
                                current_user_company = request.user.tenant_set.first().company
                        except Exception as e:
                            print(f"⚠️ Backend: Could not determine company for owner: {str(e)}")
                        
                        if current_user_company:
                            Owner.objects.create(user=user, company=current_user_company)
                            print(f"✅ Backend: Owner record created for company: {current_user_company.name}")
                        else:
                            print(f"⚠️ Backend: No company found for owner, skipping Owner record creation")

                    # If it's a tenant and has project_name and house_number, create PropertyTenant assignment
                    property_assignment_created = False
                    if (row["type"] == "tenant" and 
                        row.get("project_name") and 
                        row.get("house_number")):
                        
                        try:
                            from properties.models import LocationNode, PropertyTenant, ProjectDetail
                            from properties.models import UnitDetail
                            from datetime import datetime, date
                            
                            # Find project by name (search in LocationNode)
                            project_node = LocationNode.objects.filter(
                                name__iexact=row["project_name"].strip(),
                                node_type="PROJECT",
                                is_deleted=False
                            ).first()
                            
                            project_detail = None
                            if project_node:
                                try:
                                    project_detail = ProjectDetail.objects.get(node=project_node, is_deleted=False)
                                except ProjectDetail.DoesNotExist:
                                    pass
                            
                            if project_node:
                                print(f"✅ Backend: Found project: {project_node.name}")
                                
                                # Find apartment by house number within this project
                                apartment = LocationNode.objects.filter(
                                    name__iexact=row["house_number"].strip(),
                                    node_type="UNIT",
                                    parent__parent__parent=project_node,  # Navigate up the hierarchy
                                    is_deleted=False
                                ).first()
                                
                                if apartment:
                                    print(f"✅ Backend: Found apartment: {apartment.name}")
                                    
                                    # Check if apartment is already assigned
                                    existing_assignment = PropertyTenant.objects.filter(
                                        node=apartment,
                                        is_deleted=False
                                    ).first()
                                    
                                    if not existing_assignment:
                                        # Get default currency
                                        from properties.models import Currencies
                                        default_currency = Currencies.objects.filter(default=True).first()
                                        if not default_currency:
                                            default_currency = Currencies.objects.first()
                                        
                                        if default_currency:
                                            # Create PropertyTenant assignment
                                            property_tenant = PropertyTenant.objects.create(
                                                node=apartment,
                                                tenant_user=user,
                                                contract_start=date.today(),
                                                contract_end=None,  # No end date specified
                                                rent_amount=0,  # Default rent amount
                                                deposit_amount=0,  # Default deposit
                                                currency=default_currency,
                                            )
                                        else:
                                            print(f"❌ Backend: No currency found, skipping property assignment")
                                            continue
                                        
                                        # Update unit status to 'rented'
                                        try:
                                            unit_detail = UnitDetail.objects.get(node=apartment)
                                            unit_detail.status = "rented"
                                            unit_detail.save(update_fields=["status"])
                                            print(f"✅ Backend: Updated unit status to 'rented'")
                                        except UnitDetail.DoesNotExist:
                                            print(f"⚠️ Backend: UnitDetail not found for apartment {apartment.name}")
                                        
                                        property_assignment_created = True
                                        print(f"✅ Backend: PropertyTenant assignment created: {property_tenant.id}")
                                    else:
                                        print(f"⚠️ Backend: Apartment {apartment.name} is already assigned to another tenant")
                                else:
                                    print(f"❌ Backend: Apartment '{row['house_number']}' not found in project '{row['project_name']}'")
                            else:
                                print(f"❌ Backend: Project '{row['project_name']}' not found")
                                
                        except Exception as e:
                            print(f"❌ Backend: Error creating property assignment: {str(e)}")

                    # Determine if user was reactivated or created
                    was_reactivated = existing_inactive_user is not None
                    
                    results.append({
                        "row": i + 1,
                        "type": row["type"],
                        "success": True,
                        "data": {
                            "id": str(user.id),
                            "email": user.email,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "phone": user.phone,
                            "gender": user.gender,
                            "type": user.type,
                            "status": "Active" if user.is_active else "Inactive",
                            "project_name": row.get("project_name", ""),
                            "house_number": row.get("house_number", ""),
                            "property_assigned": property_assignment_created,
                            "was_reactivated": was_reactivated,
                        },
                    })
                    created_count += 1

                except Exception as e:
                    print(f"❌ Backend: Error processing row {i + 1}: {str(e)}")
                    results.append({
                        "row": i + 1,
                        "type": row["type"],
                        "success": False,
                        "error": str(e),
                    })

        print(f"🚀 Backend: Bulk upload completed. Created: {created_count}, Total rows: {len(request.data)}")
        
        return Response(
            {
                "error": False,
                "message": f"Bulk upload completed. {created_count} clients created successfully.",
                "data": {
                    "count": created_count,
                    "total_rows": len(request.data),
                    "results": results,
                },
            },
            status=status.HTTP_201_CREATED,
        )
