from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import serializers
from dateutil.relativedelta import relativedelta

from properties.models import LocationNode, PropertyTenant, UnitDetail, VillaDetail
from payments.models import Receipt, Expense, Payout, Invoice, Penalty
from utils.format import format_money_with_currency


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""

    def to_representation(self, instance):
        """Calculate and return dashboard stats"""
        today = timezone.now().date()
        thirty_days_from_now = today + relativedelta(days=30)

        # Get all active nodes (not deleted)
        active_nodes = LocationNode.objects.filter(is_deleted=False)

        # Total Properties (all UNIT and HOUSE nodes)
        total_properties = active_nodes.filter(node_type__in=["UNIT", "HOUSE"]).count()

        # Full Management (UNIT and HOUSE with FULL_MANAGEMENT)
        full_management_units = UnitDetail.objects.filter(
            node__is_deleted=False, management_mode="FULL_MANAGEMENT"
        ).count()

        full_management_villas = VillaDetail.objects.filter(
            node__is_deleted=False, management_mode="FULL_MANAGEMENT"
        ).count()

        full_management = full_management_units + full_management_villas

        # Services Only (UNIT and HOUSE with SERVICE_ONLY)
        services_only_units = UnitDetail.objects.filter(
            node__is_deleted=False, management_mode="SERVICE_ONLY"
        ).count()

        services_only_villas = VillaDetail.objects.filter(
            node__is_deleted=False, management_mode="SERVICE_ONLY"
        ).count()

        services_only = services_only_units + services_only_villas

        # Occupancy Rate (rented properties / total properties)
        # Get all properties that have active tenants (not expired contracts)
        rented_properties = PropertyTenant.objects.filter(
            is_deleted=False,
            contract_end__gte=today,
            node__is_deleted=False,
            node__node_type__in=["UNIT", "HOUSE"],
        ).count()

        occupancy_rate = (
            (rented_properties / total_properties * 100) if total_properties > 0 else 0
        )

        # Active Tenants (tenants with active contracts)
        active_tenants = PropertyTenant.objects.filter(
            is_deleted=False, contract_end__gte=today
        ).count()

        # Active Contracts (all non-expired contracts)
        active_contracts = PropertyTenant.objects.filter(
            is_deleted=False, contract_end__gte=today
        ).count()

        # Leases Ending Soon (contracts ending within 30 days)
        leases_ending_soon = PropertyTenant.objects.filter(
            is_deleted=False,
            contract_end__lte=thirty_days_from_now,
            contract_end__gte=today,
        ).count()

        # Expired Leases (contracts that have already expired)
        expired_leases = PropertyTenant.objects.filter(
            is_deleted=False, contract_end__lt=today
        ).count()

        return {
            "error": False,
            "message": "Dashboard stats retrieved successfully",
            "data": {
                "count": 1,  # Total number of stat categories
                "results": [
                    {
                        "totalProperties": total_properties,
                        "fullManagement": full_management,
                        "servicesOnly": services_only,
                        "occupancyRate": round(occupancy_rate, 1),
                        "activeTenants": active_tenants,
                        "activeContracts": active_contracts,
                        "leasesEndingSoon": leases_ending_soon,
                        "expiredLeases": expired_leases,
                    },
                ],
            },
        }


