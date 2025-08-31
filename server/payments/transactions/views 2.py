from rest_framework import views, response, status
from payments.models import Invoice, Expense, Receipt, Payout
from accounts.models import Users
from datetime import date
from .serializers import UnifiedTransactionSerializer
from utils.currency import get_serialized_default_currency
from utils.format import format_money_with_currency
from properties.models import LocationNode
from django.db.models import Sum, Q
from datetime import timedelta
from django.utils.dateparse import parse_date
from django.utils import timezone
from datetime import datetime


def get_location_path(node):
    if not node:
        return None
    path = []
    while node:
        path.append(node.name)
        node = node.parent
    return " / ".join(reversed(path))


# --- Aggregation View ---
class TransactionsAggregateView(views.APIView):
    def get(self, request):
        transactions = []
        now = date.today()
        default_currency = get_serialized_default_currency()
        # --- Date Range Filtering ---
        date_from_str = request.query_params.get("date_from")
        date_to_str = request.query_params.get("date_to")
        date_from = parse_date(date_from_str) if date_from_str else None
        date_to = parse_date(date_to_str) if date_to_str else None
        if date_from:
            date_from = timezone.make_aware(
                datetime.combine(date_from, datetime.min.time())
            )
        if date_to:
            date_to = timezone.make_aware(
                datetime.combine(date_to, datetime.max.time())
            )
        date_filter = {}
        if date_from:
            date_filter["created_at__gte"] = date_from
        if date_to:
            date_filter["created_at__lte"] = date_to
        # --- Summary Calculations ---
        today = now
        seven_days = today + timedelta(days=7)
        # Total Income: sum of all PAID invoices
        total_income = (
            Invoice.objects.filter(status="PAID", **date_filter).aggregate(
                total=Sum("total_amount")
            )["total"]
            or 0
        )
        # Outstanding: sum of all invoices not PAID, PARTIAL, or OVERDUE
        outstanding = (
            Invoice.objects.exclude(status__in=["PAID", "PARTIAL", "OVERDUE"])
            .filter(**date_filter)
            .aggregate(total=Sum("total_amount"))["total"]
            or 0
        )
        # Overdue: sum of all invoices due before today and not PAID
        overdue = (
            Invoice.objects.filter(due_date__lt=today, **date_filter)
            .exclude(status="PAID")
            .aggregate(total=Sum("total_amount"))["total"]
            or 0
        )
        # Upcoming: sum of all invoices due in next 7 days and not PAID or PARTIAL
        upcoming = (
            Invoice.objects.filter(
                due_date__gte=today, due_date__lte=seven_days, **date_filter
            )
            .exclude(status__in=["PAID", "PARTIAL"])
            .aggregate(total=Sum("total_amount"))["total"]
            or 0
        )
        # Expenses: sum of all paid expenses and all completed payouts
        expenses_total = (
            Expense.objects.filter(status="paid", **date_filter).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        ) + (
            Payout.objects.filter(status="completed", **date_filter).aggregate(
                total=Sum("net_amount")
            )["total"]
            or 0
        )
        summary = {
            "total_income": format_money_with_currency(total_income),
            "outstanding": format_money_with_currency(outstanding),
            "overdue": format_money_with_currency(overdue),
            "upcoming": format_money_with_currency(upcoming),
            "expenses": format_money_with_currency(expenses_total),
        }
        # --- Aggregate Invoices (Tenants & Owners) ---
        invoices = (
            Invoice.objects.filter(**date_filter)
            .select_related("property")
            .prefetch_related("tenants", "owners")
        )
        for inv in invoices:
            # Tenant-side invoice
            for tenant in inv.tenants.all():
                tenant_obj = tenant.tenant_user
                tenant_data = (
                    {
                        "name": tenant_obj.get_full_name() if tenant_obj else None,
                        "email": tenant_obj.email if tenant_obj else None,
                        "phone": tenant_obj.phone if tenant_obj else None,
                    }
                    if tenant_obj
                    else None
                )
                unit = tenant.node.name if tenant.node else None
                property_name = (
                    get_location_path(inv.property) if inv.property else None
                )
                amount = format_money_with_currency(inv.total_amount)
                transactions.append(
                    {
                        "id": str(inv.id),
                        "created_at": getattr(inv, "created_at", inv.issue_date),
                        "date": inv.issue_date,
                        "tenant": tenant_data,
                        "owners": [],
                        "agents": [],
                        "vendors": [],
                        "unit": unit,
                        "property": property_name,
                        "type": "INV",
                        "reference": f"{inv.invoice_number}",
                        "amount": amount,
                        "status": inv.status,
                        "method": None,
                        "notes": inv.description,
                    }
                )
            # Owner-side invoice
            for owner in inv.owners.all():
                owner_obj = owner.owner_user
                owner_data = (
                    {
                        "name": owner_obj.get_full_name() if owner_obj else None,
                        "email": owner_obj.email if owner_obj else None,
                        "phone": owner_obj.phone if owner_obj else None,
                    }
                    if owner_obj
                    else None
                )
                property_name = (
                    get_location_path(inv.property) if inv.property else None
                )
                amount = format_money_with_currency(inv.total_amount)
                transactions.append(
                    {
                        "id": str(inv.id),
                        "created_at": getattr(inv, "created_at", inv.issue_date),
                        "date": inv.issue_date,
                        "tenant": None,
                        "owners": [owner_data] if owner_data else [],
                        "agents": [],
                        "vendors": [],
                        "unit": None,
                        "property": property_name,
                        "type": "INV",
                        "reference": f"{inv.invoice_number}",
                        "amount": amount,
                        "status": inv.status,
                        "method": None,
                        "notes": inv.description,
                    }
                )
        # --- Aggregate Receipts (Tenants & Owners) ---
        receipts = Receipt.objects.filter(**date_filter).select_related("invoice")
        for rcpt in receipts:
            invoice = rcpt.invoice
            # Tenant-side receipt
            for tenant in invoice.tenants.all():
                tenant_obj = tenant.tenant_user
                tenant_data = (
                    {
                        "name": tenant_obj.get_full_name() if tenant_obj else None,
                        "email": tenant_obj.email if tenant_obj else None,
                        "phone": tenant_obj.phone if tenant_obj else None,
                    }
                    if tenant_obj
                    else None
                )
                unit = tenant.node.name if tenant.node else None
                property_name = (
                    get_location_path(invoice.property) if invoice.property else None
                )
                amount = format_money_with_currency(rcpt.paid_amount)
                transactions.append(
                    {
                        "id": str(rcpt.id),
                        "created_at": getattr(rcpt, "created_at", rcpt.payment_date),
                        "date": rcpt.payment_date.date(),
                        "tenant": tenant_data,
                        "owners": [],
                        "agents": [],
                        "vendors": [],
                        "unit": unit,
                        "property": property_name,
                        "type": "RV",
                        "reference": f"{rcpt.receipt_number}",
                        "amount": amount,
                        "status": "PAID",
                        "method": None,
                        "notes": rcpt.notes,
                    }
                )
            # Owner-side receipt
            for owner in invoice.owners.all():
                owner_obj = owner.owner_user
                owner_data = (
                    {
                        "name": owner_obj.get_full_name() if owner_obj else None,
                        "email": owner_obj.email if owner_obj else None,
                        "phone": owner_obj.phone if owner_obj else None,
                    }
                    if owner_obj
                    else None
                )
                property_name = (
                    get_location_path(invoice.property) if invoice.property else None
                )
                amount = format_money_with_currency(rcpt.paid_amount)
                transactions.append(
                    {
                        "id": str(rcpt.id),
                        "created_at": getattr(rcpt, "created_at", rcpt.payment_date),
                        "date": rcpt.payment_date.date(),
                        "tenant": None,
                        "owners": [owner_data] if owner_data else [],
                        "agents": [],
                        "vendors": [],
                        "unit": None,
                        "property": property_name,
                        "type": "RV",
                        "reference": f"{rcpt.receipt_number}",
                        "amount": amount,
                        "status": "PAID",
                        "method": None,
                        "notes": rcpt.notes,
                    }
                )
        # --- Aggregate Expenses (Vendors) ---
        expenses = Expense.objects.filter(**date_filter).select_related(
            "location_node", "vendor", "service"
        )
        for exp in expenses:
            vendor_data = []
            if exp.vendor:
                vendor_data.append(
                    {
                        "name": exp.vendor.name,
                        "email": exp.vendor.email,
                        "phone": exp.vendor.phone,
                    }
                )
            amount = format_money_with_currency(exp.amount)
            transactions.append(
                {
                    "id": str(exp.id),
                    "created_at": getattr(exp, "created_at", exp.invoice_date),
                    "date": exp.invoice_date,
                    "tenant": None,
                    "owners": [],
                    "agents": [],
                    "vendors": vendor_data,
                    "unit": None,
                    "property": (
                        get_location_path(exp.location_node)
                        if exp.location_node
                        else None
                    ),
                    "type": "PV",
                    "reference": f"{exp.expense_number}",
                    "amount": amount,
                    "status": exp.status,
                    "method": exp.payment_method,
                    "notes": exp.notes,
                }
            )
        # --- Aggregate Payouts (Owners) ---
        payouts = Payout.objects.filter(**date_filter).select_related(
            "owner", "property_node"
        )
        for payout in payouts:
            owner_obj = payout.owner
            owner_data = (
                {
                    "name": owner_obj.get_full_name() if owner_obj else None,
                    "email": owner_obj.email if owner_obj else None,
                    "phone": owner_obj.phone if owner_obj else None,
                }
                if owner_obj
                else None
            )
            property_name = (
                get_location_path(payout.property_node)
                if payout.property_node
                else None
            )
            amount = format_money_with_currency(payout.net_amount)
            transactions.append(
                {
                    "id": str(payout.id),
                    "created_at": getattr(payout, "created_at", payout.payout_date),
                    "date": payout.created_at.date(),
                    "tenant": None,
                    "owners": [owner_data] if owner_data else [],
                    "agents": [],
                    "vendors": [],
                    "unit": None,
                    "property": property_name,
                    "type": "PV",
                    "reference": payout.payout_number,
                    "amount": amount,
                    "status": payout.status,
                    "method": None,
                    "notes": payout.notes,
                }
            )
        # --- Sort by latest created_at descending ---
        transactions = [t for t in transactions if t.get("created_at") is not None]
        transactions.sort(key=lambda t: t["created_at"], reverse=True)
        # --- Response Format ---
        for t in transactions:
            t.pop("created_at", None)
        return response.Response(
            {
                "error": False,
                "data": {
                    "count": len(transactions),
                    "results": UnifiedTransactionSerializer(
                        transactions, many=True
                    ).data,
                    "summary": summary,
                },
            },
            status=status.HTTP_200_OK,
        )
