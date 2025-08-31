from rest_framework import serializers
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import date, timedelta

from ..models import (
    PropertySale,
    PropertySaleItem,
    PaymentPlan,
    PaymentSchedule,
    SaleCommission,
    SalesPerson,
)
from properties.models import UnitDetail, LocationNode
from utils.format import format_money_with_currency


class DashboardSerializer(serializers.Serializer):
    """Serializer for sales dashboard data - unit status and revenue metrics"""

    # Feature Cards Data
    total_listings = serializers.IntegerField(
        help_text="Count of units available for sale"
    )
    
    sold_units = serializers.IntegerField(
        help_text="Count of units sold"
    )
    
    total_revenue = serializers.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Total revenue collected from completed sales"
    )
    
    outstanding_payments = serializers.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Total outstanding payments from completed sales"
    )

    # Monthly Finance Data
    finance_series = serializers.ListField(
        child=serializers.DictField(),
        help_text="Monthly revenue data for chart"
    )

    # Sales Team Data
    salespeople = serializers.ListField(
        child=serializers.DictField(),
        help_text="Sales team performance metrics"
    )

    def get_dashboard_data(self, start_date=None, end_date=None):
        """Get aggregated data for the sales dashboard with optional date filtering"""
        today = timezone.now().date()
        
        # Set default date range if not provided
        if not start_date:
            start_date = today - timedelta(days=365)  # Last 12 months
        if not end_date:
            end_date = today

        # 1. Unit Status Counts
        unit_counts = self._get_unit_counts()
        
        # 2. Revenue Data
        revenue_data = self._get_revenue_data(start_date, end_date)
        
        # 3. Monthly Finance Series
        finance_series = self._get_finance_series(start_date, end_date)
        
        # 4. Sales Team Data
        salespeople = self._get_salespeople_data()

        return {
            "total_listings": unit_counts["available"],
            "sold_units": unit_counts["sold"],
            "total_revenue": revenue_data["total_collected"],
            "outstanding_payments": revenue_data["total_outstanding"],
            "finance_series": finance_series,
            "salespeople": salespeople,
        }

    def _get_unit_counts(self):
        """Get counts of units by status"""
        # Get units for sale
        units_for_sale = UnitDetail.objects.filter(
            management_status="for_sale"
        )
        
        # Count by status
        available_count = units_for_sale.filter(status="available").count()
        sold_count = units_for_sale.filter(status="sold").count()
        
        # Count booked units (units with pending sales)
        booked_count = PropertySaleItem.objects.filter(
            sale__status="pending",
            property_node__node_type="UNIT"
        ).count()
        
        return {
            "available": available_count - booked_count,  # Available minus booked
            "sold": sold_count,
            "booked": booked_count,
        }

    def _get_revenue_data(self, start_date, end_date):
        """Get revenue data for the specified date range"""
        # Get completed sales only
        completed_sales = PropertySale.objects.filter(
            status="completed",
            sale_date__range=[start_date, end_date]
        )
        
        # Get payment schedules for completed sales
        payment_schedules = PaymentSchedule.objects.filter(
            payment_plan__sale_item__sale__in=completed_sales
        )
        
        # Total collected revenue
        total_collected = payment_schedules.filter(
            status="paid",
            paid_date__range=[start_date, end_date]
        ).aggregate(total=Sum("paid_amount"))["total"] or 0
        
        # Total outstanding payments
        total_outstanding = payment_schedules.filter(
            status="pending"
        ).aggregate(total=Sum("amount"))["total"] or 0
        
        # Add overdue payments
        overdue_amount = payment_schedules.filter(
            status="pending",
            due_date__lt=timezone.now().date()
        ).aggregate(total=Sum("amount"))["total"] or 0
        
        total_outstanding += overdue_amount
        
        return {
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "overdue_amount": overdue_amount,
        }

    def _get_finance_series(self, start_date, end_date):
        """Get monthly finance data for the chart"""
        finance_series = []
        
        # Generate monthly data
        current_date = start_date.replace(day=1)
        end_month = end_date.replace(day=1)
        
        while current_date <= end_month:
            month_start = current_date
            month_end = (current_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            # Get payments for this month
            month_payments = PaymentSchedule.objects.filter(
                payment_plan__sale_item__sale__status="completed",
                paid_date__range=[month_start, month_end],
                status="paid"
            )
            
            # Get expected payments for this month
            month_expected = PaymentSchedule.objects.filter(
                payment_plan__sale_item__sale__status="completed",
                due_date__range=[month_start, month_end],
                status="pending"
            )
            
            collected = month_payments.aggregate(total=Sum("paid_amount"))["total"] or 0
            expected = month_expected.aggregate(total=Sum("amount"))["total"] or 0
            
            finance_series.append({
                "month": current_date.strftime("%b"),
                "expected": float(expected),
                "collected": float(collected),
            })
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return finance_series

    def _get_salespeople_data(self):
        """Get sales team performance data"""
        salespeople_data = []
        
        # Get all active sales people
        sales_people = SalesPerson.objects.filter(is_active=True)
        
        for sales_person in sales_people:
            # Get assigned sales
            assigned_sales = PropertySale.objects.filter(
                assigned_sales_person=sales_person,
                status="completed"
            )
            
            # Get outstanding payments for assigned sales
            outstanding_payments = PaymentSchedule.objects.filter(
                payment_plan__sale_item__sale__assigned_sales_person=sales_person,
                status="pending"
            )
            
            # Get overdue payments
            overdue_payments = outstanding_payments.filter(
                due_date__lt=timezone.now().date()
            )
            
            # Calculate metrics
            assigned_count = assigned_sales.count()
            outstanding_amount = outstanding_payments.aggregate(
                total=Sum("amount")
            )["total"] or 0
            overdue_count = overdue_payments.count()
            
            salespeople_data.append({
                "name": sales_person.get_full_name(),
                "assigned": assigned_count,
                "outstanding": float(outstanding_amount),
                "overdueFollowUps": overdue_count,
            })
        
        return salespeople_data
