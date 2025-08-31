from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple

from django.db.models import Sum, Q
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from properties.models import LocationNode, UnitDetail, PropertyTenant
from payments.models import Invoice, Receipt
from accounts.models import Users
from utils.format import format_money_with_currency


def calculate_unit_status(
    unit_detail: UnitDetail, property_tenant: Optional[PropertyTenant], invoices: list
) -> str:
    """
    Determine the status of a unit based on tenant assignment and invoice data.

    Args:
        unit_detail: Unit detail object
        property_tenant: Current tenant assignment (None if vacant)
        invoices: List of invoices for this unit

    Returns:
        Status string: 'vacant', 'paid', 'unpaid', 'partial', 'late'
    """
    if not property_tenant:
        return "vacant"

    # Check for overdue invoices
    overdue_invoices = [
        inv
        for inv in invoices
        if inv.due_date < timezone.now().date() and inv.status in ["ISSUED", "OVERDUE"]
    ]

    if overdue_invoices:
        return "late"

    # Check current month payment status
    current_month = timezone.now().month
    current_year = timezone.now().year

    current_month_invoice = next(
        (
            inv
            for inv in invoices
            if inv.issue_date.month == current_month
            and inv.issue_date.year == current_year
        ),
        None,
    )

    if not current_month_invoice:
        return "unpaid"

    if current_month_invoice.status == "PAID":
        return "paid"
    elif current_month_invoice.balance > 0:
        return "partial"
    else:
        return "unpaid"


def calculate_payment_progress(invoice: Optional[Invoice], receipts: list) -> int:
    """
    Calculate payment progress percentage for an invoice.

    Args:
        invoice: Invoice object
        receipts: List of receipts for this invoice

    Returns:
        Progress percentage (0-100)
    """
    if not invoice:
        return 0

    total_paid = sum(receipt.paid_amount for receipt in receipts)

    if invoice.total_amount == 0:
        return 100

    progress = (total_paid / invoice.total_amount) * 100
    return min(int(progress), 100)


def calculate_outstanding_balance(
    invoice: Optional[Invoice], receipts: list
) -> Decimal:
    """
    Calculate outstanding balance for an invoice.

    Args:
        invoice: Invoice object
        receipts: List of receipts for this invoice

    Returns:
        Outstanding balance amount
    """
    if not invoice:
        return Decimal("0.00")

    total_paid = sum(receipt.paid_amount for receipt in receipts)
    return invoice.total_amount - total_paid


def calculate_balance_breakdown(invoice: Optional[Invoice], receipts: list) -> dict:
    """
    Calculate breakdown of balance components for an invoice.

    Breakdown:
    - Rent: RENT + DEPOSIT + DEPOSIT_REFUND
    - Services: UTILITY + SERVICE + MANAGEMENT_FEE + OWNER_SERVICE + OTHER
    - Penalties: LATE_FEE + penalty-related items

    Args:
        invoice: Invoice object
        receipts: List of receipts for this invoice

    Returns:
        Dictionary with balance breakdown components
    """
    if not invoice:
        return {
            "rent_amount": Decimal("0.00"),
            "services_amount": Decimal("0.00"),
            "penalties_amount": Decimal("0.00"),
            "total_paid": Decimal("0.00"),
            "outstanding_balance": Decimal("0.00"),
        }

    # Calculate total paid
    total_paid = sum(receipt.paid_amount for receipt in receipts)

    # Breakdown by invoice item types
    rent_amount = Decimal("0.00")
    services_amount = Decimal("0.00")
    penalties_amount = Decimal("0.00")

    for item in invoice.items.all():
        item_type = item.type.upper()
        item_amount = item.price

        # Rent category: RENT + DEPOSIT + DEPOSIT_REFUND
        if item_type in ["RENT", "DEPOSIT", "DEPOSIT_REFUND"]:
            rent_amount += item_amount
        # Services category: UTILITY + SERVICE + MANAGEMENT_FEE + OWNER_SERVICE + OTHER
        elif item_type in [
            "UTILITY",
            "SERVICE",
            "MANAGEMENT_FEE",
            "OWNER_SERVICE",
            "OTHER",
        ]:
            services_amount += item_amount
        # Penalties category: LATE_FEE + any penalty-related items
        elif item_type in ["LATE_FEE", "PENALTY"]:
            penalties_amount += item_amount
        else:
            # Default to services for any unknown types
            services_amount += item_amount

    outstanding_balance = invoice.total_amount - total_paid

    return {
        "rent_amount": rent_amount,
        "services_amount": services_amount,
        "penalties_amount": penalties_amount,
        "total_paid": total_paid,
        "outstanding_balance": outstanding_balance,
    }