class FinanceSummarySerializer(serializers.Serializer):
    """Serializer for finance summary data"""

    def to_representation(self, instance):
        """Calculate and return finance summary data"""
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year

        # Calculate total received (all receipts in current month)
        total_received = (
            Receipt.objects.filter(
                payment_date__year=current_year,
                payment_date__month=current_month,
                is_deleted=False,
            ).aggregate(total=Sum("paid_amount"))["total"]
            or 0
        )

        # Calculate total expenses (all approved expenses in current month)
        total_expenses = (
            Expense.objects.filter(
                invoice_date__year=current_year,
                invoice_date__month=current_month,
                status__in=["approved", "paid"],
                is_deleted=False,
            ).aggregate(total=Sum("total_amount"))["total"]
            or 0
        )

        # Calculate total payouts (all paid/completed/pending payouts in current month)
        payout_query = Payout.objects.filter(
            month=current_month,
            year=current_year,
            status__in=["completed", "paid", "pending"],
            is_deleted=False,
        )
        total_payouts = payout_query.aggregate(total=Sum("net_amount"))["total"] or 0

        # Debug: Print payout info
        print(f"Current month: {current_month}, year: {current_year}")
        print(f"Payout query count: {payout_query.count()}")
        print(f"All payouts count: {Payout.objects.count()}")
        print(f"All pending payouts: {Payout.objects.filter(status='pending').count()}")
        print(
            f"All completed payouts: {Payout.objects.filter(status='completed').count()}"
        )
        print(f"All paid payouts: {Payout.objects.filter(status='paid').count()}")
        print(
            f"All payout statuses: {list(Payout.objects.values_list('status', flat=True).distinct())}"
        )
        print(f"Total payouts amount: {total_payouts}")

        # Calculate net income
        net_income = total_received - (total_expenses + total_payouts)

        # Generate 12-month chart data for current year (Jan to Dec)
        chart_data = []
        for month in range(1, 13):  # 1 to 12 (Jan to Dec)
            # Get expenses for this month
            month_expenses = (
                Expense.objects.filter(
                    invoice_date__year=current_year,
                    invoice_date__month=month,
                    status__in=["approved", "paid"],
                    is_deleted=False,
                ).aggregate(total=Sum("total_amount"))["total"]
                or 0
            )

            # Get payouts for this month
            month_payouts = (
                Payout.objects.filter(
                    month=month,
                    year=current_year,
                    status__in=["completed", "paid", "pending"],
                    is_deleted=False,
                ).aggregate(total=Sum("net_amount"))["total"]
                or 0
            )

            # Get month name
            month_date = timezone.datetime(current_year, month, 1)
            month_name = month_date.strftime("%b")

            chart_data.append(
                {
                    "month": month_name,
                    "expenses": float(month_expenses),
                    "payouts": float(month_payouts),
                }
            )

        return {
            "error": False,
            "message": "Finance summary retrieved successfully",
            "data": {
                "summary": {
                    "totalReceived": format_money_with_currency(total_received),
                    "totalExpenses": format_money_with_currency(total_expenses),
                    "totalPayouts": format_money_with_currency(total_payouts),
                    "netIncome": format_money_with_currency(net_income),
                },
                "chartData": chart_data,
            },
        }


class RecentTransactionsSerializer(serializers.Serializer):
    """Serializer for recent transactions data"""

    def to_representation(self, instance):
        """Calculate and return recent transactions data"""
        # Get recent invoices (last 10)
        recent_invoices = Invoice.objects.filter(is_deleted=False).order_by(
            "-created_at"
        )[:10]

        # Get recent receipts (last 10)
        recent_receipts = Receipt.objects.filter(is_deleted=False).order_by(
            "-created_at"
        )[:10]

        # Get recent expenses (last 10)
        recent_expenses = Expense.objects.filter(is_deleted=False).order_by(
            "-created_at"
        )[:10]

        # Get recent payouts (last 10)
        recent_payouts = Payout.objects.filter(is_deleted=False).order_by(
            "-created_at"
        )[:10]

        transactions = []

        # Add invoices
        for invoice in recent_invoices:
            transactions.append(
                {
                    "id": str(invoice.id),
                    "type": "invoice",
                    "title": f"Invoice #{invoice.invoice_number}",
                    "amount": format_money_with_currency(invoice.total_amount),
                    "status": invoice.status.lower(),
                    "date": invoice.issue_date.isoformat(),
                    "property": invoice.property.name if invoice.property else None,
                    "invoice_number": str(invoice.invoice_number),
                }
            )

        # Add receipts
        for receipt in recent_receipts:
            transactions.append(
                {
                    "id": str(receipt.id),
                    "type": "receipt",
                    "title": f"Payment - Invoice #{receipt.invoice.invoice_number}",
                    "amount": format_money_with_currency(receipt.paid_amount),
                    "status": "completed",
                    "date": receipt.payment_date.isoformat(),
                    "property": (
                        receipt.invoice.property.name
                        if receipt.invoice.property
                        else None
                    ),
                    "receipt_number": str(receipt.receipt_number),
                }
            )

        # Add expenses
        for expense in recent_expenses:
            transactions.append(
                {
                    "id": str(expense.id),
                    "type": "expense",
                    "title": f"Expense - To {expense.vendor.name if expense.vendor else 'Vendor'}",
                    "amount": format_money_with_currency(
                        -expense.total_amount
                    ),  # Negative for expenses
                    "status": expense.status.lower(),
                    "date": expense.invoice_date.isoformat(),
                    "property": (
                        expense.location_node.name if expense.location_node else None
                    ),
                    "vendor": expense.vendor.name if expense.vendor else None,
                    "expense_number": str(expense.expense_number),
                }
            )

        # Add payouts
        for payout in recent_payouts:
            transactions.append(
                {
                    "id": str(payout.id),
                    "type": "payout",
                    "title": f"Payout - {payout.owner.get_full_name() if payout.owner else 'Owner'}",
                    "amount": format_money_with_currency(
                        -payout.net_amount
                    ),  # Negative for payouts
                    "status": payout.status.lower(),
                    "date": payout.created_at.isoformat(),
                    "property": (
                        payout.property_node.name if payout.property_node else None
                    ),
                    "payout_number": payout.payout_number,
                }
            )

        # Sort by date (most recent first) and take top 10
        transactions.sort(key=lambda x: x["date"], reverse=True)
        transactions = transactions[:10]

        return {
            "error": False,
            "message": "Recent transactions retrieved successfully",
            "data": {
                "transactions": transactions,
            },
        }


