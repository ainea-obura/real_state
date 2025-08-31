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
from accounts.models import Users
from properties.models import LocationNode


class OwnerPropertyTableSerializer(serializers.Serializer):
    """Serializer for owner property table data - aggregates data from multiple models"""

    # Basic identification
    id = serializers.UUIDField(help_text="Unique identifier for the table row")
    ownerId = serializers.UUIDField(help_text="Owner's user ID")

    # Owner Information
    ownerName = serializers.CharField(help_text="Owner's full name")
    ownerEmail = serializers.CharField(help_text="Owner's email address")
    ownerPhone = serializers.CharField(help_text="Owner's phone number")
    ownerPhoto = serializers.CharField(
        required=False, allow_null=True, help_text="Owner's profile photo URL"
    )

    # Property Information
    projectName = serializers.CharField(help_text="Project name")
    propertyName = serializers.CharField(help_text="Property/unit name")
    ownershipPercentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="Owner's ownership percentage"
    )
    coOwners = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of co-owner names",
    )

    # Sales Person
    assignedSalesPerson = serializers.DictField(
        help_text="Assigned sales person information including name, employee_id, email, phone, and status"
    )

    # Status
    status = serializers.CharField(
        help_text="Payment status: on-track, behind, at-risk, completed"
    )

    # Installment Plan
    installmentPlan = serializers.DictField(help_text="Payment plan details")

    # Activity and History
    lastActivity = serializers.CharField(help_text="Last activity date")
    paymentHistory = serializers.DictField(help_text="Payment history information")

    def get_table_data(self, filters=None):
        """Get aggregated data for the owner property table with optional filtering"""
        today = timezone.now().date()

        # Get all property sale items with related data
        sale_items = PropertySaleItem.objects.select_related(
            "sale", "buyer", "property_node", "sale__assigned_sales_person__user"
        ).prefetch_related("payment_plan__payment_schedule")

        # Apply filters if provided
        if filters:
            sale_items = self._apply_filters(sale_items, filters)

        table_data = []

        for sale_item in sale_items:
            # Get payment plan for this sale item
            try:
                payment_plan = sale_item.payment_plan
            except PaymentPlan.DoesNotExist:
                payment_plan = None

            # Calculate payment plan details
            installment_plan = self._calculate_installment_plan(sale_item, payment_plan)

            # Determine status
            status = self._determine_status(sale_item, payment_plan, today)

            # Get payment history
            payment_history = self._get_payment_history(payment_plan, today)

            # Get co-owners if any
            co_owners = self._get_co_owners(sale_item)

            # Get sales person
            sales_person_info = self._get_sales_person(sale_item.sale)

            # Get last activity
            last_activity = self._get_last_activity(sale_item, payment_plan)

            # Create table row data
            row_data = {
                "id": str(sale_item.id),
                "ownerId": str(sale_item.buyer.id),
                "ownerName": sale_item.buyer.get_full_name(),
                "ownerEmail": sale_item.buyer.email,
                "ownerPhone": sale_item.buyer.phone or "N/A",
                "ownerPhoto": (
                    sale_item.buyer.avatar.url if sale_item.buyer.avatar else None
                ),
                "projectName": self._get_project_name(sale_item.property_node),
                "propertyName": sale_item.property_node.name,
                "ownershipPercentage": float(sale_item.ownership_percentage),
                "coOwners": co_owners,
                "assignedSalesPerson": sales_person_info,
                "status": status,
                "installmentPlan": installment_plan,
                "lastActivity": last_activity,
                "paymentHistory": payment_history,
            }

            table_data.append(row_data)

        return table_data

    def _calculate_installment_plan(self, sale_item, payment_plan):
        """Calculate installment plan details"""
        if not payment_plan or payment_plan.payment_type == "full":
            return {
                "totalAmount": float(sale_item.sale_price),
                "paidAmount": float(sale_item.sale_price),
                "remainingAmount": 0,
                "nextDueDate": "N/A",
                "nextDueAmount": 0,
                "totalInstallments": 0,
                "completedInstallments": 0,
            }

        # Get payment schedule
        payment_schedules = payment_plan.payment_schedule.all().order_by(
            "payment_number"
        )

        total_amount = float(sale_item.sale_price) if sale_item.sale_price else 0.0
        down_payment = float(sale_item.down_payment) if sale_item.down_payment else 0.0
        remaining_amount = total_amount - down_payment

        # Calculate paid and remaining
        paid_schedules = payment_schedules.filter(status="paid")
        paid_amount = down_payment + sum(
            float(s.amount) if s.amount else 0.0 for s in paid_schedules
        )

        # Find next due payment - any unpaid installment
        next_due = (
            payment_schedules.exclude(status="paid").order_by("payment_number").first()
        )
        next_due_date = (
            next_due.due_date.strftime("%Y-%m-%d")
            if next_due and next_due.due_date
            else "N/A"
        )
        next_due_amount = (
            float(next_due.amount) if next_due and next_due.amount else 0.0
        )

        return {
            "totalAmount": total_amount,
            "paidAmount": paid_amount,
            "remainingAmount": total_amount - paid_amount,
            "nextDueDate": next_due_date,
            "nextDueAmount": next_due_amount,
            "totalInstallments": payment_plan.installment_count or 0,
            "completedInstallments": paid_schedules.count(),
        }

    def _determine_status(self, sale_item, payment_plan, today):
        """Determine the payment status"""
        if not payment_plan or payment_plan.payment_type == "full":
            return "completed"

        # Check for overdue payments
        overdue_payments = payment_plan.payment_schedule.filter(
            status__in=["pending", "overdue"], due_date__lt=today
        )

        if overdue_payments.exists():
            overdue_count = overdue_payments.count()
            if overdue_count >= 3:
                return "at-risk"
            elif overdue_count >= 1:
                return "behind"

        # Check if on track
        total_payments = payment_plan.payment_schedule.count()
        paid_payments = payment_plan.payment_schedule.filter(status="paid").count()

        if total_payments > 0:
            progress = (paid_payments / total_payments) * 100
            if progress >= 80:
                return "completed"
            elif progress >= 50:
                return "on-track"

        return "on-track"

    def _get_payment_history(self, payment_plan, today):
        """Get payment history information"""
        if not payment_plan:
            return {
                "lastPaymentDate": "N/A",
                "lastPaymentAmount": 0,
                "missedPayments": 0,
            }

        # Get last payment
        last_paid = (
            payment_plan.payment_schedule.filter(status="paid")
            .order_by("-paid_date")
            .first()
        )
        last_payment_date = (
            last_paid.paid_date.strftime("%Y-%m-%d") if last_paid else "N/A"
        )
        last_payment_amount = (
            float(last_paid.paid_amount) if last_paid and last_paid.paid_amount else 0.0
        )

        # Count missed payments
        missed_payments = payment_plan.payment_schedule.filter(
            status__in=["pending", "overdue"], due_date__lt=today
        ).count()

        return {
            "lastPaymentDate": last_payment_date,
            "lastPaymentAmount": last_payment_amount,
            "missedPayments": missed_payments,
        }

    def _get_co_owners(self, sale_item):
        """Get co-owners for the same property"""
        if sale_item.ownership_percentage >= 100:
            return []

        # Find other owners of the same property in the same sale
        co_owners = PropertySaleItem.objects.filter(
            sale=sale_item.sale, property_node=sale_item.property_node
        ).exclude(id=sale_item.id)

        return [item.buyer.get_full_name() for item in co_owners]

    def _get_sales_person(self, sale):
        """Get assigned sales person information"""
        if sale.assigned_sales_person:
            sales_person = sale.assigned_sales_person
            return {
                "name": sales_person.get_full_name(),
                "employee_id": sales_person.employee_id,
                "email": sales_person.get_email(),
                "phone": sales_person.get_phone(),
                "is_active": sales_person.is_active,
                "is_available": sales_person.is_available,
            }
        return {
            "name": "Unassigned",
            "employee_id": "N/A",
            "email": "N/A",
            "phone": "N/A",
            "is_active": False,
            "is_available": False,
        }

    def _get_project_name(self, property_node):
        """Get project name from property node"""
        # Navigate up to find project
        current = property_node
        while current and current.node_type != "PROJECT":
            current = current.parent
        return current.name if current else "Unknown Project"

    def _get_last_activity(self, sale_item, payment_plan):
        """Get last activity date"""
        if not payment_plan:
            return (
                sale_item.created_at.strftime("%Y-%m-%d")
                if sale_item.created_at
                else "N/A"
            )

        # Check last payment date
        last_payment = (
            payment_plan.payment_schedule.filter(status="paid")
            .order_by("-paid_date")
            .first()
        )
        if last_payment and last_payment.paid_date:
            return last_payment.paid_date.strftime("%Y-%m-%d")

        # Check next due date
        next_due = (
            payment_plan.payment_schedule.filter(status="pending")
            .order_by("due_date")
            .first()
        )
        if next_due and next_due.due_date:
            return next_due.due_date.strftime("%Y-%m-%d")

        return (
            sale_item.created_at.strftime("%Y-%m-%d") if sale_item.created_at else "N/A"
        )

    def _apply_filters(self, queryset, filters):
        """Apply filters to the queryset"""
        if filters.get("search"):
            search_term = filters["search"]
            queryset = queryset.filter(
                Q(buyer__first_name__icontains=search_term)
                | Q(buyer__last_name__icontains=search_term)
                | Q(buyer__email__icontains=search_term)
                | Q(property_node__name__icontains=search_term)
            )

        if filters.get("owner"):
            owner_name = filters["owner"]
            queryset = queryset.filter(
                Q(buyer__first_name__icontains=owner_name)
                | Q(buyer__last_name__icontains=owner_name)
            )

        if filters.get("project"):
            project_name = filters["project"]
            # Filter by project name by navigating up the tree
            queryset = queryset.filter(
                Q(property_node__name__icontains=project_name)
                | Q(property_node__parent__name__icontains=project_name)
                | Q(property_node__parent__parent__name__icontains=project_name)
            )

        return queryset
