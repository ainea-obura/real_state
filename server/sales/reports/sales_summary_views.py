from decimal import Decimal
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from properties.models import LocationNode, UnitDetail
from sales.models import PropertySale, PropertySaleItem, PropertyReservation


class SalesSummaryReportView(APIView):
    """
    Sales summary report showing apartment status counts and financial statements
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get date range from query parameters
            date_from_str = getattr(request, 'query_params', {}).get("date_from") or request.GET.get("date_from")
            date_to_str = getattr(request, 'query_params', {}).get("date_to") or request.GET.get("date_to")
            
            if date_from_str:
                date_from = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").date()
            else:
                date_from = timezone.now().date().replace(day=1)  # First day of current month
                
            if date_to_str:
                date_to = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").date()
            else:
                date_to = timezone.now().date()  # Today

            # Get all units
            all_units = LocationNode.objects.filter(node_type='UNIT')
            total_units = all_units.count()

            # Count units by status
            unit_status_counts = {
                'available': 0,
                'sold': 0,
                'booked': 0,
                'deposit_paid': 0
            }

            for unit in all_units:
                if hasattr(unit, 'unit_detail') and unit.unit_detail:
                    status = unit.unit_detail.status
                    if status in unit_status_counts:
                        unit_status_counts[status] += 1
                    else:
                        unit_status_counts['available'] += 1
                else:
                    unit_status_counts['available'] += 1

            # Get sales data for the period
            sales_in_period = PropertySale.objects.filter(
                sale_date__range=[date_from, date_to],
                status__in=['completed', 'active']
            )

            # Calculate financial metrics
            total_sales_value = PropertySaleItem.objects.filter(
                sale__in=sales_in_period
            ).aggregate(total=Sum('sale_price'))['total'] or Decimal('0')

            total_down_payments = PropertySaleItem.objects.filter(
                sale__in=sales_in_period
            ).aggregate(total=Sum('down_payment'))['total'] or Decimal('0')

            # Get outstanding amounts (sale price - down payment)
            outstanding_amount = total_sales_value - total_down_payments

            # Count sales by status
            sales_by_status = sales_in_period.values('status').annotate(
                count=Count('id')
            ).order_by('status')

            # Get reservations data
            reservations_in_period = PropertyReservation.objects.filter(
                created_at__date__range=[date_from, date_to]
            )

            # Calculate occupancy rate
            occupied_units = unit_status_counts['sold'] + unit_status_counts['booked'] + unit_status_counts['deposit_paid']
            occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0

            # Prepare response data
            report_data = {
                "period": {
                    "from": date_from.strftime("%Y-%m-%d"),
                    "to": date_to.strftime("%Y-%m-%d")
                },
                "apartment_status": {
                    "total_units": total_units,
                    "available": unit_status_counts['available'],
                    "sold": unit_status_counts['sold'],
                    "booked": unit_status_counts['booked'],
                    "deposit_paid": unit_status_counts['deposit_paid'],
                    "occupancy_rate": f"{occupancy_rate:.1f}%"
                },
                "financial_summary": {
                    "total_sales_value": f"KES {total_sales_value:,.2f}",
                    "total_down_payments": f"KES {total_down_payments:,.2f}",
                    "outstanding_amount": f"KES {outstanding_amount:,.2f}",
                    "sales_count": sales_in_period.count(),
                    "reservations_count": reservations_in_period.count()
                },
                "sales_by_status": list(sales_by_status),
                "recent_activity": {
                    "sales_this_period": sales_in_period.count(),
                    "reservations_this_period": reservations_in_period.count(),
                    "units_sold_this_period": PropertySaleItem.objects.filter(
                        sale__in=sales_in_period
                    ).count()
                }
            }

            return Response({
                "error": False,
                "message": "Sales summary report fetched successfully",
                "data": report_data
            }, status=200)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error fetching sales summary report: {str(e)}",
                "data": None
            }, status=500)


class SalesFinancialStatementView(APIView):
    """
    Detailed financial statement for sales
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get date range from query parameters
            date_from_str = getattr(request, 'query_params', {}).get("date_from") or request.GET.get("date_from")
            date_to_str = getattr(request, 'query_params', {}).get("date_to") or request.GET.get("date_to")
            
            if date_from_str:
                date_from = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").date()
            else:
                date_from = timezone.now().date().replace(day=1)
                
            if date_to_str:
                date_to = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").date()
            else:
                date_to = timezone.now().date()

            # Get sales data for the period
            sales_in_period = PropertySale.objects.filter(
                sale_date__range=[date_from, date_to]
            )

            # Calculate revenue breakdown
            revenue_breakdown = PropertySaleItem.objects.filter(
                sale__in=sales_in_period
            ).aggregate(
                total_sales=Sum('sale_price'),
                total_down_payments=Sum('down_payment')
            )

            total_sales = revenue_breakdown['total_sales'] or Decimal('0')
            total_down_payments = revenue_breakdown['total_down_payments'] or Decimal('0')
            outstanding_revenue = total_sales - total_down_payments

            # Get sales by month for trend analysis
            monthly_sales = PropertySale.objects.filter(
                sale_date__range=[date_from, date_to]
            ).extra(
                select={'month': "DATE_TRUNC('month', sale_date)"}
            ).values('month').annotate(
                sales_count=Count('id'),
                total_value=Sum('sale_items__sale_price')
            ).order_by('month')

            # Get top performing units
            top_units = PropertySaleItem.objects.filter(
                sale__in=sales_in_period
            ).values(
                'property_node__name',
                'property_node__unit_detail__unit_type'
            ).annotate(
                sales_count=Count('id'),
                total_value=Sum('sale_price')
            ).order_by('-total_value')[:5]

            # Prepare financial statement
            financial_data = {
                "period": {
                    "from": date_from.strftime("%Y-%m-%d"),
                    "to": date_to.strftime("%Y-%m-%d")
                },
                "revenue": {
                    "total_sales_value": f"KES {total_sales:,.2f}",
                    "down_payments_received": f"KES {total_down_payments:,.2f}",
                    "outstanding_revenue": f"KES {outstanding_revenue:,.2f}",
                    "collection_rate": f"{(total_down_payments/total_sales*100):.1f}%" if total_sales > 0 else "0%"
                },
                "monthly_trends": list(monthly_sales),
                "top_performing_units": list(top_units),
                "summary": {
                    "total_transactions": sales_in_period.count(),
                    "average_sale_value": f"KES {total_sales/sales_in_period.count():,.2f}" if sales_in_period.count() > 0 else "KES 0.00",
                    "total_units_sold": PropertySaleItem.objects.filter(sale__in=sales_in_period).count()
                }
            }

            return Response({
                "error": False,
                "message": "Sales financial statement fetched successfully",
                "data": financial_data
            }, status=200)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error fetching sales financial statement: {str(e)}",
                "data": None
            }, status=500)
