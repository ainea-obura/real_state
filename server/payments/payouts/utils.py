from typing import List
from properties.models import (
    LocationNode,
    PropertyOwner,
    PropertyTenant,
    UnitDetail,
    VillaDetail,
)
from accounts.models import Users
from django.db.models import Q
import datetime
from payments.models import Invoice, Receipt, InvoiceItem
from django.db.models import Sum
from properties.models import PropertyService, Service
from payments.models import Payout


def get_full_management_properties_for_owner(owner: Users) -> List[LocationNode]:
    """
    Returns all units/houses with FULL_MANAGEMENT mode owned by the owner, including those owned via PROJECT.
    """
    property_owners = PropertyOwner.objects.filter(owner_user=owner)
    result_nodes = set()
    for po in property_owners:
        node = po.node
        if node.node_type == "PROJECT":
            # Get all descendant units and houses
            descendants = node.get_descendants().filter(node_type__in=["UNIT", "HOUSE"])
            for child in descendants:
                if child.node_type == "UNIT":
                    try:
                        if child.unit_detail.management_mode == "FULL_MANAGEMENT":
                            result_nodes.add(child)
                    except UnitDetail.DoesNotExist:
                        continue
                elif child.node_type == "HOUSE":
                    try:
                        if child.villa_detail.management_mode == "FULL_MANAGEMENT":
                            result_nodes.add(child)
                    except VillaDetail.DoesNotExist:
                        continue
        elif node.node_type == "UNIT":
            try:
                if node.unit_detail.management_mode == "FULL_MANAGEMENT":
                    result_nodes.add(node)
            except UnitDetail.DoesNotExist:
                continue
        elif node.node_type == "HOUSE":
            try:
                if node.villa_detail.management_mode == "FULL_MANAGEMENT":
                    result_nodes.add(node)
            except VillaDetail.DoesNotExist:
                continue
    return list(result_nodes)


def get_tenants_for_property(
    property_node: LocationNode, period_start: datetime.date, period_end: datetime.date
) -> List[PropertyTenant]:
    """
    Returns all tenants who resided in the property during the given period.
    """
    # A tenant is considered active if their contract overlaps with the period
    tenants = PropertyTenant.objects.filter(
        node=property_node,
        contract_start__lte=period_end,
        contract_end__gte=period_start,
    )
    return list(tenants)


def get_expected_rent_for_property(
    property_node: LocationNode, period_start: datetime.date, period_end: datetime.date
) -> float:
    """
    Returns the expected rent for the property in the given period (sum of rent_amount from PropertyTenant contracts active in the period).
    """
    tenants = PropertyTenant.objects.filter(
        node=property_node,
        contract_start__lte=period_end,
        contract_end__gte=period_start,
    )
    total = tenants.aggregate(total=Sum("rent_amount"))["total"] or 0
    return float(total)


def get_issued_rent_invoices_for_property(
    property_node: LocationNode, month: int, year: int
) -> float:
    """
    Returns the total rent amount issued to tenants for the property in the given month/year (sum of InvoiceItem.price where type='RENT').
    """
    invoices = Invoice.objects.filter(
        property=property_node,
        issue_date__year=year,
        issue_date__month=month,
        status__in=["ISSUED", "PAID", "PARTIAL", "OVERDUE"],
    )
    rent_items = InvoiceItem.objects.filter(invoice__in=invoices, type="RENT")
    total = rent_items.aggregate(total=Sum("price"))["total"] or 0
    return float(total)


def get_collected_rent_for_property(
    property_node: LocationNode, month: int, year: int
) -> float:
    """
    Returns the total rent collected for the property in the given month/year.
    Only the payment amount corresponding to rent items is counted; payments for other invoice items are discarded.
    If receipts are not itemized, allocates only the rent portion proportionally.
    """
    invoices = Invoice.objects.filter(
        property=property_node,
        issue_date__year=year,
        issue_date__month=month,
        status__in=["ISSUED", "PAID", "PARTIAL", "OVERDUE"],
    )
    total_collected = 0.0
    for invoice in invoices:
        rent_items = invoice.items.filter(type="RENT")
        rent_total = rent_items.aggregate(total=Sum("price"))["total"] or 0
        if rent_total == 0:
            continue
        invoice_total = invoice.items.aggregate(total=Sum("price"))["total"] or 0
        if invoice_total == 0:
            continue
        receipts = invoice.receipts.all()
        receipts_total = receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
        # Only count the portion of receipts that applies to rent items
        rent_collected = receipts_total * (rent_total / invoice_total)
        total_collected += float(rent_collected)
    return float(total_collected)


