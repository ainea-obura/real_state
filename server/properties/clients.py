import json
import secrets
import string

import django_filters

from django.contrib.auth.hashers import make_password
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
from utils.email_utils import send_welcome_email
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


def generate_secure_password(length=12):
    """
    Generate a secure random password with letters, digits, and symbols.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for i in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%^&*" for c in password)
        ):
            return password


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
        return Users.objects.filter(type="tenant").select_related("city")

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
        email = request.data.get("email")
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                )

        tenant = serializer.save(type="tenant", is_verified=True)

        # Send welcome email with credentials if email is provided
        email = request.data.get("email")
        if email and email.strip():
            plain_password = generate_secure_password()
            tenant.password = make_password(plain_password)
            tenant.force_password_change = True
            tenant.username = email
            tenant.save()

            # Send welcome email
            send_welcome_email(
                recipient_email=tenant.email,
                user_name=tenant.username,
                user_password=plain_password,
                verification_url="https://hoyhub.net",
            )

            # Log credentials for admin reference
            print(f"Tenant login credentials for {tenant.email}:")
            print(f"Email: {tenant.email}")
            print(f"Password: {plain_password}")

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
        return Users.objects.filter(type="tenant").select_related("city")

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
        return Users.objects.filter(type="tenant").select_related("city")

    def put(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Check for email duplicates (excluding current instance)
        email = request.data.get("email")
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

            # Send welcome email with credentials if email was added/changed and user has no password
            email = request.data.get("email")
            if (
                email
                and email.strip()
                and email != tenant.email  # Email is different from current
                and not tenant.password
            ):
                plain_password = generate_secure_password()
                tenant.password = make_password(plain_password)
                tenant.force_password_change = True
                tenant.is_verified = True
                tenant.username = email
                tenant.save()

                # Send welcome email
                send_welcome_email(
                    recipient_email=tenant.email,
                    user_name=tenant.username,
                    user_password=plain_password,
                    verification_url="https://hoyhub.net",
                )

                # Log credentials for admin reference
                print(f"Tenant login credentials for {tenant.email}:")
                print(f"Email: {tenant.email}")
                print(f"Password: {plain_password}")

        return Response(
            {
                "error": False,
                "message": "Tenant updated successfully",
                "data": TenantSerializer(tenant).data,
            },
            status=status.HTTP_200_OK,
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
        email = request.data.get("email")
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                )

        with transaction.atomic():
            owner = serializer.save(type="owner", is_verified=True)

            # Send welcome email with credentials if email is provided
            email = request.data.get("email")
            if email and email.strip():
                plain_password = generate_secure_password()
                owner.password = make_password(plain_password)
                owner.force_password_change = True
                owner.username = email
                owner.save()

                # Send welcome email
                send_welcome_email(
                    recipient_email=owner.email,
                    user_name=owner.username,
                    user_password=plain_password,
                    verification_url="https://hoyhub.net",
                )

                # Log credentials for admin reference
                print(f"Owner login credentials for {owner.email}:")
                print(f"Email: {owner.email}")
                print(f"Password: {plain_password}")

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
        email = request.data.get("email")
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

            # Send welcome email with credentials if email was added/changed and user has no password
            email = request.data.get("email")
            if (
                email
                and email.strip()
                and email != owner.email  # Email is different from current
                and not owner.has_usable_password()
            ):
                plain_password = generate_secure_password()
                owner.password = make_password(plain_password)
                owner.force_password_change = True
                owner.is_verified = True
                owner.username = email
                owner.save()

                # Send welcome email
                send_welcome_email(
                    recipient_email=owner.email,
                    user_name=owner.username,
                    user_password=plain_password,
                    verification_url="https://hoyhub.net",
                )

                # Log credentials for admin reference
                print(f"Owner login credentials for {owner.email}:")
                print(f"Email: {owner.email}")
                print(f"Password: {plain_password}")

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
        email = request.data.get("email")
        if email and email.strip():
            if Users.objects.filter(email=email).exists():
                return Response(
                    {
                        "error": True,
                        "message": "Email already exists",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        agent = serializer.save(type="agent", is_verified=True)

        # Send welcome email with credentials if email is provided
        email = request.data.get("email")
        if email and email.strip():
            plain_password = generate_secure_password()
            agent.password = make_password(plain_password)
            agent.force_password_change = True
            agent.username = email
            agent.save()

            # Send welcome email
            send_welcome_email(
                recipient_email=agent.email,
                user_name=agent.username,
                user_password=plain_password,
                verification_url="https://hoyhub.net",
            )

            # Log credentials for admin reference
            print(f"Agent login credentials for {agent.email}:")
            print(f"Email: {agent.email}")
            print(f"Password: {plain_password}")

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
        email = request.data.get("email")
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

            # Send welcome email with credentials if email was added/changed and user has no password
            email = request.data.get("email")
            if (
                email
                and email.strip()
                and email != agent.email  # Email is different from current
                and not agent.has_usable_password()
            ):
                plain_password = generate_secure_password()
                agent.password = make_password(plain_password)
                agent.force_password_change = True
                agent.is_verified = True
                agent.username = email
                agent.save()

                # Send welcome email
                send_welcome_email(
                    recipient_email=agent.email,
                    user_name=agent.username,
                    user_password=plain_password,
                    verification_url="https://hoyhub.net",
                )

                # Log credentials for admin reference
                print(f"Agent login credentials for {agent.email}:")
                print(f"Email: {agent.email}")
                print(f"Password: {plain_password}")

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
