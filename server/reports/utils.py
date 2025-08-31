from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime
from decimal import Decimal
from collections import defaultdict
import re

from payments.models import Receipt, Payout, Expense, Invoice, InvoiceItem
from properties.models import (
    PropertyService,
    LocationNode,
    PropertyOwner,
    Service,
    PropertyTenant,
    ProjectDetail,
    UnitDetail,
    VillaDetail,
)
from utils.format import format_money_with_currency


def parse_date_param(date_str):
    """Parse date string parameter to datetime object"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def calculate_tenant_service_payments(date_from=None, date_to=None):
    """
    Calculate tenant payments for services only (excluding rent, deposits, penalties)
    """
    # Base queryset for receipts
    receipts = Receipt.objects.all()

    # Apply date filters
    if date_from:
        receipts = receipts.filter(created_at__date__gte=date_from)
    if date_to:
        receipts = receipts.filter(created_at__date__lte=date_to)

    total_service_payments = 0

    for receipt in receipts:
        invoice = receipt.invoice
        if not invoice:
            continue

        # Get all service items from this invoice
        service_items = InvoiceItem.objects.filter(
            invoice=invoice, service__isnull=False  # Only items linked to services
        )

        if not service_items.exists():
            continue

        # Calculate total service amount in this invoice
        total_service_amount = service_items.aggregate(total=Sum("price"))["total"] or 0

        # Calculate total invoice amount
        total_invoice_amount = invoice.total_amount

        if total_invoice_amount > 0:
            # Calculate proportion of receipt that goes to services
            service_proportion = total_service_amount / total_invoice_amount
            service_payment = receipt.paid_amount * service_proportion
            total_service_payments += service_payment

    return total_service_payments


def calculate_owner_service_charges(date_from=None, date_to=None):
    """
    Calculate owner service charges from completed payouts
    """
    payouts = Payout.objects.filter(status="completed")

    # Apply date filters
    if date_from:
        payouts = payouts.filter(created_at__date__gte=date_from)
    if date_to:
        payouts = payouts.filter(created_at__date__lte=date_to)

    total_service_charges = (
        payouts.aggregate(total=Sum("services_expenses"))["total"] or 0
    )

    return total_service_charges


def calculate_total_collections(date_from=None, date_to=None):
    """
    Calculate total collections: tenant service payments + owner service charges
    """
    tenant_payments = calculate_tenant_service_payments(date_from, date_to)
    owner_charges = calculate_owner_service_charges(date_from, date_to)

    total_collections = tenant_payments + owner_charges
    return total_collections


def calculate_service_expenses(date_from=None, date_to=None):
    """
    Calculate total expenses for services only
    """
    expenses = Expense.objects.filter(
        status="paid", service__isnull=False  # Only expenses linked to services
    )

    # Apply date filters
    if date_from:
        expenses = expenses.filter(created_at__date__gte=date_from)
    if date_to:
        expenses = expenses.filter(created_at__date__lte=date_to)

    total_expenses = expenses.aggregate(total=Sum("total_amount"))["total"] or 0

    return total_expenses


def calculate_financial_summary(date_from=None, date_to=None):
    """
    Calculate complete financial summary for EnhancedSummaryCards
    """
    # Calculate collections
    total_collections = calculate_total_collections(date_from, date_to)

    # Calculate expenditures
    total_expenditures = calculate_service_expenses(date_from, date_to)

    # Calculate balance
    balance = total_collections - total_expenditures

    return {
        "totalIncome": format_money_with_currency(total_collections),
        "totalExpenses": format_money_with_currency(total_expenditures),
        "netProfit": format_money_with_currency(balance),
    }


def get_date_range_from_request(request):
    """
    Extract date range from request query parameters
    """
    date_from = request.query_params.get("from_date")
    date_to = request.query_params.get("to_date")

    # Parse dates
    parsed_date_from = parse_date_param(date_from)
    parsed_date_to = parse_date_param(date_to)

    return parsed_date_from, parsed_date_to


def calculate_project_total_collections(project, date_from=None, date_to=None):
    """
    Calculate total collections for a project from service invoices
    """
    # Get all owners for this project (including owners of units, houses, and the project itself)
    all_project_nodes = project.get_descendants(include_self=True)
    all_owners = PropertyOwner.objects.filter(node__in=all_project_nodes)

    # Get only invoices that are BILLED TO OWNERS (not invoices for properties they own)
    owner_invoices = Invoice.objects.filter(
        owners__in=all_owners  # Only invoices where owners are being billed
    ).distinct()

    # Apply date filters to invoices
    if date_from:
        owner_invoices = owner_invoices.filter(created_at__date__gte=date_from)
    if date_to:
        owner_invoices = owner_invoices.filter(created_at__date__lte=date_to)

    # Get all service items from these invoices
    service_items = InvoiceItem.objects.filter(
        invoice__in=owner_invoices,
        type__in=["FIXED", "VARIABLE", "PERCENTAGE"],  # All service pricing types
    )

    # Calculate total collections
    total_collections = service_items.aggregate(total=Sum("price"))["total"] or 0

    # Debug: Print details
    print(f"  Collections Debug:")
    print(f"    - All owners count: {all_owners.count()}")
    print(f"    - Owner invoices count: {owner_invoices.count()}")
    print(f"    - Service items count: {service_items.count()}")
    print(f"    - Total collections: {total_collections}")

    return total_collections


def calculate_project_total_expenditures(project, date_from=None, date_to=None):
    """
    Calculate total expenditures for a project from expenses
    Only count expenses that are:
    - Linked to services that are billed to owners
    - Have status 'paid'
    """
    # Get all nodes under this project (including the project itself and all descendants)
    all_project_nodes = project.get_descendants(include_self=True)

    # Get all services that are billed to owners (PropertyService with status ACTIVE)
    project_units = LocationNode.objects.filter(
        node_type="UNIT",
        tree_id=project.tree_id,
        lft__gt=project.lft,
        rght__lt=project.rght,
    )
    owner_billed_services = PropertyService.objects.filter(
        property_node__in=project_units,
        status="ACTIVE",
        service__billed_to="OWNER",  # Only services billed to owners
    ).values_list("service", flat=True)

    # Get all expenses for this project and its units
    # Only count expenses that are:
    # 1. Linked to services that are billed to owners
    # 2. Have status 'paid'
    project_expenses = Expense.objects.filter(
        location_node__in=all_project_nodes,
        service__in=owner_billed_services,  # Only services billed to owners
        status="paid",  # Only paid expenses
    )

    # Apply date filters to expenses
    if date_from:
        project_expenses = project_expenses.filter(invoice_date__gte=date_from)
    if date_to:
        project_expenses = project_expenses.filter(invoice_date__lte=date_to)

    # Calculate total expenditures
    total_expenditures = (
        project_expenses.aggregate(total=Sum("total_amount"))["total"] or 0
    )

    # Debug: Print details
    print(f"  Expenditures Debug:")
    print(f"    - All project nodes count: {all_project_nodes.count()}")
    print(f"    - Owner billed services count: {len(owner_billed_services)}")
    print(
        f"    - Project expenses count (paid + service billed to owners): {project_expenses.count()}"
    )
    print(f"    - Total expenditures: {total_expenditures}")

    # Print some sample expenses
    for expense in project_expenses[:3]:
        print(
            f"    - Expense: {expense.description} - {expense.total_amount} - {expense.invoice_date} - Service: {expense.service.name if expense.service else 'None'}"
        )

    return total_expenditures


def calculate_project_expenditures_by_service(project, date_from=None, date_to=None):
    """
    Calculate expenditures broken down by service for a project
    Only count expenses that are:
    - Linked to services that are billed to owners
    - Have status 'paid'
    - Assigned to the project
    """
    # Get all nodes under this project (including the project itself and all descendants)
    all_project_nodes = project.get_descendants(include_self=True)

    # Get all services that are billed to owners (PropertyService with status ACTIVE)
    project_units = LocationNode.objects.filter(
        node_type="UNIT",
        tree_id=project.tree_id,
        lft__gt=project.lft,
        rght__lt=project.rght,
    )
    owner_billed_services = PropertyService.objects.filter(
        property_node__in=project_units,
        status="ACTIVE",
        service__billed_to="OWNER",  # Only services billed to owners
    ).values_list("service", flat=True)

    # Get all expenses for this project and its units
    # Only count expenses that are:
    # 1. Linked to services that are billed to owners
    # 2. Have status 'paid'
    # 3. Assigned to the project
    project_expenses = Expense.objects.filter(
        location_node__in=all_project_nodes,
        service__in=owner_billed_services,  # Only services billed to owners
        status="paid",  # Only paid expenses
    )

    # Apply date filters to expenses
    if date_from:
        project_expenses = project_expenses.filter(invoice_date__gte=date_from)
    if date_to:
        project_expenses = project_expenses.filter(invoice_date__lte=date_to)

    # Group expenses by service and calculate totals
    service_expenditures = {}
    for expense in project_expenses.select_related("service"):
        if expense.service:
            service_key = str(expense.service.id)
            if service_key not in service_expenditures:
                service_expenditures[service_key] = {
                    "service": expense.service,
                    "total_amount": 0,
                    "monthly_breakdown": defaultdict(float),
                }

            service_expenditures[service_key]["total_amount"] += float(
                expense.total_amount
            )

            # Group by month using invoice_date
            expense_month = expense.invoice_date.month
            expense_year = expense.invoice_date.year
            current_year = datetime.now().year

            if expense_year == current_year:
                service_expenditures[service_key]["monthly_breakdown"][
                    expense_month
                ] += float(expense.total_amount)

    return service_expenditures


def get_project_summary_data(date_from=None, date_to=None):
    """
    Get project summary data for ProjectSummaryReport component
    NEW LOGIC: Calculate service costs based on actual invoice collections
    - All services: Sum invoice items billed to project owners (monthly)
    - Returns 12-month breakdown for each service showing actual collected amounts
    """
    from datetime import datetime
    from collections import defaultdict

    # Get all PROJECT nodes
    projects = LocationNode.objects.filter(node_type="PROJECT")

    # Apply date filters if provided
    if date_from:
        projects = projects.filter(created_at__date__gte=date_from)
    if date_to:
        projects = projects.filter(created_at__date__lte=date_to)

    project_data = []

    # Generate 12 months list (current year)
    current_year = datetime.now().year
    months = [
        {
            "month": i,
            "name": datetime(current_year, i, 1).strftime("%B"),
            "year": current_year,
        }
        for i in range(1, 13)
    ]

    for project in projects:
        # Get all units under this project for unit count
        units_count = LocationNode.objects.filter(
            node_type="UNIT", parent__in=project.get_descendants(include_self=False)
        ).count()

        # Get services assigned to this PROJECT that are BILLED TO OWNERS
        # Filter for services that are:
        # 1. Attached to the project (directly or through units)
        # 2. Billed to owners (not tenants)
        # 3. Active status
        project_services = PropertyService.objects.filter(
            property_node=project,
            status="ACTIVE",
            service__billed_to="OWNER",  # Only services billed to owners
        ).select_related("service")

        # Get project owners
        project_owners = PropertyOwner.objects.filter(node=project)

        services_data = {}

        for property_service in project_services:
            service = property_service.service
            if not service:
                continue

            service_key = f"{service.id}_{service.pricing_type}"

            if service_key not in services_data:
                # Initialize monthly data structure
                monthly_data = []
                for month_info in months:
                    monthly_data.append(
                        {
                            "month": month_info["month"],
                            "month_name": month_info["name"],
                            "year": month_info["year"],
                            "value": 0,
                        }
                    )

                services_data[service_key] = {
                    "id": str(service.id),
                    "name": service.name,
                    "type": service.pricing_type,
                    "frequency": service.frequency,
                    "description": service.description or "",
                    "total_cost": 0,
                    "monthly_breakdown": monthly_data,
                }

            # Calculate cost based on actual invoice collections
            # Get all owners for this project (including owners of units, houses, and the project itself)
            all_project_nodes = project.get_descendants(include_self=True)
            all_owners = PropertyOwner.objects.filter(node__in=all_project_nodes)

            # Get only invoices that are BILLED TO OWNERS (not invoices for properties they own)
            # This filters to only show expenses that are charged to owners
            owner_invoices = Invoice.objects.filter(
                owners__in=all_owners  # Only invoices where owners are being billed
            ).distinct()

            # Apply date filters to invoices
            if date_from:
                owner_invoices = owner_invoices.filter(created_at__date__gte=date_from)
            if date_to:
                owner_invoices = owner_invoices.filter(created_at__date__lte=date_to)

            # Get service items from these invoices that are linked to this specific Service
            # We filter by the Service (not PropertyService) and the service's pricing type
            service_items = InvoiceItem.objects.filter(
                invoice__in=owner_invoices,
                service__service=service,  # Link to the Service through PropertyService
                type=service.pricing_type,  # Filter by the service's pricing type (FIXED, VARIABLE, PERCENTAGE)
            ).select_related("invoice")

            # Group by month using invoice created_at
            monthly_totals = defaultdict(float)
            for item in service_items:
                invoice_month = item.invoice.created_at.month
                invoice_year = item.invoice.created_at.year

                # Only include current year data
                if invoice_year == current_year:
                    monthly_totals[invoice_month] += float(item.price)

            # Update monthly breakdown
            total_cost = 0
            for month_data in services_data[service_key]["monthly_breakdown"]:
                month_value = monthly_totals.get(month_data["month"], 0)
                # Round to whole numbers (0 decimal places)
                month_value = round(month_value, 0)
                month_data["value"] = month_value
                total_cost += month_value

            # Round total cost to whole numbers
            total_cost = round(total_cost, 0)
            services_data[service_key]["total_cost"] = total_cost

        # Convert total costs to formatted currency strings
        for service_data in services_data.values():
            service_data["total_cost"] = format_money_with_currency(
                service_data["total_cost"]
            )
            # Format monthly values
            for month_data in service_data["monthly_breakdown"]:
                month_data["value"] = format_money_with_currency(month_data["value"])

        # Get owners for this project
        # Owners can be:
        # 1. Direct owners of the PROJECT node
        # 2. Owners of any child nodes (units, blocks, houses) under the project

        # Get all descendant nodes (including the project itself)
        all_project_nodes = project.get_descendants(include_self=True)

        # Get all PropertyOwner records for these nodes
        all_owners = (
            PropertyOwner.objects.filter(node__in=all_project_nodes)
            .select_related("owner_user", "owner_company")
            .distinct()
        )

        owners_list = []
        seen_owners = set()  # To avoid duplicates

        for owner in all_owners:
            owner_data = None
            owner_id = None

            if owner.owner_user:
                owner_data = {
                    "name": owner.owner_user.get_full_name(),
                    "email": owner.owner_user.email,
                    "phone": owner.owner_user.phone,
                    "type": "user",
                }
                owner_id = f"user_{owner.owner_user.id}"
            elif owner.owner_company:
                owner_data = {
                    "name": owner.owner_company.name,
                    "email": getattr(
                        owner.owner_company, "email", ""
                    ),  # Company might not have email
                    "phone": getattr(
                        owner.owner_company, "phone", ""
                    ),  # Company might not have phone
                    "type": "company",
                }
                owner_id = f"company_{owner.owner_company.id}"

            # Add to list if not already seen
            if owner_data and owner_id not in seen_owners:
                owners_list.append(owner_data)
                seen_owners.add(owner_id)

        project_data.append(
            {
                "id": str(project.id),
                "name": project.name,
                "unitsCount": units_count,
                "services": list(services_data.values()),
                "owners": owners_list,
            }
        )

        # Calculate financial summary for this project
        # Calculate total collections by summing all monthly values from services breakdown
        total_collections = 0
        for service_data in services_data.values():
            for month_data in service_data["monthly_breakdown"]:
                # Extract numeric value from formatted string (e.g., "KES 1,333" -> 1333)
                value_str = str(month_data["value"])
                if value_str.startswith("KES "):
                    # Remove "KES " prefix and convert to float
                    numeric_value = float(
                        value_str.replace("KES ", "").replace(",", "")
                    )
                    total_collections += numeric_value

        total_expenditures = calculate_project_total_expenditures(
            project, date_from, date_to
        )
        # Convert both to float for consistent calculation
        total_collections = float(total_collections)
        total_expenditures = float(total_expenditures)
        balance = total_collections - total_expenditures

        # Debug: Print what's being counted
        print(f"\n=== FINANCIAL SUMMARY DEBUG FOR PROJECT: {project.name} ===")
        print(f"Total Collections (from monthly breakdown): {total_collections}")
        print(f"Total Expenditures: {total_expenditures}")
        print(f"Balance: {balance}")

        # Get expenditure breakdown by service
        service_expenditures = calculate_project_expenditures_by_service(
            project, date_from, date_to
        )

        # Add financial summary to the project data
        project_data[-1]["financial_summary"] = {
            "totalCollections": format_money_with_currency(total_collections),
            "totalExpenditures": format_money_with_currency(total_expenditures),
            "balance": format_money_with_currency(balance),
            "expendituresByService": {},
        }

        # Add expenditure breakdown by service
        for service_key, expenditure_data in service_expenditures.items():
            service = expenditure_data["service"]
            service_name = service.name
            total_amount = round(expenditure_data["total_amount"], 0)

            # Find the matching service key in services_data
            # services_data uses keys like 'service_id_pricing_type'
            # expenditure_data uses keys like 'service_id'
            matching_service_key = None
            for key in services_data.keys():
                if key.startswith(service_key + "_"):
                    matching_service_key = key
                    break

            if matching_service_key:
                # Create monthly breakdown for expenditures
                monthly_expenditures = []
                for month_data in services_data[matching_service_key][
                    "monthly_breakdown"
                ]:
                    month_value = expenditure_data["monthly_breakdown"].get(
                        month_data["month"], 0
                    )
                    month_value = round(month_value, 0)
                    monthly_expenditures.append(
                        {
                            "month": month_data["month"],
                            "month_name": month_data["month_name"],
                            "year": month_data["year"],
                            "value": format_money_with_currency(month_value),
                        }
                    )

                project_data[-1]["financial_summary"]["expendituresByService"][
                    service_name
                ] = {
                    "totalAmount": format_money_with_currency(total_amount),
                    "monthlyBreakdown": monthly_expenditures,
                }

    return project_data


def is_unit_vacant(unit, date_from, date_to):
    """
    Check if unit is vacant for the given date range
    """
    active_tenants = PropertyTenant.objects.filter(
        node=unit,
        contract_start__lte=date_to,
        contract_end__gte=date_from,
        is_deleted=False,
    )

    return not active_tenants.exists()


def get_unit_collected_rent(unit, date_from, date_to):
    """
    Get collected rent for a unit from invoices
    """
    rent_invoices = Invoice.objects.filter(
        property=unit,
        items__type="RENT",
        issue_date__range=[date_from, date_to],
        is_deleted=False,
    ).distinct()

    collected_rent = (
        InvoiceItem.objects.filter(invoice__in=rent_invoices, type="RENT").aggregate(
            total=Sum("price")
        )["total"]
        or 0
    )

    return collected_rent


def get_unit_management_fee(collected_rent):
    """
    Calculate management fee (10% of collected rent)
    """
    # Convert to Decimal for proper calculation
    if isinstance(collected_rent, Decimal):
        return collected_rent * Decimal("0.10")
    else:
        return Decimal(str(collected_rent)) * Decimal("0.10")


def get_unit_services_fee(unit, date_from, date_to):
    """
    Get services fee for a unit (only tenant-billed services)
    """
    property_services = PropertyService.objects.filter(
        property_node=unit, status="ACTIVE", is_deleted=False
    )

    services_fee = Decimal("0")
    for service in property_services:
        if service.service.billed_to == "TENANT":
            if service.service.pricing_type == "FIXED":
                service_cost = service.service.base_price or Decimal("0")
            else:
                # For variable services, check invoices
                service_invoices = Invoice.objects.filter(
                    property=unit,
                    items__service=service,
                    issue_date__range=[date_from, date_to],
                    is_deleted=False,
                )

                service_cost = InvoiceItem.objects.filter(
                    invoice__in=service_invoices, service=service
                ).aggregate(total=Sum("price"))["total"] or Decimal("0")

            services_fee += service_cost

    return services_fee


def get_unit_tenant_info(unit, date_from, date_to):
    """
    Get tenant information for a unit
    """
    active_tenants = PropertyTenant.objects.filter(
        node=unit,
        contract_start__lte=date_to,
        contract_end__gte=date_from,
        is_deleted=False,
    )

    if not active_tenants.exists():
        return {
            "tenant_name": None,
            "tenant_email": None,
            "tenant_phone": None,
            "lease_start_date": None,
            "lease_end_date": None,
        }

    tenant = active_tenants.first()
    return {
        "tenant_name": tenant.tenant_user.get_full_name() if tenant else None,
        "tenant_email": tenant.tenant_user.email if tenant else None,
        "tenant_phone": tenant.tenant_user.phone if tenant else None,
        "lease_start_date": (
            tenant.contract_start.strftime("%Y-%m-%d") if tenant else None
        ),
        "lease_end_date": tenant.contract_end.strftime("%Y-%m-%d") if tenant else None,
    }


def get_unit_owner_info(unit):
    """
    Get owner information for a unit
    """
    owner = PropertyOwner.objects.filter(node=unit, is_deleted=False).first()

    return {
        "owner_name": (
            owner.owner_user.get_full_name() if owner and owner.owner_user else None
        ),
        "owner_phone": owner.owner_user.phone if owner and owner.owner_user else None,
    }


def get_unit_service_charge(unit):
    """
    Get service charge directly from unit/house detail
    """
    try:
        if unit.node_type == "UNIT":
            unit_detail = getattr(unit, "unit_detail", None)
            if unit_detail and unit_detail.service_charge:
                return unit_detail.service_charge
        elif unit.node_type == "HOUSE":
            villa_detail = getattr(unit, "villa_detail", None)
            if villa_detail and villa_detail.service_charge:
                return villa_detail.service_charge
    except (UnitDetail.DoesNotExist, VillaDetail.DoesNotExist):
        pass
    return Decimal("0")


def get_unit_attached_services(unit, date_from, date_to):
    """
    Get attached services for a unit
    """
    attached_services = []
    unit_services = PropertyService.objects.filter(
        property_node=unit, status="ACTIVE", is_deleted=False
    )

    for service in unit_services:
        if service.service.pricing_type == "FIXED":
            service_cost = service.service.base_price or Decimal("0")
        else:
            # For variable services, get from invoices
            service_invoices = Invoice.objects.filter(
                property=unit,
                items__service=service,
                issue_date__range=[date_from, date_to],
                is_deleted=False,
            )

            service_cost = InvoiceItem.objects.filter(
                invoice__in=service_invoices, service=service
            ).aggregate(total=Sum("price"))["total"] or Decimal("0")

        attached_services.append(
            {
                "id": str(service.id),
                "name": service.service.name,
                "cost": format_money_with_currency(service_cost),
                "description": service.service.description,
            }
        )

    return attached_services


def get_per_unit_summary_data(date_from=None, date_to=None):
    """
    Get per unit and house summary data for PerUnitSummaryReport component
    """
    # Get all projects
    projects = LocationNode.objects.filter(node_type="PROJECT", is_deleted=False)

    units_data = []
    projects_data = []

    for project in projects:
        # Get all units and houses under this project
        project_units = LocationNode.objects.filter(
            node_type__in=["UNIT", "HOUSE"],
            tree_id=project.tree_id,
            lft__gte=project.lft,
            rght__lte=project.rght,
            is_deleted=False,
        )

        # Project totals for summary
        project_total_rent = Decimal("0")
        project_total_service_charge = Decimal("0")
        project_total_services = Decimal("0")

        for unit in project_units:
            # Check if unit is vacant
            is_vacant = is_unit_vacant(unit, date_from, date_to)

            if is_vacant:
                collected_rent = Decimal("0")
                services_fee = Decimal("0")
                occupancy_status = "VACANT"
                tenant_info = {
                    "tenant_name": None,
                    "tenant_email": None,
                    "tenant_phone": None,
                    "lease_start_date": None,
                    "lease_end_date": None,
                }
            else:
                # Get collected rent
                collected_rent = get_unit_collected_rent(unit, date_from, date_to)

                # Get services fee
                services_fee = get_unit_services_fee(unit, date_from, date_to)

                occupancy_status = "OCCUPIED"

                # Get tenant information
                tenant_info = get_unit_tenant_info(unit, date_from, date_to)

            # Get service charge directly from unit/house
            service_charge = get_unit_service_charge(unit)

            # Get owner information
            owner_info = get_unit_owner_info(unit)

            # Get attached services
            attached_services = get_unit_attached_services(unit, date_from, date_to)

            unit_data = {
                "id": str(unit.id),
                "name": unit.name,
                "projectId": str(project.id),
                "projectName": project.name,
                "rentFee": format_money_with_currency(collected_rent),
                "serviceCharge": format_money_with_currency(service_charge),
                "serviceFee": format_money_with_currency(services_fee),
                "totalIncome": format_money_with_currency(collected_rent),
                "totalExpenses": format_money_with_currency(services_fee),
                "netIncome": format_money_with_currency(
                    collected_rent + service_charge + services_fee
                ),
                "occupancyStatus": occupancy_status,
                "tenantName": tenant_info["tenant_name"],
                "tenantEmail": tenant_info["tenant_email"],
                "tenantPhone": tenant_info["tenant_phone"],
                "leaseStartDate": tenant_info["lease_start_date"],
                "leaseEndDate": tenant_info["lease_end_date"],
                "ownerName": owner_info["owner_name"],
                "ownerPhone": owner_info["owner_phone"],
                "nodeType": unit.node_type,
                "attachedServices": attached_services,
            }

            units_data.append(unit_data)

            # Add to project totals
            project_total_rent += collected_rent
            project_total_service_charge += service_charge
            project_total_services += services_fee

        # Add project data with summary
        projects_data.append(
            {
                "id": str(project.id),
                "name": project.name,
                "summary": {
                    "collectedRent": format_money_with_currency(project_total_rent),
                    "serviceCharge": format_money_with_currency(
                        project_total_service_charge
                    ),
                    "servicesFee": format_money_with_currency(project_total_services),
                    "net": format_money_with_currency(
                        project_total_rent
                        + project_total_service_charge
                        + project_total_services
                    ),
                    "unitsCount": project_units.count(),
                },
            }
        )

    return {"units": units_data, "projects": projects_data}


def get_service_revenue_and_margin(service, date_from, date_to):
    """
    Get revenue and calculate margin per individual service transaction
    """
    total_revenue = Decimal("0")
    total_margin = Decimal("0")

    # Get all InvoiceItems for this service
    invoice_items = InvoiceItem.objects.filter(
        service__service=service,
        created_at__date__range=[date_from, date_to],
        is_deleted=False,
    )

    for invoice_item in invoice_items:
        item_revenue = invoice_item.price
        total_revenue += item_revenue

        # Find corresponding expense for this service in the same date range
        corresponding_expense = Expense.objects.filter(
            service=service,
            created_at__date__range=[date_from, date_to],
            is_deleted=False,
        ).first()

        if corresponding_expense:
            expense_amount = corresponding_expense.total_amount
            item_margin = item_revenue - expense_amount
            total_margin += item_margin
        else:
            # No corresponding expense found - full revenue is profit
            item_margin = item_revenue
            total_margin += item_margin

    return total_revenue, total_margin


def get_service_total_cost(service, date_from, date_to):
    """
    Get total cost for a service (sum of all expenses in date range)
    """
    expenses = Expense.objects.filter(
        service=service, created_at__date__range=[date_from, date_to], is_deleted=False
    )

    total_cost = expenses.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")

    return total_cost


def get_service_payout_expenses(service, date_from, date_to):
    """
    Get payout expenses for a service from Payout table (date range filtered)
    """
    # Get properties that have this service attached
    properties_with_service = PropertyService.objects.filter(
        service=service, is_deleted=False
    ).values_list("property_node_id", flat=True)

    # Get payouts for these properties in the date range
    payouts = Payout.objects.filter(
        property_node_id__in=properties_with_service,
        created_at__date__range=[date_from, date_to],
        is_deleted=False,
    )

    total_payout_expenses = payouts.aggregate(total=Sum("services_expenses"))[
        "total"
    ] or Decimal("0")

    return total_payout_expenses


def get_service_attached_properties(service, date_from, date_to):
    """
    Get properties attached to a service (date range filtered)
    """
    property_services = PropertyService.objects.filter(
        service=service, created_at__date__range=[date_from, date_to], is_deleted=False
    )

    attached_properties = []
    for property_service in property_services:
        # Calculate cost based on pricing type
        if property_service.service.pricing_type == "FIXED":
            cost = property_service.service.base_price
        else:
            # For variable services, sum invoice items
            invoice_items = InvoiceItem.objects.filter(
                service=property_service,
                created_at__date__range=[date_from, date_to],
                is_deleted=False,
            )
            cost = invoice_items.aggregate(total=Sum("price"))["total"] or Decimal("0")

        attached_properties.append(
            {
                "id": str(property_service.property_node.id),
                "name": property_service.property_node.name,
                "cost": format_money_with_currency(cost),
                "pricingType": property_service.service.pricing_type,
                "billedTo": property_service.service.billed_to,
            }
        )

    return attached_properties


def get_service_vendors(service, date_from, date_to):
    """
    Get vendors for a service from Expense table (date range filtered)
    """
    expenses = Expense.objects.filter(
        service=service, created_at__date__range=[date_from, date_to], is_deleted=False
    ).select_related("vendor")

    vendors = []
    for expense in expenses:
        if expense.vendor:
            vendors.append(
                {
                    "id": str(expense.vendor.id),
                    "name": expense.vendor.name,
                    "amount": format_money_with_currency(expense.total_amount),
                    "description": expense.description,
                }
            )

    return vendors


def get_service_utilization_rate(service):
    """
    Calculate utilization rate for a service
    """
    total_properties = LocationNode.objects.filter(
        node_type="UNIT", is_deleted=False
    ).count()

    if total_properties == 0:
        return 0

    service_properties = PropertyService.objects.filter(
        service=service, status="ACTIVE", is_deleted=False
    ).count()

    utilization_rate = (service_properties / total_properties) * 100
    return round(utilization_rate, 2)


def get_service_monthly_expenses(service, year):
    """
    Get monthly expenses for a service for a specific year
    Only includes expenses that are:
    - Attached to projects
    - Billed to owners
    - Have status 'paid'
    """
    monthly_expenses = []

    # Get all projects that have this service attached
    project_services = PropertyService.objects.filter(
        service=service,
        status="ACTIVE",
        is_deleted=False,
    )

    # Get the project nodes (PROJECT type)
    project_nodes = []
    for ps in project_services:
        # Find the project ancestor
        project_node = (
            ps.property_node.get_ancestors(include_self=True)
            .filter(node_type="PROJECT")
            .first()
        )
        if project_node:
            project_nodes.append(project_node)

    # Get expenses for this service in the specified year
    expenses = Expense.objects.filter(
        service=service,
        status="paid",
        created_at__year=year,
        is_deleted=False,
    )

    # Initialize 12 months with zero values
    for month in range(1, 13):
        month_expenses = expenses.filter(created_at__month=month)
        total_month_expense = month_expenses.aggregate(total=Sum("total_amount"))[
            "total"
        ] or Decimal("0")

        monthly_expenses.append(
            {
                "month": month,
                "month_name": datetime(year, month, 1).strftime("%B"),
                "year": year,
                "value": format_money_with_currency(total_month_expense),
            }
        )

    return monthly_expenses


def get_service_attached_projects(service):
    """
    Get projects that have this service attached
    Only for owner-billed services
    """
    if service.billed_to != "OWNER":
        return []

    project_services = PropertyService.objects.filter(
        service=service,
        status="ACTIVE",
        is_deleted=False,
    )

    project_names = set()
    for ps in project_services:
        # Find the project ancestor
        project_node = (
            ps.property_node.get_ancestors(include_self=True)
            .filter(node_type="PROJECT")
            .first()
        )
        if project_node:
            project_names.add(project_node.name)

    return list(project_names)


def get_services_report_data(date_from=None, date_to=None):
    """
    Get services report data for ServicesReport component
    Focus on owner-billed services with monthly expense breakdown
    """
    # Get current year for monthly breakdown
    current_year = timezone.now().year

    # Get all active services that are billed to owners
    services = Service.objects.filter(
        is_active=True, is_deleted=False, billed_to="OWNER"
    )

    services_data = []
    total_cost = Decimal("0")

    for service in services:
        # Get monthly expense breakdown
        monthly_breakdown = get_service_monthly_expenses(service, current_year)

        # Calculate total cost for the year
        service_total_cost = sum(
            Decimal(re.sub(r"[^\d.-]", "", expense["value"]))
            for expense in monthly_breakdown
        )

        # Get attached projects
        attached_projects = get_service_attached_projects(service)

        service_data = {
            "id": str(service.id),
            "name": service.name,
            "type": service.pricing_type,
            "frequency": service.frequency,
            "billedTo": service.billed_to,
            "description": service.description or "",
            "monthly_breakdown": monthly_breakdown,
            "total_cost": format_money_with_currency(service_total_cost),
            "attached_projects": attached_projects,
        }

        services_data.append(service_data)
        total_cost += service_total_cost

    # Create summary
    summary = {
        "totalServices": len(services_data),
        "totalCost": format_money_with_currency(total_cost),
        "year": current_year,
    }

    return {
        "services": services_data,
        "summary": summary,
    }


def get_service_summary_report_data(
    project_filter=None, month_filter=None, year_filter=None
):
    """
    Get service summary report data based on:
    - Services: ALL services where billed_to="MANAGEMENT" (show even if no data)
    - Total Collected: Sum of ALL InvoiceItems where type="SERVICE_CHARGE"
    - Total Expense: Sum of expenses from expense table attached to management services
    - Total Management Fee: Calculated from project management fees
    """
    from django.db.models import Sum, Q
    from properties.models import (
        LocationNode,
        ProjectDetail,
        UnitDetail,
        VillaDetail,
        Service,
    )
    from payments.models import Invoice, InvoiceItem, Expense
    from decimal import Decimal

    # Default to current year if not specified
    if year_filter is None:
        year_filter = timezone.now().year

    # Get all projects
    projects = LocationNode.objects.filter(node_type="PROJECT", is_deleted=False)

    if project_filter and project_filter != "all":
        projects = projects.filter(id=project_filter)

    services_data = []
    total_collected = Decimal("0")
    total_expense = Decimal("0")
    total_management_fee = Decimal("0")

    # STEP 1: Calculate Total Collected from ALL SERVICE_CHARGE invoice items
    service_charge_items = InvoiceItem.objects.filter(
        type="SERVICE_CHARGE",
        invoice__issue_date__year=year_filter,
        invoice__is_deleted=False,
    )

    # Apply month filter if specified
    if month_filter and month_filter != "all":
        service_charge_items = service_charge_items.filter(
            invoice__issue_date__month=month_filter
        )

    # Apply project filter if specified
    if project_filter and project_filter != "all":
        project_node = LocationNode.objects.get(id=project_filter)
        # Filter by invoices related to this project
        project_descendants = project_node.get_descendants(include_self=True)
        service_charge_items = service_charge_items.filter(
            invoice__property__in=project_descendants
        )

    # Sum all service charge items
    total_collected = service_charge_items.aggregate(total=Sum("price"))[
        "total"
    ] or Decimal("0")

    # STEP 2: Get ALL services billed to MANAGEMENT (show even if no data)
    management_services = Service.objects.filter(
        billed_to="MANAGEMENT", is_deleted=False
    )

    for service in management_services:
        service_data = {
            "id": str(service.id),
            "name": service.name,
            "type": service.pricing_type,
            "frequency": service.frequency,
            "billedTo": service.billed_to,
            "description": service.description or "",
            "monthly_breakdown": [],
            "total": Decimal("0"),
            "attached_projects": [],
        }

        # Initialize monthly breakdown (all months start with 0)
        for month_num in range(1, 13):
            month_name = timezone.datetime(year_filter, month_num, 1).strftime("%B")
            service_data["monthly_breakdown"].append(
                {
                    "month": month_num,
                    "month_name": month_name,
                    "year": year_filter,
                    "value": "KES 0",
                }
            )

        # STEP 3: Calculate expenses for this service from Expense table
        expenses_query = Expense.objects.filter(
            service=service, invoice_date__year=year_filter, is_deleted=False
        )

        # Apply month filter if specified
        if month_filter and month_filter != "all":
            expenses_query = expenses_query.filter(invoice_date__month=month_filter)

        # Apply project filter if specified
        if project_filter and project_filter != "all":
            project_node = LocationNode.objects.get(id=project_filter)
            expenses_query = expenses_query.filter(
                location_node__in=project_node.get_descendants(include_self=True)
            )

        # Calculate monthly expenses for this service
        monthly_expenses = {}
        for expense in expenses_query:
            month = expense.invoice_date.month
            if month not in monthly_expenses:
                monthly_expenses[month] = Decimal("0")
            monthly_expenses[month] += expense.total_amount

        # Update monthly breakdown with expense data
        service_total = Decimal("0")
        for month_num in range(1, 13):
            if month_num in monthly_expenses:
                amount = monthly_expenses[month_num]
                service_data["monthly_breakdown"][month_num - 1][
                    "value"
                ] = f"KES {amount}"
                service_total += amount

        service_data["total"] = service_total
        total_expense += service_total

        # Get attached projects for this service
        attached_projects = set()
        property_services = PropertyService.objects.filter(
            service=service, status="ACTIVE", is_deleted=False
        )
        for ps in property_services:
            # Find the project ancestor
            project_node = (
                ps.property_node.get_ancestors(include_self=True)
                .filter(node_type="PROJECT")
                .first()
            )
            if project_node:
                # Store both project ID and name for filtering
                attached_projects.add((str(project_node.id), project_node.name))

        service_data["attached_projects"] = [
            {"id": pid, "name": pname} for pid, pname in attached_projects
        ]

        # Always include all management services (even if no expenses)
        services_data.append(service_data)

    # STEP 4: Calculate management fees from projects
    for project in projects:
        try:
            project_detail = project.project_detail
            if project_detail and project_detail.management_fee:
                # Management fee is a single value per project, not multiplied by months
                total_management_fee += project_detail.management_fee
        except (ProjectDetail.DoesNotExist, AttributeError):
            continue

    # Calculate balance
    balance = total_collected - total_expense - total_management_fee

    # Prepare summary
    summary = {
        "totalCollected": f"KES {total_collected}",
        "totalExpense": f"KES {total_expense}",
        "totalManagementFee": f"KES {total_management_fee}",
        "balance": f"KES {balance}",
    }

    # Prepare project breakdowns for popovers (simplified for now)
    project_breakdowns = {
        "collections": [],
        "expenses": [],
        "managementFees": [],
        "balance": [],
    }

    for project in projects:
        # Get project management fee
        project_management_fee = Decimal("0")
        try:
            project_detail = project.project_detail
            if project_detail and project_detail.management_fee:
                project_management_fee = project_detail.management_fee
        except (ProjectDetail.DoesNotExist, AttributeError):
            pass

        # Calculate project-specific collections
        project_collections = Decimal("0")
        if project_filter == "all" or str(project.id) == project_filter:
            # Get service charge items for this project
            project_descendants = project.get_descendants(include_self=True)
            project_service_charges = service_charge_items.filter(
                invoice__property__in=project_descendants
            )
            project_collections = project_service_charges.aggregate(total=Sum("price"))[
                "total"
            ] or Decimal("0")

        # Calculate project-specific expenses
        project_expenses = Decimal("0")
        if project_filter == "all" or str(project.id) == project_filter:
            # Get expenses for this project
            project_expenses_query = Expense.objects.filter(
                location_node__in=project.get_descendants(include_self=True),
                service__billed_to="MANAGEMENT",
                invoice_date__year=year_filter,
                is_deleted=False,
            )
            if month_filter and month_filter != "all":
                project_expenses_query = project_expenses_query.filter(
                    invoice_date__month=month_filter
                )
            project_expenses = project_expenses_query.aggregate(
                total=Sum("total_amount")
            )["total"] or Decimal("0")

        # Calculate project balance
        project_balance = (
            project_collections - project_expenses - project_management_fee
        )

        project_breakdowns["collections"].append(
            {
                "project": project.name,
                "project_id": str(project.id),
                "amount": f"KES {project_collections}",
            }
        )
        project_breakdowns["expenses"].append(
            {
                "project": project.name,
                "project_id": str(project.id),
                "amount": f"KES {project_expenses}",
            }
        )
        project_breakdowns["managementFees"].append(
            {
                "project": project.name,
                "project_id": str(project.id),
                "amount": f"KES {project_management_fee}",
            }
        )
        project_breakdowns["balance"].append(
            {
                "project": project.name,
                "project_id": str(project.id),
                "amount": f"KES {project_balance}",
            }
        )

    # Current month info
    current_month = timezone.now().month
    current_month_name = timezone.datetime(year_filter, current_month, 1).strftime("%B")

    current_month_info = {
        "month": current_month,
        "month_name": current_month_name,
        "year": year_filter,
    }

    # Applied filters
    applied_filters = {
        "project": project_filter or "all",
        "month": month_filter or "all",
        "year": year_filter,
    }

    return {
        "services": services_data,
        "summary": summary,
        "projectBreakdowns": project_breakdowns,
        "currentMonth": current_month_info,
        "appliedFilters": applied_filters,
    }