def get_property_service_charge(property_node: LocationNode) -> float:
    """
    Returns the service charge amount for the property from unit/house detail.
    """
    try:
        if property_node.node_type == "UNIT":
            return float(property_node.unit_detail.service_charge or 0)
        elif property_node.node_type == "HOUSE":
            return float(property_node.villa_detail.service_charge or 0)
    except (UnitDetail.DoesNotExist, VillaDetail.DoesNotExist):
        pass
    return 0.0


def get_owner_invoices_with_service_charge(
    property_node: LocationNode, month: int, year: int
) -> List[Invoice]:
    """
    Returns invoices issued to owners for the property in the given month/year that contain SERVICE_CHARGE items.
    (Updated: No longer filters by unpaid status; checks for any matching invoice.)
    """
    # Get invoices issued to owners for this property in the given month
    owner_invoices = Invoice.objects.filter(
        property=property_node,
        issue_date__year=year,
        issue_date__month=month,
    ).filter(
        owners__isnull=False
    )  # Has owners (issued to owners)

    # Filter invoices that have SERVICE_CHARGE items
    service_charge_invoices = []
    for invoice in owner_invoices:
        service_charge_items = invoice.items.filter(type="SERVICE_CHARGE")
        if service_charge_items.exists():
            service_charge_invoices.append(invoice)

    return service_charge_invoices


def get_conditional_service_charge(
    property_node: LocationNode, month: int, year: int
) -> float:
    """
    Returns the service charge amount only if there are NO owner invoices with SERVICE_CHARGE items for the month.
    If invoices exist, returns 0 and suggests adding a note about the invoice.
    (Updated: Removed rent_collected check; now independent of rent.)
    """
    invoices = get_owner_invoices_with_service_charge(property_node, month, year)

    if invoices:
        # If there are owner invoices with SERVICE_CHARGE items, exclude service charge
        return 0.0  # Return 0, and handle note elsewhere (e.g., in tasks.py)
    else:
        # No invoices → return the property's service charge
        return get_property_service_charge(property_node)


def get_owner_uncollected_rent(owner: Users, month: int, year: int) -> float:
    """
    Returns the total uncollected rent for all properties managed by the owner for the given month/year.
    Uncollected = expected rent - collected rent (for each property)
    """
    properties = get_full_management_properties_for_owner(owner)
    total_uncollected = 0.0
    for property_node in properties:
        # Calculate period start and end
        period_start = datetime.date(year, month, 1)
        if month == 12:
            period_end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            period_end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
        expected = get_expected_rent_for_property(
            property_node, period_start, period_end
        )
        collected = get_collected_rent_for_property(property_node, month, year)
        uncollected = max(expected - collected, 0)
        total_uncollected += uncollected
    return round(total_uncollected, 2)


def calculate_owner_payout(owner, property_node, month, year):
    """
    Calculate and update/create the payout for the given owner, property_node, month, and year.
    Updated logic:
    - Get rent collected
    - Get conditional service charge (only if unpaid owner invoices with SERVICE_CHARGE items exist AND rent is collected)
    - Calculate balance as: rent collected - conditional service charge
    """
    # Get rent collected
    rent_collected = get_collected_rent_for_property(property_node, month, year)

    # Get conditional service charge
    service_charge = get_conditional_service_charge(property_node, month, year)

    # Calculate balance
    balance = rent_collected - service_charge

    payout, created = Payout.objects.update_or_create(
        owner=owner,
        property_node=property_node,
        month=month,
        year=year,
        defaults={
            "rent_collected": rent_collected,
            "services_expenses": 0,  # No longer used
            "management_fee": service_charge,  # Now stores conditional service charge
            "net_amount": balance,
            "status": "pending",
            "payout_date": None,
        },
    )
    return payout
