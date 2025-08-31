from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.core.paginator import Paginator

from .table_data_serializer import OwnerPropertyTableSerializer


@extend_schema(
    tags=["OwnerAssignment"],
    description="Get owner property table data for the sales dashboard with pagination and filtering.",
    parameters=[
        {
            "name": "page",
            "in": "query",
            "description": "Page number for pagination (default: 1)",
            "required": False,
            "schema": {"type": "integer", "default": 1},
        },
        {
            "name": "page_size",
            "in": "query",
            "description": "Number of results per page (default: 10, max: 100)",
            "required": False,
            "schema": {"type": "integer", "default": 10},
        },
        {
            "name": "search",
            "in": "query",
            "description": "General search term for owner name, email, or property",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "owner",
            "in": "query",
            "description": "Filter by specific owner name",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "status",
            "in": "query",
            "description": "Filter by payment status (on-track, behind, at-risk, completed)",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "project",
            "in": "query",
            "description": "Filter by project name",
            "required": False,
            "schema": {"type": "string"},
        },
    ],
    responses={
        200: {
            "description": "Table data retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Table data retrieved successfully",
                        "data": {
                            "count": 5,
                            "results": [
                                {
                                    "id": "uuid-string",
                                    "ownerId": "uuid-string",
                                    "ownerName": "John Doe",
                                    "ownerEmail": "john@example.com",
                                    "ownerPhone": "+254700000000",
                                    "projectName": "Sunset Gardens",
                                    "propertyName": "Unit A-101",
                                    "ownershipPercentage": 100.00,
                                    "coOwners": [],
                                    "assignedSalesPerson": {
                                        "name": "Jane Smith",
                                        "employee_id": "SP001",
                                        "email": "jane.smith@company.com",
                                        "phone": "+254700000000",
                                        "is_active": True,
                                        "is_available": True,
                                    },
                                    "status": "on-track",
                                    "installmentPlan": {
                                        "totalAmount": 5000000,
                                        "paidAmount": 1500000,
                                        "remainingAmount": 3500000,
                                        "nextDueDate": "2024-02-01",
                                        "nextDueAmount": 100000,
                                        "totalInstallments": 36,
                                        "completedInstallments": 15,
                                    },
                                    "lastActivity": "2024-01-15",
                                    "paymentHistory": {
                                        "lastPaymentDate": "2024-01-15",
                                        "lastPaymentAmount": 100000,
                                        "missedPayments": 0,
                                    },
                                }
                            ],
                            "pagination": {
                                "current_page": 1,
                                "total_pages": 1,
                                "has_next": False,
                                "has_previous": False,
                                "next_page": None,
                                "previous_page": None,
                            },
                        },
                    }
                }
            },
        }
    },
)
class OwnerPropertyTableView(APIView):
    """
    API view to get owner property table data for the sales dashboard.
    Provides aggregated data from multiple models for the table display.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get owner property table data with pagination and filtering"""
        try:
            # Get query parameters
            page = request.query_params.get("page", 1)
            page_size = request.query_params.get("page_size", 10)
            search = request.query_params.get("search", "")
            owner = request.query_params.get("owner", "")
            status_filter = request.query_params.get("status", "")
            project = request.query_params.get("project", "")

            # Convert to integers
            try:
                page = int(page)
                page_size = int(page_size)
            except (ValueError, TypeError):
                page = 1
                page_size = 10

            # Limit page size
            page_size = min(max(page_size, 1), 100)

            # Prepare filters
            filters = {}
            if search:
                filters["search"] = search
            if owner:
                filters["owner"] = owner
            if status_filter:
                filters["status"] = status_filter
            if project:
                filters["project"] = project

            serializer = OwnerPropertyTableSerializer()
            table_data = serializer.get_table_data(filters)

            # Apply status filter after data is calculated
            if status_filter:
                table_data = [
                    item for item in table_data if item["status"] == status_filter
                ]

            # Paginate the results
            paginator = Paginator(table_data, page_size)
            current_page = paginator.get_page(page)

            # Format the response
            response_data = {
                "success": True,
                "message": "Table data retrieved successfully",
                "data": {
                    "count": paginator.count,
                    "results": current_page.object_list,
                    "pagination": {
                        "current_page": page,
                        "total_pages": paginator.num_pages,
                        "has_next": current_page.has_next(),
                        "has_previous": current_page.has_previous(),
                        "next_page": (
                            current_page.next_page_number()
                            if current_page.has_next()
                            else None
                        ),
                        "previous_page": (
                            current_page.previous_page_number()
                            if current_page.has_previous()
                            else None
                        ),
                    },
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to retrieve table data",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
