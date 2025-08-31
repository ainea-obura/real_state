from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
from datetime import date

from ..models import (
    PropertySale,
    PropertySaleItem,
    PaymentPlan,
    PaymentSchedule,
)
from accounts.models import Users
from properties.models import LocationNode


class InstallmentTableSerializer(serializers.Serializer):
    """Serializer for installments table data - shows all installments for a specific sale"""

    # Basic identification
    id = serializers.UUIDField(help_text="Unique identifier for the installment")
    payment_number = serializers.IntegerField(help_text="Sequential payment number")

    # Owner Information
    ownerId = serializers.UUIDField(help_text="Owner's user ID")
    ownerName = serializers.CharField(help_text="Owner's full name")
    ownerEmail = serializers.CharField(help_text="Owner's email address")
    ownerPhone = serializers.CharField(help_text="Owner's phone number")

    # Property Information
    projectName = serializers.CharField(help_text="Project name")
    propertyName = serializers.CharField(help_text="Property/unit name")
    ownershipPercentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="Owner's ownership percentage"
    )

    # Payment Details
    dueDate = serializers.DateField(help_text="Date when payment is due")
    amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, help_text="Amount due for this payment"
    )

    # Payment Status
    status = serializers.CharField(
        help_text="Payment status: pending, paid, overdue, cancelled"
    )

    # Payment Tracking
    paidDate = serializers.DateField(
        required=False, allow_null=True, help_text="Date when payment was received"
    )
    paidAmount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Actual amount paid",
    )

    # Late Fees
    lateFee = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Late fee applied if payment is overdue",
    )

    # Days Overdue
    daysOverdue = serializers.IntegerField(
        default=0, help_text="Number of days overdue (0 if not overdue)"
    )

    # Notes
    notes = serializers.CharField(
        required=False, allow_null=True, help_text="Additional notes about this payment"
    )

    def get_installments_data(self, sale_item_id, page=1, page_size=10):
        """Get all installments for a specific sale item (PropertySaleItem) in table format with pagination"""
        today = timezone.now().date()

        try:
            # Get the sale item and verify it exists
            sale_item = PropertySaleItem.objects.get(id=sale_item_id)
        except PropertySaleItem.DoesNotExist:
            return [], 0

        # Get the sale from the sale item
        sale = sale_item.sale

        # Get all sale items for this sale (for consistency with existing logic)
        sale_items = (
            PropertySaleItem.objects.filter(sale=sale)
            .select_related("buyer", "property_node", "payment_plan")
            .prefetch_related("payment_plan__payment_schedule")
        )

        installments_data = []

        for sale_item in sale_items:
            try:
                payment_plan = sale_item.payment_plan
            except PaymentPlan.DoesNotExist:
                continue

            if not payment_plan or payment_plan.payment_type == "full":
                # For full payment, create a single installment record
                installment_data = {
                    "id": str(sale_item.id),
                    "payment_number": 1,
                    "ownerId": str(sale_item.id),
                    "ownerName": sale_item.buyer.get_full_name(),
                    "ownerEmail": sale_item.buyer.email,
                    "ownerPhone": sale_item.buyer.phone or "N/A",
                    "projectName": self._get_project_name(sale_item.property_node),
                    "propertyName": sale_item.property_node.name,
                    "ownershipPercentage": (
                        float(sale_item.ownership_percentage)
                        if sale_item.ownership_percentage
                        else 0.0
                    ),
                    "dueDate": (
                        sale_item.created_at.date() if sale_item.created_at else None
                    ),
                    "amount": sale_item.sale_price if sale_item.sale_price else 0,
                    "status": (
                        "paid"
                        if sale_item.down_payment
                        and sale_item.sale_price
                        and sale_item.down_payment >= sale_item.sale_price
                        else "pending"
                    ),
                    "paidDate": (
                        sale_item.created_at.date()
                        if sale_item.created_at
                        and sale_item.down_payment
                        and sale_item.sale_price
                        and sale_item.down_payment >= sale_item.sale_price
                        else None
                    ),
                    "paidAmount": (
                        sale_item.down_payment
                        if sale_item.down_payment
                        and sale_item.sale_price
                        and sale_item.down_payment >= sale_item.sale_price
                        else None
                    ),
                    "lateFee": 0,
                    "daysOverdue": 0,
                    "notes": "Full payment",
                }
                installments_data.append(installment_data)
                continue

            # For installment plans, get all payment schedules
            payment_schedules = payment_plan.payment_schedule.all().order_by(
                "payment_number"
            )

            for schedule in payment_schedules:
                # Calculate days overdue
                days_overdue = 0
                if (
                    schedule.status != "paid"
                    and schedule.due_date
                    and schedule.due_date < today
                ):
                    days_overdue = (today - schedule.due_date).days

                installment_data = {
                    "id": str(sale_item.id),
                    "payment_number": schedule.payment_number,
                    "ownerId": str(sale_item.id),
                    "ownerName": sale_item.buyer.get_full_name(),
                    "ownerEmail": sale_item.buyer.email,
                    "ownerPhone": sale_item.buyer.phone or "N/A",
                    "projectName": self._get_project_name(sale_item.property_node),
                    "propertyName": sale_item.property_node.name,
                    "ownershipPercentage": (
                        float(sale_item.ownership_percentage)
                        if sale_item.ownership_percentage
                        else 0.0
                    ),
                    "dueDate": schedule.due_date if schedule.due_date else None,
                    "amount": schedule.amount if schedule.amount else 0,
                    "status": schedule.status,
                    "paidDate": schedule.paid_date if schedule.paid_date else None,
                    "paidAmount": schedule.paid_amount,
                    "lateFee": float(schedule.late_fee) if schedule.late_fee else 0.0,
                    "daysOverdue": days_overdue,
                    "notes": schedule.notes or "",
                }
                installments_data.append(installment_data)

        # Apply pagination
        total_count = len(installments_data)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        # Get paginated data
        paginated_data = installments_data[start_index:end_index]

        return paginated_data, total_count

    def get_installments_count(self, sale_item_id):
        """Get just the count of installments for a specific sale item (for summary)"""
        today = timezone.now().date()

        try:
            # Get the sale item and verify it exists
            sale_item = PropertySaleItem.objects.get(id=sale_item_id)
        except PropertySaleItem.DoesNotExist:
            return 0

        # Get the sale from the sale item
        sale = sale_item.sale

        # Get all sale items for this sale
        sale_items = (
            PropertySaleItem.objects.filter(sale=sale)
            .select_related("buyer", "property_node", "payment_plan")
            .prefetch_related("payment_plan__payment_schedule")
        )

        total_count = 0

        for sale_item in sale_items:
            try:
                payment_plan = sale_item.payment_plan
            except PaymentPlan.DoesNotExist:
                continue

            if not payment_plan or payment_plan.payment_type == "full":
                total_count += 1
                continue

            # For installment plans, count all payment schedules
            payment_schedules = payment_plan.payment_schedule.all()
            total_count += payment_schedules.count()

        return total_count

    def _get_project_name(self, property_node):
        """Get project name from property node"""
        # Navigate up to find project
        current = property_node
        while current and current.node_type != "PROJECT":
            current = current.parent
        return current.name if current else "Unknown Project"
