from rest_framework import serializers
from decimal import Decimal

from .utils import (
    get_rent_roll_summary_stats,
    get_rent_roll_units_data,
    calculate_unit_status,
    calculate_payment_progress,
    calculate_outstanding_balance,
    get_last_payment_info,
    calculate_next_due_date,
)


class RentRollPropertySerializer(serializers.Serializer):
    """
    Serializer for individual rent roll property data.
    Includes both units and houses with FULL_MANAGEMENT.
    """

    id = serializers.CharField()
    property = serializers.CharField(
        help_text="Property identifier (unit number or house name with unique ID)"
    )
    propertyType = serializers.CharField(help_text="Type of property (UNIT or HOUSE)")
    projectName = serializers.CharField(help_text="Full project hierarchy path")
    invoiceId = serializers.CharField(help_text="Current month invoice ID")
    invoiceNumber = serializers.IntegerField(help_text="Current month invoice number")
    tenantName = serializers.CharField()
    tenantContact = serializers.CharField(allow_blank=True)
    leaseStart = serializers.CharField(allow_blank=True)
    leaseEnd = serializers.CharField(allow_blank=True)
    monthlyRent = serializers.CharField()
    issueDate = serializers.CharField(
        allow_blank=True, help_text="Date when invoice was issued"
    )
    dueDate = serializers.CharField(allow_blank=True)
    nextDueDate = serializers.CharField(allow_blank=True)
    lastPayment = serializers.DictField()
    balance = serializers.CharField()
    status = serializers.CharField()
    paymentProgress = serializers.IntegerField()
    # Balance breakdown components
    rentAmount = serializers.CharField(
        help_text="Rent + Deposit portion of the balance"
    )
    servicesAmount = serializers.CharField(
        help_text="Services + Utilities portion of the balance"
    )
    penaltiesAmount = serializers.CharField(
        help_text="Penalties portion of the balance"
    )
    totalPaid = serializers.CharField(help_text="Total amount paid")


class RentRollSummarySerializer(serializers.Serializer):
    """
    Serializer for rent roll summary statistics.
    Only includes units/houses with FULL_MANAGEMENT service type.
    """

    total_properties = serializers.IntegerField(
        help_text="Total properties (units/houses) under full management"
    )
    occupied_properties = serializers.IntegerField(
        help_text="Occupied properties under full management"
    )
    vacant_properties = serializers.IntegerField(
        help_text="Vacant properties under full management"
    )
    rent_expected = serializers.CharField()
    total_expected = serializers.CharField()
    collected = serializers.CharField()


class RentRollListSerializer(serializers.Serializer):
    """
    Serializer for rent roll list response.
    Includes both units and houses with FULL_MANAGEMENT.
    """

    count = serializers.IntegerField()
    results = RentRollPropertySerializer(many=True)
    summary = RentRollSummarySerializer()


class RentRollFilterSerializer(serializers.Serializer):
    """
    Serializer for rent roll filters.
    """

    status = serializers.ChoiceField(
        choices=["paid", "unpaid", "partial", "late", "vacant"], required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    project_id = serializers.CharField(required=False)
    search = serializers.CharField(required=False)


def serialize_rent_roll_data(company_id: str, filters: dict = None) -> dict:
    """
    Serialize rent roll data for API response.

    Args:
        company_id: Company ID to filter data
        filters: Optional filters

    Returns:
        Serialized rent roll data
    """
    # Get summary statistics with filters applied
    summary_stats = get_rent_roll_summary_stats(company_id, filters)

    # Get units data
    units_data = get_rent_roll_units_data(company_id, filters)

    # Apply filters if provided
    if filters:
        if filters.get("status"):
            units_data = [
                unit for unit in units_data if unit["status"] == filters["status"]
            ]

        if filters.get("search"):
            search_term = filters["search"].lower()
            units_data = [
                unit
                for unit in units_data
                if search_term in unit["property"].lower()
                or search_term in unit["tenantName"].lower()
                or search_term in unit["projectName"].lower()
            ]

    return {"count": len(units_data), "results": units_data, "summary": summary_stats}
