from django.db.models import Q
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
import logging

from properties.models import LocationNode
from accounts.models import Users
from sales.models import PaymentPlanTemplate
from utils.custom_pagination import CustomPageNumberPagination
from .search_serializer import (
    ProjectSearchSerializer,
    ProjectStructureSerializer,
    OwnerSearchSerializer,
    PaymentPlanTemplateSerializer,
)

# Set up logging
logger = logging.getLogger(__name__)


@extend_schema(
    tags=["ProjectAssignment"],
    description="Search projects by code, name, or location with pagination.",
    parameters=[
        OpenApiParameter(
            name="q",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Search query string for project name, code, address, or city",
            required=True,
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number for pagination (default: 1)",
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of results per page (default: 10, max: 100)",
            required=False,
        ),
    ],
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class ProjectSearchView(ListAPIView):
    """
    Search projects by code, name, or location with pagination support.
    """

    serializer_class = ProjectSearchSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """
        Get queryset with search filters applied.
        Only return projects that have units/houses for sale.
        """
        search_query = self.request.query_params.get("q", "").strip()

        if not search_query:
            return LocationNode.objects.none()

        # Base queryset for projects
        queryset = LocationNode.objects.filter(
            node_type="PROJECT", is_deleted=False
        ).prefetch_related(
            "project_detail__city",
            "children__children__children__unit_detail",
            "children__children__unit_detail",
        )

        # Apply search filters
        queryset = queryset.filter(
            Q(name__icontains=search_query)
            | Q(project_detail__project_code__icontains=search_query)
        )

        # Filter to include projects that have units OR houses (OR both)
        print(f"DEBUG: Queryset: {queryset.count()}")
        projects_with_sales = []

        for project in queryset:
            has_saleable_properties = False
            project_debug = []

            # Check blocks for units for sale
            blocks = project.children.filter(node_type="BLOCK")
            if blocks.exists():
                for block in blocks:
                    print(f"DEBUG: Block {block.name}")
                    floors = block.children.filter(node_type="FLOOR")
                    for floor in floors:
                        units = floor.children.filter(
                            node_type="UNIT",
                            unit_detail__management_status="for_sale",
                        )
                        print(f"DEBUG: Units: {units.count()} {units.first()}")

                        if units.exists():
                            has_saleable_properties = True
                            project_debug.append(
                                f"Block {block.name} has {units.count()} "
                                f"units for sale"
                            )

            # Check houses - if project has houses, consider it saleable
            houses = project.children.filter(node_type="HOUSE")
            if houses.exists():
                has_saleable_properties = True
                project_debug.append(f"Has {houses.count()} houses")

            if has_saleable_properties:
                projects_with_sales.append(project.id)
                print(f"DEBUG: Project {project.name} - " f"{', '.join(project_debug)}")
            else:
                print(
                    f"DEBUG: Project {project.name} - " f"No saleable properties found"
                )

        print(f"DEBUG: Projects with sales: {len(projects_with_sales)}")
        return queryset.filter(id__in=projects_with_sales)

    def list(self, request, *args, **kwargs):
        """
        Override list method to provide custom response format.
        """
        queryset = self.get_queryset()

        if not queryset.exists():
            return Response(
                {
                    "error": False,
                    "message": "No projects found matching the search criteria",
                    "data": {"count": 0, "results": []},
                },
                status=status.HTTP_200_OK,
            )

        # Use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data

            return Response(
                {
                    "error": False,
                    "message": "Projects found successfully",
                    "data": data,
                },
                status=status.HTTP_200_OK,
            )

        # Fallback for non-paginated response
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "message": "Projects found successfully",
                "data": {"count": queryset.count(), "results": serializer.data},
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["ProjectAssignment"],
    description="Get complete structure of a selected project including blocks, floors, units, and houses.",
    parameters=[
        OpenApiParameter(
            name="include_inactive",
            type=bool,
            location=OpenApiParameter.QUERY,
            description="Include inactive/occupied units (default: false)",
            required=False,
        ),
    ],
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class ProjectStructureView(RetrieveAPIView):
    """
    Get complete structure of a selected project including blocks, floors, units, and houses.
    """

    serializer_class = ProjectStructureSerializer
    lookup_field = "pk"

    def get_queryset(self):
        """
        Get queryset for project structure with prefetch optimization.
        Only include projects that have blocks with units for sale.
        """
        return LocationNode.objects.filter(
            node_type="PROJECT", is_deleted=False
        ).prefetch_related(
            "project_detail__city",
            "children__block_detail",
            "children__villa_detail",
            "children__children__floor_detail",
            "children__children__children__unit_detail",
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to provide custom response format and filtering.
        """
        try:
            # Get query parameters
            include_inactive = (
                request.query_params.get("include_inactive", "false").lower() == "true"
            )

            # Get the project instance
            instance = self.get_object()

            # Log project details for debugging
            logger.info(
                f"Retrieving structure for project: {instance.id} - {instance.name}"
            )
            logger.info(f"Project has {instance.children.count()} direct children")

            # Check if project has project_detail
            try:
                if hasattr(instance, "project_detail") and instance.project_detail:
                    logger.info(
                        f"Project detail found: {instance.project_detail.project_code}"
                    )
                else:
                    logger.info("No project detail found")
            except Exception as e:
                logger.warning(f"Error accessing project detail: {e}")

            # Filter units and houses based on include_inactive parameter and sales criteria
            if not include_inactive:
                # For blocks, we'll filter during serialization
                # For houses, we'll check if they exist and have villa_detail
                logger.info("Filtering inactive units and houses...")

                # Log what we found
                blocks = instance.children.filter(node_type="BLOCK")
                houses = instance.children.filter(node_type="HOUSE")

                logger.info(
                    f"Found {blocks.count()} blocks and {houses.count()} houses"
                )

                for block in blocks:
                    logger.info(
                        f"Block {block.name} has {block.children.count()} floors"
                    )
                    for floor in block.children.filter(node_type="FLOOR"):
                        units = floor.children.filter(node_type="UNIT")
                        available_units = units.filter(
                            unit_detail__status__in=["available"],
                            unit_detail__management_status="for_sale",
                            unit_detail__sale_price__isnull=False,
                        ).exclude(unit_detail__sale_price=0)
                        logger.info(
                            f"Floor {floor.name} has {units.count()} total units, "
                            f"{available_units.count()} available for sale"
                        )

                for house in houses:
                    logger.info(
                        f"House {house.name} has {house.children.count()} children"
                    )
                    if hasattr(house, "villa_detail") and house.villa_detail:
                        logger.info(f"House {house.name} has villa_detail")
                    else:
                        logger.info(f"House {house.name} has no villa_detail")

            # Serialize the project structure
            serializer = self.get_serializer(instance)

            return Response(
                {
                    "error": False,
                    "message": "Project structure retrieved successfully",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(
                f"Error in ProjectStructureView.retrieve: {str(e)}", exc_info=True
            )
            return Response(
                {"error": True, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


#########################################
# Owner Search Views
#########################################


@extend_schema(
    tags=["UserAssignment"],
    description="Search users (owners, agents, or staff) by name, email, or phone with pagination.",
    parameters=[
        OpenApiParameter(
            name="q",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Search query string for user name, email, or phone",
            required=True,
        ),
        OpenApiParameter(
            name="type",
            type=str,
            location=OpenApiParameter.QUERY,
            description="User type to search for: 'owner', 'agent', or 'staff' (default: 'owner')",
            required=False,
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number for pagination (default: 1)",
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of results per page (default: 10, max: 100)",
            required=False,
        ),
    ],
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class OwnerSearchView(ListAPIView):
    """
    Search users (owners or agents) by name, email, or phone with pagination support.
    """

    serializer_class = OwnerSearchSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """
        Get queryset with search filters applied.
        """
        search_query = self.request.query_params.get("q", "").strip()
        user_type = self.request.query_params.get("type", "owner").lower()

        if not search_query:
            return Users.objects.none()

        # Base queryset for users (owners, agents, or staff)
        queryset = Users.objects.filter(
            type=user_type, is_deleted=False, is_active=True
        )

        # Optimize queries based on user type
        if user_type == "staff":
            # For staff, prefetch sales person profile and position
            queryset = queryset.prefetch_related(
                "city", "position", "sales_person_profile"
            )
        else:
            # For owners and agents, just prefetch city
            queryset = queryset.prefetch_related("city")

        # Apply search filters
        queryset = queryset.filter(
            Q(first_name__icontains=search_query)
            | Q(last_name__icontains=search_query)
            | Q(email__icontains=search_query)
            | Q(phone__icontains=search_query)
        )

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to provide custom response format.
        """
        queryset = self.get_queryset()
        user_type = self.request.query_params.get("type", "owner").lower()

        if not queryset.exists():
            return Response(
                {
                    "error": False,
                    "message": f"No {user_type}s found matching the search criteria",
                    "data": {"count": 0, "results": []},
                },
                status=status.HTTP_200_OK,
            )

        # Use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data

            return Response(
                {
                    "error": False,
                    "message": f"{user_type.capitalize()}s found successfully",
                    "data": data,
                },
                status=status.HTTP_200_OK,
            )

        # Fallback for non-paginated response
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "message": f"{user_type.capitalize()}s found successfully",
                "data": {"count": queryset.count(), "results": serializer.data},
            },
            status=status.HTTP_200_OK,
        )


