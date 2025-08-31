from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth

from ..models import PropertySaleItem
from properties.models import LocationNode
from .serializers import (
    PropertySalesPerformanceReportSerializer,
    PropertySalesPerformanceReportQuerySerializer,
)


class PropertySalesPerformanceReportView(ListAPIView):
    """
    Generic class-based view for Property Sales Performance reports.
    Returns KPIs, monthly data, and sales records with optional filtering.
    """

    serializer_class = PropertySalesPerformanceReportSerializer
    queryset = PropertySaleItem.objects.none()  # We'll override get_queryset

    def get_queryset(self):
        """Override to return filtered queryset"""
        # Validate query parameters
        query_serializer = PropertySalesPerformanceReportQuerySerializer(
            data=self.request.query_params
        )
        if not query_serializer.is_valid():
            return PropertySaleItem.objects.none()

        # Get validated query parameters
        from_date = query_serializer.validated_data.get("from_date")
        to_date = query_serializer.validated_data.get("to_date")
        project_id = query_serializer.validated_data.get("project_id")

        # Build base queryset - only include properties that are actually sold
        # This means they must have a PropertySaleItem record (indicating they were sold)
        # AND the sale status should not be cancelled
        #
        # KEY POINT: We're NOT counting all units from LocationNode/UnitDetail
        # We're ONLY counting units that have been sold (have PropertySaleItem records)
        base_queryset = PropertySaleItem.objects.filter(
            sale__status__in=["pending", "active", "completed", "defaulted"]
        ).select_related("sale", "property_node", "buyer")

        # Apply date filtering if provided - use created_at for accurate monthly breakdown
        if from_date:
            base_queryset = base_queryset.filter(created_at__date__gte=from_date)
        if to_date:
            base_queryset = base_queryset.filter(created_at__date__lte=to_date)

        # Apply project filtering if provided
        if project_id:
            # Get all properties under the specified project
            try:
                project_node = LocationNode.objects.get(
                    id=project_id, node_type="PROJECT"
                )
                project_properties = project_node.get_descendants(
                    include_self=False
                ).filter(node_type__in=["UNIT", "HOUSE"])
                base_queryset = base_queryset.filter(
                    property_node__in=project_properties
                )
            except LocationNode.DoesNotExist:
                return PropertySaleItem.objects.none()

        return base_queryset

    def list(self, request, *args, **kwargs):
        """Override list method to return custom response format"""
        try:
            queryset = self.get_queryset()

            # If no sales data exists, return empty response
            if not queryset.exists():
                print("=== NO SALES DATA FOUND ===")
                print("No PropertySaleItem records found for the specified criteria")
                print("Returning empty response")
                print("===============================")

                # Return empty data structure
                empty_response = {
                    "kpis": {
                        "unitsSold": 0,
                        "averageSalePrice": 0.0,
                        "totalRevenue": 0.0,
                        "averageTimeToClose": 0.0,
                    },
                    "monthlyData": [],
                    "salesRecords": [],
                }

                return Response(empty_response)

            # Calculate KPIs
            kpis = self._calculate_kpis(queryset)

            # Get monthly data for charts
            monthly_data = self._get_monthly_data(queryset)

            # Get detailed sales records
            sales_records = self._get_sales_records(queryset)

            # Prepare response data
            response_data = {
                "kpis": kpis,
                "monthlyData": monthly_data,
                "salesRecords": sales_records,
            }

            # Log response data for debugging
            print("=== RESPONSE DATA DEBUG ===")
            print(f"KPIs: {kpis}")
            print(f"Monthly Data Count: {len(monthly_data)}")
            if monthly_data:
                print(f"First Monthly Data: {monthly_data[0]}")
            print(f"Sales Records Count: {len(sales_records)}")

            # Debug: Log what properties are being counted
            print("=== PROPERTIES BEING COUNTED ===")
            for item in queryset[:5]:  # Show first 5 for debugging
                print(
                    f"Property: {item.property_node.name} ({item.property_node.node_type})"
                )
                print(f"  - Sale Status: {item.sale.status}")
                print(f"  - Sale Price: {item.sale_price}")
                print(f"  - Created Date: {item.created_at}")
            print("================================")
            print("===========================")

            # Validate response data
            serializer = self.get_serializer(data=response_data)
            if serializer.is_valid():
                return Response(serializer.data)
            else:
                print("=== SERIALIZER ERRORS ===")
                print(f"Errors: {serializer.errors}")
                print("========================")
                return Response(
                    serializer.errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            print("=== EXCEPTION IN LIST METHOD ===")
            print(f"Error: {str(e)}")
            print(f"Type: {type(e)}")
            import traceback

            print(f"Traceback: {traceback.format_exc()}")
            print("===============================")
            return Response(
                {"error": f"Internal server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _calculate_kpis(self, queryset):
        """Calculate KPIs from the filtered queryset"""
        # Note: queryset contains only PropertySaleItem records
        # This means we're only counting properties that have been sold
        # (have a sale record) and are not cancelled

        # Basic counts and sums
        total_units = queryset.count()
        total_revenue = queryset.aggregate(total=Sum("sale_price"))["total"] or 0

        # Average sale price
        avg_sale_price = 0
        if total_units > 0:
            avg_sale_price = total_revenue / total_units

        # Average time to close (days from creation to sale date)
        avg_time_to_close = 0
        if total_units > 0:
            time_diffs = []
            for item in queryset:
                if item.sale.sale_date and item.sale.created_at:
                    # Calculate days between creation and sale
                    sale_date = item.sale.sale_date
                    created_date = item.sale.created_at.date()
                    days_diff = (sale_date - created_date).days
                    if days_diff >= 0:  # Only include valid time differences
                        time_diffs.append(days_diff)

            if time_diffs:
                avg_time_to_close = sum(time_diffs) / len(time_diffs)

        return {
            "unitsSold": total_units,
            "averageSalePrice": round(float(avg_sale_price), 2),
            "totalRevenue": float(total_revenue),
            "averageTimeToClose": round(avg_time_to_close, 0),
        }

    def _get_monthly_data(self, queryset):
        """Get monthly aggregated data for charts"""

        # Group by month and aggregate - use created_at for accurate monthly breakdown
        monthly_aggregated = (
            queryset.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                units_sold=Count("id", distinct=True),  # Ensure unique counting
                revenue=Sum("sale_price"),
                avg_price=Avg("sale_price"),
            )
            .order_by("month")
        )

        monthly_data = []

        # Debug: Log the raw monthly aggregated data
        print("=== MONTHLY AGGREGATED DEBUG ===")
        print(f"Raw monthly_aggregated: {list(monthly_aggregated)}")
        print("===============================")

        for month_data in monthly_aggregated:
            # Handle potential Decimal or array values from aggregation
            avg_price = month_data.get("avg_price")
            if avg_price is not None:
                # Convert to float, handling both Decimal and array cases
                if hasattr(avg_price, "__iter__") and not isinstance(avg_price, str):
                    # If it's an array/iterable, take the first value
                    avg_price = float(avg_price[0]) if avg_price else 0
                else:
                    avg_price = float(avg_price)
            else:
                avg_price = 0

            revenue = month_data.get("revenue")
            if revenue is not None:
                revenue = float(revenue)
            else:
                revenue = 0

            monthly_data.append(
                {
                    "month": month_data["month"].strftime("%b"),
                    "unitsSold": month_data["units_sold"] or 0,
                    "revenue": revenue,
                    "averagePrice": avg_price,
                }
            )

        # Debug: Log the processed monthly data
        print("=== PROCESSED MONTHLY DATA DEBUG ===")
        print(f"Processed monthly_data: {monthly_data}")
        print("===============================")

        # No sample data generation - show only real data
        if not monthly_data:
            print("=== NO MONTHLY DATA FOUND ===")
            print("No sales data exists for the selected date range")
            print("Returning empty monthly data array")
            print("===============================")
        else:
            print("=== REAL MONTHLY DATA FOUND ===")
            print(f"Found {len(monthly_data)} months with sales data")
            for month_data in monthly_data:
                print(
                    f"  {month_data['month']}: {month_data['unitsSold']} units, "
                    f"KES {month_data['revenue']:,.2f}"
                )
            print("===============================")

        return monthly_data

    def _get_sales_records(self, queryset):
        """Get detailed sales records"""

        sales_records = []
        for item in queryset.select_related("sale", "property_node", "buyer")[
            :10
        ]:  # Limit to 10 records for performance

            # Get project name
            project_name = "Unknown Project"
            try:
                project_ancestor = (
                    item.property_node.get_ancestors(include_self=True)
                    .filter(node_type="PROJECT")
                    .first()
                )
                if project_ancestor:
                    project_name = project_ancestor.name
            except Exception:
                pass

            # Calculate time to close
            time_to_close = 0
            if item.sale.sale_date and item.sale.created_at:
                sale_date = item.sale.sale_date
                created_date = item.sale.created_at.date()
                time_to_close = (sale_date - created_date).days
                if time_to_close < 0:
                    time_to_close = 0

            sales_records.append(
                {
                    "id": str(item.id),
                    "propertyName": item.property_node.name,
                    "salePrice": float(item.sale_price),
                    "soldDate": item.sale.sale_date,
                    "timeToClose": time_to_close,
                    "project": project_name,
                }
            )

        return sales_records
