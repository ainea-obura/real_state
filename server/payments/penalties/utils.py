from django.utils import timezone
from django.db.models import Sum, Count
from datetime import datetime, timedelta

from payments.models import Penalty
from properties.models import PropertyTenant
from utils.format import format_money_with_currency


def generate_penalty_number():
    """Generate unique penalty number"""
    year = timezone.now().year
    last_penalty = (
        Penalty.objects.filter(penalty_number__startswith=f"PEN-{year}-")
        .order_by("-penalty_number")
        .first()
    )

    if last_penalty:
        last_number = int(last_penalty.penalty_number.split("-")[-1])
        new_number = last_number + 1
    else:
        new_number = 1

    return f"PEN-{year}-{str(new_number).zfill(3)}"


def calculate_penalty_amount(amount):
    """Calculate penalty amount (fixed only)"""
    return amount


def get_penalty_statistics(from_date=None, to_date=None):
    """Get penalty statistics for a date range"""
    queryset = Penalty.objects.all()

    if from_date:
        queryset = queryset.filter(date_applied__gte=from_date)
    if to_date:
        queryset = queryset.filter(date_applied__lte=to_date)

    total_penalties = queryset.count()
    pending_penalties = queryset.filter(status="pending").count()

    # Amount calculations
    total_amount = queryset.aggregate(total=Sum("amount"))["total"] or 0
    waived_amount = (
        queryset.filter(status="waived").aggregate(total=Sum("amount"))["total"] or 0
    )
    applied_amount = (
        queryset.filter(status="applied_to_invoice").aggregate(total=Sum("amount"))[
            "total"
        ]
        or 0
    )
    paid_amount = (
        queryset.filter(status="paid").aggregate(total=Sum("amount"))["total"] or 0
    )

    return {
        "total_penalties": total_penalties,
        "pending_penalties": pending_penalties,
        "total_amount": format_money_with_currency(float(total_amount)),
        "waived_amount": format_money_with_currency(float(waived_amount)),
        "applied_amount": format_money_with_currency(float(applied_amount)),
        "paid_amount": format_money_with_currency(float(paid_amount)),
    }


def get_overdue_penalties():
    """Get penalties that are overdue"""
    today = timezone.now().date()
    return Penalty.objects.filter(due_date__lt=today, status="pending")


def get_tenant_outstanding_balance(tenant_user):
    """Calculate outstanding balance for a tenant"""
    # This would need to be implemented based on your invoice/payment logic
    # For now, returning 0
    return 0.0


def validate_penalty_data(data):
    """Validate penalty data before creation/update"""
    errors = []

    amount = data.get("amount")

    if amount and amount <= 0:
        errors.append("Amount must be greater than 0")

    if data.get("due_date") and data.get("date_applied"):
        due_date = data["due_date"]
        date_applied = data["date_applied"]

        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
        if isinstance(date_applied, str):
            date_applied = datetime.strptime(date_applied, "%Y-%m-%d").date()

        if due_date < date_applied:
            errors.append("Due date cannot be before date applied")

    return errors


def send_penalty_notifications(penalty, notification_type="email"):
    """Send notifications for penalty creation/updates"""
    # This would integrate with your notification system
    # For now, just a placeholder
    pass


def get_default_penalty_settings():
    """Get default penalty settings"""
    return {
        "default_late_payment_amount": format_money_with_currency(50.00),
        "default_returned_payment_amount": format_money_with_currency(25.00),
        "default_lease_violation_amount": format_money_with_currency(100.00),
        "default_utility_overcharge_amount": format_money_with_currency(75.00),
        "grace_period_days": 5,
        "auto_apply_late_fees": True,
        "notify_tenants": True,
        "email_notifications": True,
        "sms_notifications": False,
    }


def can_waive_penalty(penalty, user):
    """Check if a penalty can be waived by the user"""
    # Add your business logic here
    # For example, only certain user types can waive penalties
    return penalty.status == "pending"


def can_delete_penalty(penalty, user):
    """Check if a penalty can be deleted by the user"""
    # Add your business logic here
    return penalty.status == "pending"


def get_penalty_summary_by_type():
    """Get penalty summary grouped by type"""
    return Penalty.objects.values("penalty_type").annotate(
        count=Count("id"), total_amount=Sum("amount")
    )


def get_penalty_summary_by_status():
    """Get penalty summary grouped by status"""
    return Penalty.objects.values("status").annotate(
        count=Count("id"), total_amount=Sum("amount")
    )