def calculate_next_due_date(
    property_tenant: PropertyTenant, last_invoice: Optional[Invoice]
) -> Optional[datetime]:
    """
    Calculate the next due date based on contract and last invoice.

    Args:
        property_tenant: Tenant assignment object
        last_invoice: Last invoice for this tenant

    Returns:
        Next due date or None
    """
    if not property_tenant or not last_invoice:
        return None

    # For now, assume monthly billing
    # This could be enhanced to support different billing frequencies
    return last_invoice.issue_date + relativedelta(months=1)


def get_last_payment_info(invoices: list) -> Tuple[Optional[datetime], Decimal]:
    """
    Get the last payment date and amount from receipts.

    Args:
        invoices: List of invoices for the unit

    Returns:
        Tuple of (last_payment_date, last_payment_amount)
    """
    all_receipts = []
    for invoice in invoices:
        all_receipts.extend(invoice.receipts.all())

    if not all_receipts:
        return None, Decimal("0.00")

    # Get the most recent receipt
    latest_receipt = max(all_receipts, key=lambda r: r.payment_date)
    return latest_receipt.payment_date, latest_receipt.paid_amount


def get_rent_roll_summary_stats(company_id: str, filters: dict = None) -> dict:
    """
    Calculate summary statistics for rent roll.
    Only includes units/houses with FULL_MANAGEMENT service type.
    Uses the same logic as get_rent_roll_units_data for consistency.

    Args:
        company_id: Company ID to filter data
        filters: Optional filters for date range

    Returns:
        Dictionary with summary statistics
    """
    current_date = timezone.now().date()
    current_month = current_date.month
    current_year = current_date.year

    # Parse date filters
    date_from = None
    date_to = None
    if filters:
        date_from = filters.get("date_from")
        date_to = filters.get("date_to")

    # Get all units and houses with FULL_MANAGEMENT service type
    # Use the same query as get_rent_roll_units_data
    company_properties = (
        LocationNode.objects.filter(node_type__in=["HOUSE", "UNIT"])
        .filter(
            Q(unit_detail__management_mode="FULL_MANAGEMENT")
            | Q(villa_detail__management_mode="FULL_MANAGEMENT")
        )
        .select_related("unit_detail", "villa_detail")
    )

    # Filter out properties without proper details (same as list logic)
    valid_properties = []
    occupied_count = 0
    total_expected = Decimal("0.00")  # Total expected (rent + services + penalties)
    rent_expected = Decimal("0.00")  # Rent expected only

    for property_node in company_properties:
        unit_detail = getattr(property_node, "unit_detail", None)
        villa_detail = getattr(property_node, "villa_detail", None)

        # Skip properties without proper details (same as list logic)
        if not unit_detail and not villa_detail:
            continue

        # Check for active tenant
        property_tenant = PropertyTenant.objects.filter(
            node=property_node,
            contract_end__gte=current_date,
            contract_start__lte=current_date,
        ).first()

        # Check if this property has issued invoices
        invoice_filter = {
            "property": property_node,
            "status__in": ["ISSUED", "PAID", "OVERDUE", "PARTIAL"],
        }

        # Apply date range filter if provided
        if date_from:
            invoice_filter["issue_date__gte"] = date_from
        if date_to:
            invoice_filter["issue_date__lte"] = date_to

        has_issued_invoices = Invoice.objects.filter(**invoice_filter).exists()

        if has_issued_invoices:
            valid_properties.append(property_node)

            if property_tenant:
                occupied_count += 1
                # Use contract rent amount for rent expected
                rent_expected += property_tenant.rent_amount

                # Calculate total expected from invoices in date range
                if date_from and date_to:
                    # Use date range
                    current_month_invoices = Invoice.objects.filter(
                        property=property_node,
                        status__in=["ISSUED", "PAID", "OVERDUE", "PARTIAL"],
                        issue_date__gte=date_from,
                        issue_date__lte=date_to,
                    )
                else:
                    # Use current month
                    current_month_invoices = Invoice.objects.filter(
                        property=property_node,
                        status__in=["ISSUED", "PAID", "OVERDUE", "PARTIAL"],
                        issue_date__month=current_month,
                        issue_date__year=current_year,
                    )

                for invoice in current_month_invoices:
                    total_expected += invoice.total_amount

    total_properties = len(valid_properties)
    vacant_properties = total_properties - occupied_count

    # Calculate collected amount from all invoice types (not just rent)
    receipt_filter = {
        "invoice__property__in": valid_properties,
    }

    # Apply date range filter to receipts
    if date_from and date_to:
        receipt_filter["invoice__issue_date__gte"] = date_from
        receipt_filter["invoice__issue_date__lte"] = date_to
    else:
        receipt_filter["invoice__issue_date__month"] = current_month
        receipt_filter["invoice__issue_date__year"] = current_year

    collected = Receipt.objects.filter(**receipt_filter).aggregate(
        total=Sum("paid_amount")
    )["total"] or Decimal("0.00")

    return {
        "total_properties": total_properties,
        "occupied_properties": occupied_count,
        "vacant_properties": vacant_properties,
        "rent_expected": format_money_with_currency(rent_expected),
        "total_expected": format_money_with_currency(total_expected),
        "collected": format_money_with_currency(collected),
    }


