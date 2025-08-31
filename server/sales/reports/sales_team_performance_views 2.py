from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from django.utils import timezone

from sales.models import SalesPerson, PropertySale, AssignedDocument
from .sales_team_performance_serializers import (
    SalesTeamPerformanceReportSerializer,
    SalesTeamPerformanceQuerySerializer,
)


class SalesTeamPerformanceReportView(ListAPIView):
    """
    View for Sales Team Performance report.
    Returns performance metrics for all sales people within a date range.
    """

    serializer_class = SalesTeamPerformanceReportSerializer
    query_serializer = SalesTeamPerformanceQuerySerializer

    def get_queryset(self):
        """Get queryset for sales people"""
        return SalesPerson.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        """Generate Sales Team Performance report"""
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

            print("=== SALES TEAM PERFORMANCE DEBUG ===")
            print(f"Date range: {from_date} to {to_date}")
            print(f"Project ID: {project_id}")
            print("=====================================")

            # Get all active sales people
            sales_people = self.get_queryset()

            if not sales_people.exists():
                return Response(
                    {
                        "success": False,
                        "message": "No active sales people found",
                        "data": {},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Calculate performance for each sales person
            salespeople_data = []
            total_won = 0
            total_lost = 0
            total_revenue = 0

            for sp in sales_people:
                performance = self._calculate_sales_person_performance(
                    sp, from_date, to_date, project_id
                )
                salespeople_data.append(performance)

                # Accumulate totals for KPIs
                total_won += performance["won"]
                total_lost += performance["lost"]
                total_revenue += performance["revenue"]

            # Calculate overall KPIs
            kpis = self._calculate_overall_kpis(
                total_won, total_lost, total_revenue, salespeople_data
            )

            # Prepare response data
            response_data = {
                "success": True,
                "message": "Sales Team Performance report generated successfully",
                "data": {"kpis": kpis, "salespeople": salespeople_data},
            }

            print("=== RESPONSE DEBUG ===")
            print(f"Total sales people: {len(salespeople_data)}")
            print(f"Total won: {total_won}")
            print(f"Total lost: {total_lost}")
            print(f"Total revenue: {total_revenue}")
            print("======================")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in SalesTeamPerformanceReportView: {str(e)}")
            return Response(
                {
                    "success": False,
                    "message": f"Error generating report: {str(e)}",
                    "data": {},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _calculate_sales_person_performance(
        self, sales_person, from_date, to_date, project_id
    ):
        """Calculate performance metrics for a single sales person"""

        # Base filters for date range
        date_filter = Q(created_at__date__range=[from_date, to_date])

        # 1. Contracted: Properties with contracts that sales person is responsible for
        # This should count actual PropertySale records (closed deals)
        contracted_filter = Q(
            assigned_sales_person=sales_person,
            status__in=["pending", "active", "completed"],
        )

        contracted = PropertySale.objects.filter(
            contracted_filter & date_filter
        ).count()

        # 2. Offers Sent: Count unique offer letters for properties
        # Count distinct offer letters for properties that have PropertySale records
        offers_sent = (
            AssignedDocument.objects.filter(
                document_type="offer_letter",
                property_node__sale_items__sale__assigned_sales_person=sales_person,
                created_at__date__range=[from_date, to_date],
            )
            .values("property_node")
            .distinct()
            .count()
        )

        # 3. Won Deals: Same as contracted (closed deals)
        # These are properties that have been sold and assigned to this sales person
        won = contracted  # Won deals = closed deals

        # 4. Lost Deals: Expired offer letters that never became contracts
        # Count offer letters that expired without becoming sales
        lost_filter = Q(
            document_type="offer_letter",
            property_node__sale_items__sale__assigned_sales_person=sales_person,
            due_date__lt=timezone.now().date(),  # Due date passed
            status__in=["active", "pending"],  # Still active/pending but expired
        )

        lost = (
            AssignedDocument.objects.filter(lost_filter & date_filter)
            .exclude(
                # Exclude those that have contracts
                property_node__assigned_documents__document_type="sales_agreement"
            )
            .count()
        )

        # 5. Calculate conversion percentage
        conversion_percent = (won / (won + lost)) * 100 if (won + lost) > 0 else 0

        # 6. Calculate revenue and average deal size
        revenue_filter = Q(
            assigned_sales_person=sales_person,
            status__in=["pending", "active", "completed"],
        )

        revenue_data = PropertySale.objects.filter(
            revenue_filter & date_filter
        ).aggregate(total_revenue=Sum("sale_items__sale_price"))

        revenue = revenue_data["total_revenue"] or 0
        avg_deal_size = revenue / won if won > 0 else 0

        return {
            "id": sales_person.id,
            "name": sales_person.user.get_full_name(),
            "employee_id": sales_person.employee_id,
            "email": sales_person.user.email,
            "phone": sales_person.user.phone,
            "contracted": contracted,
            "offers_sent": offers_sent,
            "won": won,
            "lost": lost,
            "conversion_percent": round(conversion_percent, 1),
            "avg_deal_size": round(float(avg_deal_size), 2),
            "revenue": round(float(revenue), 2),
        }

    def _calculate_overall_kpis(
        self, total_won, total_lost, total_revenue, salespeople_data
    ):
        """Calculate overall KPIs for the sales team"""

        # Total deals closed
        total_deals_closed = total_won

        # Conversion rate
        conversion_rate = (
            (total_won / (total_won + total_lost)) * 100
            if (total_won + total_lost) > 0
            else 0
        )

        # Average deal size
        avg_deal_size = total_revenue / total_won if total_won > 0 else 0

        # Pipeline velocity (placeholder - would need more complex calculation)
        pipeline_velocity = 18  # Default value for now

        return {
            "total_deals_closed": total_deals_closed,
            "conversion_rate": round(conversion_rate, 1),
            "avg_deal_size": round(float(avg_deal_size), 2),
            "pipeline_velocity": pipeline_velocity,
        }
