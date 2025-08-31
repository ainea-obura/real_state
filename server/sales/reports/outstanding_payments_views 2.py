from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum
from django.utils import timezone

from sales.models import PaymentSchedule
from .outstanding_payments_serializers import (
    OutstandingPaymentsReportSerializer,
    OutstandingPaymentsQuerySerializer,
)


class OutstandingPaymentsReportView(ListAPIView):
    """
    View for Outstanding Payments & Follow-ups report.
    Returns outstanding payment installments within a date range.
    """

    serializer_class = OutstandingPaymentsReportSerializer
    query_serializer = OutstandingPaymentsQuerySerializer

    def get_queryset(self):
        """Get queryset for payment schedules"""
        return PaymentSchedule.objects.all()

    def list(self, request, *args, **kwargs):
        """Generate Outstanding Payments report"""
        try:
            # Validate query parameters
            query_serializer = self.query_serializer(data=request.query_params)
            query_serializer.is_valid(raise_exception=True)

            from_date = query_serializer.validated_data.get("from_date")
            to_date = query_serializer.validated_data.get("to_date")
            project_id = query_serializer.validated_data.get("project_id")

            # If no date range provided, use current month
            if not from_date or not to_date:
                today = timezone.now().date()
                from_date = today.replace(day=1)
                to_date = today

            print("=== OUTSTANDING PAYMENTS DEBUG ===")
            print(f"Date range: {from_date} to {to_date}")
            print(f"Project ID: {project_id}")
            print("=====================================")

            # Get outstanding payments (not paid) within date range
            queryset = PaymentSchedule.objects.filter(
                due_date__range=[from_date, to_date], status__in=["pending", "overdue"]
            ).select_related(
                "payment_plan__sale_item__buyer",
                "payment_plan__sale_item__property_node",
                "payment_plan__sale_item__sale__assigned_sales_person__user",
            )

            if project_id:
                # Filter by project if specified
                # This is a placeholder - implement proper project filtering
                pass

            if not queryset.exists():
                # Return empty response if no data
                empty_response = {
                    "success": True,
                    "message": "No outstanding payments found for the specified criteria",
                    "data": {
                        "kpis": {
                            "overdueInvoicesCount": 0,
                            "overdueAmountTotal": 0.0,
                            "avgDaysOverdue": 0.0,
                            "leadsWithoutFollowup": 0,
                        },
                        "overduePayments": [],
                    },
                }
                return Response(empty_response, status=status.HTTP_200_OK)

            # Calculate KPIs
            kpis = self._calculate_kpis(queryset)

            # Get outstanding payments data
            overdue_payments = self._get_outstanding_payments(queryset)

            # Prepare response data
            response_data = {
                "success": True,
                "message": "Outstanding Payments report generated successfully",
                "data": {"kpis": kpis, "overduePayments": overdue_payments},
            }

            print("=== RESPONSE DEBUG ===")
            print(f"Total outstanding payments: {queryset.count()}")
            print(f"KPIs: {kpis}")
            print("======================")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in OutstandingPaymentsReportView: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error generating report: {str(e)}",
                    "data": {},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _calculate_kpis(self, queryset):
        """Calculate KPIs for outstanding payments"""

        # Overdue invoices count
        overdue_invoices_count = queryset.filter(
            due_date__lt=timezone.now().date()
        ).count()

        # Overdue amount total
        overdue_amount_total = float(
            queryset.filter(due_date__lt=timezone.now().date()).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # Average days overdue
        overdue_payments = queryset.filter(due_date__lt=timezone.now().date())
        if overdue_payments.exists():
            total_days = sum(
                (timezone.now().date() - payment.due_date).days
                for payment in overdue_payments
            )
            avg_days_overdue = total_days / overdue_payments.count()
        else:
            avg_days_overdue = 0.0

        # Leads without follow-up (placeholder - would need follow-up tracking)
        leads_without_followup = overdue_payments.count()

        return {
            "overdueInvoicesCount": overdue_invoices_count,
            "overdueAmountTotal": round(overdue_amount_total, 2),
            "avgDaysOverdue": round(avg_days_overdue, 1),
            "leadsWithoutFollowup": leads_without_followup,
        }

    def _get_outstanding_payments(self, queryset):
        """Get outstanding payments data for the table"""
        payments_data = []

        for payment in queryset:
            # Calculate days overdue
            days_overdue = 0
            if payment.due_date < timezone.now().date() and payment.status != "paid":
                days_overdue = (timezone.now().date() - payment.due_date).days

                # Just use the current node name as project name
            project_name = payment.payment_plan.sale_item.property_node.name

            # Just use the current node name as property info (no parent traversal)
            node = payment.payment_plan.sale_item.property_node
            property_info = node.name

            # Check if this is linked to an invoice (rental) or sales installment
            invoice_number = "N/A"  # Default for sales installments

            # For sales installments, show payment number instead of invoice
            total_payments = payment.payment_plan.installment_count or 1
            payment_display = f"Payment {payment.payment_number} of {total_payments}"

            payments_data.append(
                {
                    "id": payment.id,
                    "invoiceNumber": invoice_number,
                    "paymentNumber": payment_display,
                    "buyer": payment.payment_plan.sale_item.buyer.get_full_name(),
                    "buyerPhone": getattr(
                        payment.payment_plan.sale_item.buyer, "phone", ""
                    ),
                    "buyerEmail": payment.payment_plan.sale_item.buyer.email,
                    "projectName": project_name,
                    "propertyInfo": property_info,
                    "salesperson": (
                        payment.payment_plan.sale_item.sale.assigned_sales_person.user.get_full_name()
                        if payment.payment_plan.sale_item.sale.assigned_sales_person
                        else "Unassigned"
                    ),
                    "salespersonPhone": (
                        getattr(
                            payment.payment_plan.sale_item.sale.assigned_sales_person.user,
                            "phone",
                            "",
                        )
                        if payment.payment_plan.sale_item.sale.assigned_sales_person
                        else ""
                    ),
                    "salespersonEmail": (
                        payment.payment_plan.sale_item.sale.assigned_sales_person.user.email
                        if payment.payment_plan.sale_item.sale.assigned_sales_person
                        else ""
                    ),
                    "dueDate": payment.due_date,
                    "daysOverdue": days_overdue,
                    "amount": float(payment.amount),
                    "status": payment.status,
                    "lastFollowUpDate": None,  # Placeholder
                    "followUpStatus": None,  # Placeholder
                }
            )

        return payments_data
