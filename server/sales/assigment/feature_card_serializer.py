from rest_framework import serializers
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import date

from ..models import (
    PropertySale,
    PropertySaleItem,
    PaymentPlan,
    PaymentSchedule,
    SaleCommission,
)
from utils.format import format_money_with_currency


class FeatureCardSerializer(serializers.Serializer):
    """Serializer for feature card data - payment-focused metrics"""

    # Total Sales Value (All Time)
    total_sales_value = serializers.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Total value of all completed property sales",
    )

    # Active Payment Plans
    active_payment_plans = serializers.IntegerField(
        help_text="Count of ongoing installment payment plans"
    )

    # Outstanding Payments
    outstanding_payments = serializers.DecimalField(
        max_digits=20, decimal_places=2, help_text="Total overdue and upcoming payments"
    )

    # Commission Due
    commission_due = serializers.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Total pending agent commission payments",
    )

    # Additional context data
    overdue_payments_count = serializers.IntegerField(
        help_text="Number of overdue payments"
    )

    upcoming_payments_count = serializers.IntegerField(
        help_text="Number of upcoming payments in next 30 days"
    )

    total_payment_plans = serializers.IntegerField(
        help_text="Total number of payment plans (active + completed)"
    )

    def get_feature_card_data(self):
        """Get aggregated data for feature cards"""
        today = timezone.now().date()
        next_month = today + timezone.timedelta(days=30)

        # 1. Total Sales Value (All Time)
        total_sales_value = (
            PropertySaleItem.objects.aggregate(total=Sum("sale_price"))["total"] or 0
        )

        # 2. Active Payment Plans
        active_payment_plans = PaymentPlan.objects.filter(
            payment_type="installments"
        ).count()

        # 3. Outstanding Payments (Pending + Overdue)
        outstanding_payments = (
            PaymentSchedule.objects.filter(status="pending").aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # 4. Commission Due
        commission_due = (
            SaleCommission.objects.filter(status="pending").aggregate(
                total=Sum("commission_amount")
            )["total"]
            or 0
        )

        # 5. Overdue Payments Count
        overdue_payments_count = PaymentSchedule.objects.filter(
            status="pending", due_date__lt=today
        ).count()

        # 6. Upcoming Payments Count (Next 30 days)
        upcoming_payments_count = PaymentSchedule.objects.filter(
            status="pending", due_date__gte=today, due_date__lte=next_month
        ).count()

        # 7. Total Payment Plans
        total_payment_plans = PaymentPlan.objects.count()

        return {
            "total_sales_value": format_money_with_currency(total_sales_value),
            "active_payment_plans": active_payment_plans,
            "outstanding_payments": format_money_with_currency(outstanding_payments),
            "commission_due": format_money_with_currency(commission_due),
            "overdue_payments_count": overdue_payments_count,
            "upcoming_payments_count": upcoming_payments_count,
            "total_payment_plans": total_payment_plans,
        }