def get_rent_roll_units_data(company_id: str, filters: dict = None) -> list:
    """
    Get rent roll data for all properties (units/houses) with calculations.
    Only includes properties with FULL_MANAGEMENT service type.

    Args:
        company_id: Company ID to filter data
        filters: Optional filters for date range, status, etc.

    Returns:
        List of rent roll property data
    """
    current_date = timezone.now().date()

    # Parse date filters
    date_from = None
    date_to = None
    if filters:
        date_from = filters.get("date_from")
        date_to = filters.get("date_to")

    # Get all units and houses with FULL_MANAGEMENT service type
    company_properties = (
        LocationNode.objects.filter(node_type__in=["HOUSE", "UNIT"])
        .filter(
            Q(unit_detail__management_mode="FULL_MANAGEMENT")
            | Q(villa_detail__management_mode="FULL_MANAGEMENT")
        )
        .select_related("unit_detail", "villa_detail")
    )

    rent_roll_data = []

    for property_node in company_properties:
        # Get property detail (unit or villa)
        unit_detail = getattr(property_node, "unit_detail", None)
        villa_detail = getattr(property_node, "villa_detail", None)

        # Skip properties without proper details
        if not unit_detail and not villa_detail:
            print(
                f"Skipping property {property_node.id} - no unit or villa detail found"
            )
            continue

            # Determine property type and identifier
        property_type = property_node.node_type

        # Use unique ID-based identifier to avoid duplicates
        if unit_detail:
            property_identifier = f"{unit_detail.identifier}-{property_node.id}"
        elif villa_detail:
            property_identifier = f"{villa_detail.name}-{property_node.id}"
        else:
            property_identifier = f"{property_node.name}-{property_node.id}"

        # Get current tenant assignment
        property_tenant = (
            PropertyTenant.objects.filter(
                node=property_node,
                # contract_end__gte=current_date,
                # contract_start__lte=current_date,
            )
            .select_related("tenant_user")
            .first()
        )

        # Get invoices for this property - only issued invoices (not draft)
        invoice_filter = {
            "property": property_node,
            "status__in": ["ISSUED", "PAID", "OVERDUE", "PARTIAL"],
        }

        # Apply date range filter if provided
        if date_from:
            invoice_filter["issue_date__gte"] = date_from
        if date_to:
            invoice_filter["issue_date__lte"] = date_to

        invoices = Invoice.objects.filter(**invoice_filter).order_by("-issue_date")

        # Skip units that don't have any issued invoices
        if not invoices.exists():
            print(f"Skipping property {property_identifier} - no issued invoices found")
            continue

        # Get current month invoice (or use date range if specified)
        if date_from and date_to:
            # Use the first invoice from the filtered invoices (by due_date)
            current_month_invoice = invoices.first()
        else:
            # Use current month
            current_month_invoice = next(
                (
                    inv
                    for inv in invoices
                    if inv.issue_date.month == current_date.month
                    and inv.issue_date.year == current_date.year
                ),
                None,
            )

        # If no current month invoice, skip this unit
        if not current_month_invoice:
            print(f"Skipping property {property_identifier} - no current month invoice")
            continue

        # Get receipts for all invoices
        all_receipts = []
        for invoice in invoices:
            all_receipts.extend(invoice.receipts.all())

        # Calculate status
        property_detail = unit_detail or villa_detail
        status = calculate_unit_status(property_detail, property_tenant, list(invoices))

        # Calculate payment progress
        progress = calculate_payment_progress(current_month_invoice, all_receipts)

        # Calculate outstanding balance
        balance = calculate_outstanding_balance(current_month_invoice, all_receipts)

        # Calculate balance breakdown
        balance_breakdown = calculate_balance_breakdown(
            current_month_invoice, all_receipts
        )

        # Get last payment info
        last_payment_date, last_payment_amount = get_last_payment_info(list(invoices))

        # Get next due date
        next_due_date = calculate_next_due_date(property_tenant, current_month_invoice)

        # Build full project hierarchy path
        ancestors = list(property_node.get_ancestors(include_self=True))
        hierarchy_parts = []

        for ancestor in ancestors:
            if ancestor.node_type == "PROJECT":
                hierarchy_parts.append(ancestor.name)
            elif ancestor.node_type == "BLOCK":
                hierarchy_parts.append(ancestor.name)
            elif ancestor.node_type == "HOUSE":
                hierarchy_parts.append(ancestor.name)
            elif ancestor.node_type == "UNIT":
                # Add unit identifier
                unit_detail = getattr(ancestor, "unit_detail", None)
                if unit_detail:
                    hierarchy_parts.append(f"Unit {unit_detail.identifier}")
                else:
                    hierarchy_parts.append(ancestor.name)

        project_name = " > ".join(hierarchy_parts)

        # Get monthly rent from tenant contract (this is the expected rent)
        monthly_rent = float(property_tenant.rent_amount) if property_tenant else 0

        # Get actual rent amount from invoice (this is what was actually billed)
        actual_rent_amount = float(balance_breakdown["rent_amount"])

        # Build property data
        property_data = {
            "id": str(property_node.id),
            "property": property_identifier,
            "propertyType": property_type,
            "projectName": project_name,
            "invoiceId": str(current_month_invoice.id),
            "invoiceNumber": current_month_invoice.invoice_number,
            "tenantName": (
                property_tenant.tenant_user.get_full_name()
                if property_tenant
                else "Vacant"
            ),
            "tenantContact": (
                property_tenant.tenant_user.email if property_tenant else ""
            ),
            "leaseStart": (
                property_tenant.contract_start.isoformat() if property_tenant else ""
            ),
            "leaseEnd": (
                property_tenant.contract_end.isoformat() if property_tenant else ""
            ),
            "monthlyRent": format_money_with_currency(
                monthly_rent
            ),  # Contract rent amount
            "issueDate": (
                current_month_invoice.issue_date.isoformat()
                if current_month_invoice and current_month_invoice.issue_date
                else ""
            ),
            "dueDate": (
                current_month_invoice.due_date.isoformat()
                if current_month_invoice and current_month_invoice.due_date
                else ""
            ),
            "nextDueDate": (next_due_date.isoformat() if next_due_date else ""),
            "lastPayment": {
                "date": last_payment_date.isoformat() if last_payment_date else "",
                "amount": format_money_with_currency(last_payment_amount),
            },
            "balance": format_money_with_currency(balance),  # Total outstanding balance
            "status": status,
            "paymentProgress": progress,
            # Balance breakdown components
            "rentAmount": format_money_with_currency(
                actual_rent_amount
            ),  # Actual rent billed (includes deposits)
            "servicesAmount": format_money_with_currency(
                balance_breakdown["services_amount"]
            ),
            "penaltiesAmount": format_money_with_currency(
                balance_breakdown["penalties_amount"]
            ),
            "totalPaid": format_money_with_currency(balance_breakdown["total_paid"]),
        }

        rent_roll_data.append(property_data)

    return rent_roll_data


