from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from company.models import Owner

from .serializers import (
    RentRollListSerializer,
    RentRollSummarySerializer,
    RentRollFilterSerializer,
    serialize_rent_roll_data,
)
from .utils import (
    get_rent_roll_summary_stats,
    get_rent_roll_units_data,
    get_unit_ledger_data,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rent_roll_list(request):
    """
    Get rent roll data with optional filtering.

    Query Parameters:
    - status: Filter by unit status (paid, unpaid, partial, late, vacant)
    - date_from: Filter by start date
    - date_to: Filter by end date
    - project_id: Filter by project
    - search: Search in unit name or tenant name
    - page: Page number for pagination
    - page_size: Number of items per page
    """
    try:
        # Get company ID from user (assuming user is associated with a company)
        # This would need to be implemented based on your authentication system
        company_id = Owner.objects.get(user=request.user).company.id

        if not company_id:
            return Response(
                {"error": True, "message": "Company not found for user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate and parse filters
        filter_serializer = RentRollFilterSerializer(data=request.query_params)
        if filter_serializer.is_valid():
            filters = filter_serializer.validated_data
        else:
            filters = {}

        # Get pagination parameters
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))

        # Get rent roll data
        rent_roll_data = serialize_rent_roll_data(company_id, filters)

        # Add debug information
        print(f"Rent roll data count: {rent_roll_data['count']}")
        print(
            f"First property: {rent_roll_data['results'][0] if rent_roll_data['results'] else 'No properties'}"
        )

        # Apply pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_results = rent_roll_data["results"][start_index:end_index]

        # Prepare response
        response_data = {
            "count": rent_roll_data["count"],
            "results": paginated_results,
            "summary": rent_roll_data["summary"],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_pages": (rent_roll_data["count"] + page_size - 1) // page_size,
            },
        }

        # Validate response with serializer
        serializer = RentRollListSerializer(data=response_data)
        if serializer.is_valid():
            return Response({"error": False, "data": serializer.data})
        else:
            print(f"Validation errors: {serializer.errors}")
            return Response(
                {
                    "error": True,
                    "message": "Data validation failed",
                    "details": serializer.errors,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Exception as e:
        return Response(
            {"error": True, "message": f"Failed to fetch rent roll data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rent_roll_summary(request):
    """
    Get rent roll summary statistics only.
    Only includes units/houses with FULL_MANAGEMENT service type.

    Query Parameters:
    - date_from: Filter by start date (YYYY-MM-DD)
    - date_to: Filter by end date (YYYY-MM-DD)
    """
    try:
        # Get company ID from user
        company_id = Owner.objects.get(user=request.user).company.id

        if not company_id:
            return Response(
                {"error": True, "message": "Company not found for user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate and parse filters
        filter_serializer = RentRollFilterSerializer(data=request.query_params)
        if filter_serializer.is_valid():
            filters = filter_serializer.validated_data
        else:
            filters = {}

        # Get summary statistics with filters
        summary_stats = get_rent_roll_summary_stats(company_id, filters)

        # Add debug information
        print(f"Summary stats calculated: {summary_stats}")

        # Validate response with serializer
        serializer = RentRollSummarySerializer(data=summary_stats)
        if serializer.is_valid():
            return Response(
                {"error": False, "data": {"count": 1, "results": [serializer.data]}}
            )
        else:
            return Response(
                {
                    "error": True,
                    "message": "Summary data validation failed",
                    "details": serializer.errors,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Exception as e:
        print(f"Error in rent_roll_summary: {str(e)}")
        return Response(
            {"error": True, "message": f"Failed to fetch summary data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rent_roll_unit_detail(request, unit_id):
    """
    Get detailed information for a specific unit.
    """
    try:
        # Get company ID from user
        company_id = (
            request.user.company.id if hasattr(request.user, "company") else None
        )

        if not company_id:
            return Response(
                {"error": True, "message": "Company not found for user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get units data and find the specific unit
        units_data = get_rent_roll_units_data(company_id)
        unit_data = next((unit for unit in units_data if unit["id"] == unit_id), None)

        if not unit_data:
            return Response(
                {"error": True, "message": "Unit not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate response with serializer
        serializer = RentRollUnitSerializer(data=unit_data)
        if serializer.is_valid():
            return Response(serializer.data)
        else:
            return Response(
                {
                    "error": True,
                    "message": "Unit data validation failed",
                    "details": serializer.errors,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Exception as e:
        return Response(
            {"error": True, "message": f"Failed to fetch unit data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unit_ledger(request, unit_id):
    """
    Get ledger transactions for a specific unit.

    Args:
        unit_id: UUID of the unit to get ledger for

    Returns:
        List of ledger transactions with running balance
    """
    try:
        # Get company ID from user
        company_id = Owner.objects.get(user=request.user).company.id

        if not company_id:
            return Response(
                {"error": True, "message": "Company not found for user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get ledger data for the unit
        ledger_data = get_unit_ledger_data(company_id, unit_id)

        return Response(
            {
                "error": False,
                "data": {"count": len(ledger_data), "results": ledger_data},
            }
        )

    except Exception as e:
        return Response(
            {"error": True, "message": f"Failed to fetch ledger data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
