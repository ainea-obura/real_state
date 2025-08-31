import math
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .installments_table_serializer import InstallmentTableSerializer
from utils.custom_pagination import CustomPageNumberPagination


@extend_schema(
    tags=["InstallmentsTable"],
    description="Get all installments for a specific property sale item in table format with pagination and filtering.",
    parameters=[
        {
            "name": "sale_item_id",
            "in": "path",
            "description": "UUID of the property sale item (PropertySaleItem) to get installments for",
            "required": True,
            "schema": {"type": "string", "format": "uuid"},
        },
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
            "name": "status",
            "in": "query",
            "description": "Filter by payment status (pending, paid, overdue, cancelled)",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "owner",
            "in": "query",
            "description": "Filter by owner name",
            "required": False,
            "schema": {"type": "string"},
        },
        {
            "name": "property",
            "in": "query",
            "description": "Filter by property name",
            "required": False,
            "schema": {"type": "string"},
        },
    ],
    responses={
        200: {
            "description": "Installments data retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Installments data retrieved successfully",
                        "data": {
                            "count": 3,
                            "results": [
                                {
                                    "id": "uuid-string",
                                    "payment_number": 1,
                                    "ownerId": "uuid-string",
                                    "ownerName": "John Doe",
                                    "ownerEmail": "john@example.com",
                                    "ownerPhone": "+254700000000",
                                    "projectName": "Sunset Gardens",
                                    "propertyName": "Unit A-101",
                                    "ownershipPercentage": 100.00,
                                    "dueDate": "2024-01-01",
                                    "amount": 100000,
                                    "status": "paid",
                                    "paidDate": "2024-01-01",
                                    "paidAmount": 100000,
                                    "lateFee": 0,
                                    "daysOverdue": 0,
                                    "notes": "First installment",
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
        },
        404: {
            "description": "Sale not found",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "Sale not found",
                        "error": "Sale with ID uuid-string does not exist",
                    }
                }
            },
        },
    },
)
class InstallmentsTableView(APIView):
    """
    API view to get all installments for a specific property sale item in table format.
    Provides detailed installment information with pagination and filtering.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get(self, request, sale_item_id):
        """Get installments data for a specific sale item with pagination and filtering"""
        try:
            # Get query parameters
            page = request.query_params.get("page", 1)
            page_size = request.query_params.get("page_size", 10)
            status_filter = request.query_params.get("status", "")
            owner = request.query_params.get("owner", "")
            property_filter = request.query_params.get("property", "")

            # Convert to integers
            try:
                page = int(page)
                page_size = int(page_size)
            except (ValueError, TypeError):
                page = 1
                page_size = 10

            # Limit page size (but allow larger sizes for summary requests)
            if page_size > 10000:  # If requesting summary data
                page_size = 10000
            else:
                page_size = min(max(page_size, 1), 100)

            # Get installments data with pagination
            serializer = InstallmentTableSerializer()
            installments_data, total_count = serializer.get_installments_data(
                sale_item_id, page, page_size
            )

            if not installments_data and total_count == 0:
                return Response(
                    {
                        "success": False,
                        "message": "Sale item not found or no installments available",
                        "error": f"Sale item with ID {sale_item_id} does not exist or has no installments",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Apply filters to the paginated data
            filtered_data = self._apply_filters(
                installments_data, status_filter, owner, property_filter
            )

            # Format the response
            response_data = {
                "success": True,
                "message": "Installments data retrieved successfully",
                "data": {
                    "count": total_count,
                    "results": filtered_data,
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to retrieve installments data",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_count(self, request, sale_item_id):
        """Get just the count of installments for a specific sale item"""
        try:
            serializer = InstallmentTableSerializer()
            total_count = serializer.get_installments_count(sale_item_id)

            return Response(
                {
                    "success": True,
                    "message": "Installments count retrieved successfully",
                    "data": {"count": total_count},
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to retrieve installments count",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _apply_filters(self, data, status_filter, owner, property_filter):
        """Apply filters to the installments data"""
        filtered_data = data

        # Filter by status
        if status_filter:
            filtered_data = [
                item for item in filtered_data if item["status"] == status_filter
            ]

        # Filter by owner name
        if owner:
            filtered_data = [
                item
                for item in filtered_data
                if owner.lower() in item["ownerName"].lower()
            ]

        # Filter by property name
        if property_filter:
            filtered_data = [
                item
                for item in filtered_data
                if property_filter.lower() in item["propertyName"].lower()
            ]

        return filtered_data
