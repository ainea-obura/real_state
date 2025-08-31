from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from django.utils import timezone
from django.db.models.functions import TruncMonth

from sales.models import PaymentSchedule
from .financial_collections_serializers import (
    FinancialCollectionsReportSerializer,
    FinancialCollectionsQuerySerializer,
)


class FinancialCollectionsReportView(ListAPIView):
    """
    View for Financial Collections Summary report.
    Returns expected vs collected amounts by month within a date range.
    """

    serializer_class = FinancialCollectionsReportSerializer
    query_serializer = FinancialCollectionsQuerySerializer

    def get_queryset(self):
        """Get queryset for payment schedules"""
        return PaymentSchedule.objects.all()

    def list(self, request, *args, **kwargs):
        """Generate Financial Collections Summary report"""
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

            print("=== FINANCIAL COLLECTIONS DEBUG ===")
            print(f"Date range: {from_date} to {to_date}")
            print(f"Project ID: {project_id}")
            print("=====================================")

            # Get payment schedules within date range, excluding cancelled
            queryset = PaymentSchedule.objects.filter(
                created_at__date__range=[from_date, to_date]
            ).exclude(status="cancelled")

            if project_id:
                # Filter by project if specified
                # This is a placeholder - implement proper project filtering
                pass

            if not queryset.exists():
                # Return empty response if no data
                empty_response = {
                    "success": True,
                    "message": "No financial data found for the specified criteria",
                    "data": {
                        "kpis": {
                            "expectedPeriod": 0.0,
                            "collectedPeriod": 0.0,
                            "collectionRate": 0.0,
                            "overdueAmount": 0.0,
                        },
                        "monthlyData": [],
                    },
                }
                return Response(empty_response, status=status.HTTP_200_OK)

            # Calculate monthly data
            monthly_data = self._get_monthly_data(queryset, from_date, to_date)

            # Calculate overall KPIs
            kpis = self._calculate_overall_kpis(queryset, monthly_data)

            # Prepare response data
            response_data = {
                "success": True,
                "message": "Financial Collections Summary report generated successfully",
                "data": {"kpis": kpis, "monthlyData": monthly_data},
            }

            print("=== RESPONSE DEBUG ===")
            print(f"Total records: {queryset.count()}")
            print(f"Monthly data points: {len(monthly_data)}")
            print(f"KPIs: {kpis}")
            print("======================")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in FinancialCollectionsReportView: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error generating report: {str(e)}",
                    "data": {},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_monthly_data(self, queryset, from_date, to_date):
        """Get monthly financial data"""
        monthly_data = []

        # Get data grouped by month
        monthly_aggregates = (
            queryset.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                expected=Sum("amount"),
                collected=Sum("paid_amount"),
            )
            .order_by("month")
        )

        for month_data in monthly_aggregates:
            month = month_data["month"]
            expected = float(month_data["expected"] or 0)
            collected = float(month_data["collected"] or 0)
            collection_rate = (collected / expected * 100) if expected > 0 else 0

            monthly_data.append(
                {
                    "month": month.strftime("%b %Y"),
                    "expected": expected,
                    "collected": collected,
                    "collection_rate": round(collection_rate, 1),
                }
            )

        return monthly_data

    def _calculate_overall_kpis(self, queryset, monthly_data):
        """Calculate overall KPIs for the period"""

        # Expected: Sum of all amounts (pending, overdue, etc.)
        expected_period = float(queryset.aggregate(total=Sum("amount"))["total"] or 0)

        # Collected: Sum of paid amounts
        collected_period = float(
            queryset.filter(status="paid").aggregate(total=Sum("paid_amount"))["total"]
            or 0
        )

        # Collection rate
        collection_rate = (
            (collected_period / expected_period * 100) if expected_period > 0 else 0
        )

        # Overdue amount: Sum of overdue payments
        overdue_amount = float(
            queryset.filter(
                Q(status="overdue")
                | Q(status="pending", due_date__lt=timezone.now().date())
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        return {
            "expectedPeriod": round(expected_period, 2),
            "collectedPeriod": round(collected_period, 2),
            "collectionRate": round(collection_rate, 1),
            "overdueAmount": round(overdue_amount, 2),
        }