def get_unit_ledger_data(company_id: str, unit_id: str) -> list:
    """
    Get ledger transactions for a specific unit using proper accounting principles.

    Accounting Logic:
    - Debit = Money owed (charges/invoices)
    - Credit = Money received (payments/receipts)
    - Balance = Running total (debits - credits)

    Args:
        company_id: Company ID to filter data
        unit_id: UUID of the unit to get ledger for

    Returns:
        List of ledger transactions with proper debit/credit and balance
    """
    from properties.models import LocationNode, PropertyTenant
    from payments.models import Invoice, Receipt
    from accounts.models import Users

    try:
        # Get the unit node
        unit_node = LocationNode.objects.get(id=unit_id, node_type="UNIT")

        print(f"Unit node: {unit_node}")

        # Get current tenant for this unit
        current_tenant = (
            PropertyTenant.objects.filter(node=unit_node)
            .select_related("tenant_user")
            .first()
        )

        # Get all invoices for this unit
        invoices = Invoice.objects.filter(
            property=unit_node,
        ).order_by("issue_date")

        print(f"Invoices: {invoices}")

        # Get all receipts for this unit
        receipts = Receipt.objects.filter(invoice__property=unit_node).order_by(
            "payment_date"
        )

        ledger_transactions = []
        running_balance = 0

        # Process invoices (DEBITS - money owed)
        for invoice in invoices:
            # Get tenant information for this invoice
            invoice_tenants = invoice.tenants.all()
            tenant_info = ""
            invoice_recipient_name = ""
            invoice_recipient_email = ""

            if invoice_tenants.exists():
                tenant_names = [
                    tenant.tenant_user.get_full_name() for tenant in invoice_tenants
                ]
                tenant_info = ", ".join(tenant_names)
                # Use first tenant as invoice recipient
                invoice_recipient = invoice_tenants.first().tenant_user
                invoice_recipient_name = invoice_recipient.get_full_name()
                invoice_recipient_email = invoice_recipient.email
            elif current_tenant:
                tenant_info = current_tenant.tenant_user.get_full_name()
                invoice_recipient_name = current_tenant.tenant_user.get_full_name()
                invoice_recipient_email = current_tenant.tenant_user.email
            else:
                tenant_info = "Unknown Tenant"
                invoice_recipient_name = "Unknown Recipient"
                invoice_recipient_email = ""

            # Calculate how much has been paid for this invoice
            invoice_receipts = receipts.filter(invoice=invoice)
            total_paid_for_invoice = sum(
                float(receipt.paid_amount) for receipt in invoice_receipts
            )

            # Calculate outstanding balance for this invoice
            invoice_balance = float(invoice.total_amount) - total_paid_for_invoice

            # Add invoice as a DEBIT transaction
            ledger_transactions.append(
                {
                    "date": invoice.issue_date.isoformat(),
                    "invoice": f"INV-{invoice.issue_date.year}-{str(invoice.invoice_number).zfill(3)}",
                    "rv": "",  # No receipt voucher for invoices
                    "method": "Invoice",
                    "debit": format_money_with_currency(
                        float(invoice.total_amount)
                    ),  # Full invoice amount as debit
                    "credit": format_money_with_currency(0),  # No credit for invoices
                    "balance": format_money_with_currency(
                        running_balance + float(invoice.total_amount)
                    ),  # Increase balance
                    "description": invoice.description
                    or f"Invoice {invoice.invoice_number}",
                    "payer_name": invoice_recipient_name,  # Invoice recipient (who it's addressed to)
                    "payer_email": invoice_recipient_email,  # Invoice recipient email
                    "tenant_name": tenant_info,
                    "tenant_email": (
                        current_tenant.tenant_user.email if current_tenant else ""
                    ),
                    "outstanding": format_money_with_currency(
                        invoice_balance
                    ),  # Outstanding amount for this invoice
                }
            )
            running_balance += float(invoice.total_amount)  # Increase running balance

        # Process receipts (CREDITS - money received)
        for receipt in receipts:
            # Get payer information
            payer_name = ""
            payer_email = ""

            # Try to get payer from the receipt's invoice tenants
            invoice_tenants = receipt.invoice.tenants.all()
            if invoice_tenants.exists():
                payer = invoice_tenants.first().tenant_user
                payer_name = payer.get_full_name()
                payer_email = payer.email
            elif current_tenant:
                payer_name = current_tenant.tenant_user.get_full_name()
                payer_email = current_tenant.tenant_user.email
            else:
                payer_name = "Unknown Payer"
                payer_email = ""

            # Get tenant information for this receipt
            tenant_info = ""
            if invoice_tenants.exists():
                tenant_names = [
                    tenant.tenant_user.get_full_name() for tenant in invoice_tenants
                ]
                tenant_info = ", ".join(tenant_names)
            elif current_tenant:
                tenant_info = current_tenant.tenant_user.get_full_name()
            else:
                tenant_info = "Unknown Tenant"

            # Add receipt as a CREDIT transaction
            ledger_transactions.append(
                {
                    "date": receipt.payment_date.isoformat(),
                    "invoice": f"INV-{receipt.invoice.invoice_number}",
                    "rv": f"RV-{receipt.payment_date.year}-{str(receipt.receipt_number).zfill(3)}",
                    "method": "Payment",
                    "debit": format_money_with_currency(0),  # No debit for payments
                    "credit": format_money_with_currency(
                        float(receipt.paid_amount)
                    ),  # Payment amount as credit
                    "balance": format_money_with_currency(
                        running_balance - float(receipt.paid_amount)
                    ),  # Decrease balance
                    "description": receipt.notes
                    or f"Payment for Invoice {receipt.invoice.invoice_number}",
                    "payer_name": payer_name,
                    "payer_email": payer_email,
                    "tenant_name": tenant_info,
                    "tenant_email": (
                        current_tenant.tenant_user.email if current_tenant else ""
                    ),
                    "outstanding": format_money_with_currency(
                        0
                    ),  # No outstanding for payments
                }
            )
            running_balance -= float(receipt.paid_amount)  # Decrease running balance

        # Sort by date
        ledger_transactions.sort(key=lambda x: x["date"])

        # Recalculate running balance after sorting to ensure accuracy
        current_balance = 0
        for transaction in ledger_transactions:
            # Parse the formatted amounts back to numbers for calculation
            debit_amount = float(
                transaction["debit"].replace("KES ", "").replace(",", "")
            )
            credit_amount = float(
                transaction["credit"].replace("KES ", "").replace(",", "")
            )
            current_balance += debit_amount - credit_amount
            transaction["balance"] = format_money_with_currency(current_balance)

        return ledger_transactions

    except LocationNode.DoesNotExist:
        return []
    except Exception as e:
        print(f"Error getting ledger data: {str(e)}")
        return []