#########################################
# Payment Plan Template Views
#########################################


@extend_schema(
    tags=["PaymentPlanTemplates"],
    description="Get payment plan templates for the wizard with optional filtering.",
    parameters=[
        OpenApiParameter(
            name="category",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Filter by template category (standard, extended, quarterly, etc.)",
            required=False,
        ),
        OpenApiParameter(
            name="property_price",
            type=float,
            location=OpenApiParameter.QUERY,
            description="Filter templates by property price range",
            required=False,
        ),
        OpenApiParameter(
            name="featured",
            type=bool,
            location=OpenApiParameter.QUERY,
            description="Get only featured templates (default: false)",
            required=False,
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Page number for pagination (default: 1)",
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of results per page (default: 10, max: 100)",
            required=False,
        ),
    ],
)
@method_decorator(
    ratelimit(key="ip", rate="30/m", method="GET", block=True), name="dispatch"
)
class PaymentPlanTemplateView(ListAPIView):
    """
    Get payment plan templates for the wizard with optional filtering.
    """

    serializer_class = PaymentPlanTemplateSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        """
        Get queryset with filters applied.
        """
        category = self.request.query_params.get("category", "").strip()
        property_price = self.request.query_params.get("property_price")
        featured = self.request.query_params.get("featured", "false").lower() == "true"

        # Base queryset for active templates
        queryset = PaymentPlanTemplate.objects.filter(is_active=True)

        # Apply category filter
        if category:
            queryset = queryset.filter(category=category)

        # Apply featured filter
        if featured:
            queryset = queryset.filter(is_featured=True)

        # Apply property price filter
        if property_price:
            try:
                property_price = float(property_price)
                queryset = queryset.filter(
                    Q(min_property_value__isnull=True)
                    | Q(min_property_value__lte=property_price),
                    Q(max_property_value__isnull=True)
                    | Q(max_property_value__gte=property_price),
                )
            except (ValueError, TypeError):
                # If property_price is invalid, ignore the filter
                pass

        return queryset.order_by("sort_order", "category", "name")

    def list(self, request, *args, **kwargs):
        """
        Override list method to provide custom response format.
        """
        queryset = self.get_queryset()

        if not queryset.exists():
            return Response(
                {
                    "error": False,
                    "message": "No payment plan templates found",
                    "data": {"count": 0, "results": []},
                },
                status=status.HTTP_200_OK,
            )

        # Use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data

            return Response(
                {
                    "error": False,
                    "message": "Payment plan templates retrieved successfully",
                    "data": data,
                },
                status=status.HTTP_200_OK,
            )

        # Fallback for non-paginated response
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "error": False,
                "message": "Payment plan templates retrieved successfully",
                "data": {"count": queryset.count(), "results": serializer.data},
            },
            status=status.HTTP_200_OK,
        )