class AlertsSerializer(serializers.Serializer):
    """Serializer for alerts data"""

    def to_representation(self, instance):
        """Calculate and return alerts data"""
        from django.utils import timezone
        from datetime import timedelta

        alerts = []
        today = timezone.now().date()

        # Get pending penalties (last 5)
        pending_penalties = Penalty.objects.filter(
            status__in=["pending", "applied_to_invoice"], is_deleted=False
        ).order_by("-created_at")[:5]

        for penalty in pending_penalties:
            # Calculate days overdue
            days_overdue = 0
            if penalty.due_date:
                days_overdue = (today - penalty.due_date).days

            # Determine priority based on days overdue
            if days_overdue > 30:
                priority = "urgent"
            elif days_overdue > 15:
                priority = "high"
            elif days_overdue > 7:
                priority = "medium"
            else:
                priority = "low"

            alerts.append(
                {
                    "id": str(penalty.id),
                    "type": "penalty",
                    "title": f"Late Payment Penalty",
                    "description": f"Penalty for late rent payment - {penalty.get_penalty_type_display()}",
                    "priority": priority,
                    "date": (
                        penalty.date_applied.isoformat()
                        if penalty.date_applied
                        else penalty.created_at.isoformat()
                    ),
                    "count": 1,
                    "amount": format_money_with_currency(penalty.amount),
                    "penalty_number": penalty.penalty_number,
                    "tenant_name": (
                        penalty.property_tenant.tenant_user.get_full_name()
                        if penalty.property_tenant
                        and penalty.property_tenant.tenant_user
                        else "Unknown Tenant"
                    ),
                    "property_name": (
                        penalty.property_tenant.node.name
                        if penalty.property_tenant
                        else "Unknown Property"
                    ),
                }
            )

        # Get overdue invoices (last 5)
        overdue_invoices = Invoice.objects.filter(
            status="OVERDUE", is_deleted=False
        ).order_by("-created_at")[:5]

        for invoice in overdue_invoices:
            # Calculate days overdue
            days_overdue = (today - invoice.due_date).days

            # Determine priority based on days overdue
            if days_overdue > 30:
                priority = "urgent"
            elif days_overdue > 15:
                priority = "high"
            elif days_overdue > 7:
                priority = "medium"
            else:
                priority = "low"

            # Get tenant name from the first tenant
            tenant_name = "Unknown Tenant"
            if invoice.tenants.exists():
                first_tenant = invoice.tenants.first()
                tenant_name = first_tenant.tenant_user.get_full_name()

            alerts.append(
                {
                    "id": str(invoice.id),
                    "type": "overdue_invoice",
                    "title": f"Overdue Invoice",
                    "description": f"Rent payment overdue for {days_overdue} days",
                    "priority": priority,
                    "date": invoice.issue_date.isoformat(),
                    "count": 1,
                    "amount": format_money_with_currency(invoice.balance),
                    "days_overdue": days_overdue,
                    "invoice_number": str(invoice.invoice_number),
                    "tenant_name": tenant_name,
                    "property_name": invoice.property.name,
                }
            )

        # Sort by priority (urgent first) and date (most recent first)
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        alerts.sort(
            key=lambda x: (priority_order.get(x["priority"], 4), x["date"]),
            reverse=True,
        )

        # Take top 5 most important alerts
        alerts = alerts[:5]

        return {
            "error": False,
            "message": "Alerts retrieved successfully",
            "data": {
                "alerts": alerts,
            },
        }
