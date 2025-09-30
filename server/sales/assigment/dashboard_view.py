from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime

from .dashboard_serializer import DashboardSerializer


class DashboardView(APIView):
    """
    API view to get sales dashboard data.
    Provides unit status counts, revenue metrics, monthly finance data, and sales team performance.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get dashboard data with optional date filtering"""
        try:
            # Parse date parameters from query string
            start_date = self._parse_date_param(getattr(request, 'query_params', {}).get('start_date') or request.GET.get('start_date'))
            end_date = self._parse_date_param(getattr(request, 'query_params', {}).get('end_date') or request.GET.get('end_date'))
            
            serializer = DashboardSerializer()
            data = serializer.get_dashboard_data(start_date, end_date)

            # Format the response following the existing pattern
            response_data = {
                "success": True,
                "message": "Dashboard data retrieved successfully",
                "data": {
                    "feature_cards": {
                        "total_listings": data["total_listings"],
                        "sold_units": data["sold_units"],
                        "total_revenue": data["total_revenue"],
                        "outstanding_payments": data["outstanding_payments"],
                    },
                    "finance_collection": {
                        "series": data["finance_series"],
                    },
                    "salespeople": data["salespeople"],
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to retrieve dashboard data",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _parse_date_param(self, date_string):
        """Parse date parameter from query string"""
        if not date_string:
            return None
        
        try:
            # Try different date formats
            for date_format in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"]:
                try:
                    return datetime.strptime(date_string, date_format).date()
                except ValueError:
                    continue
            
            # If none of the formats work, return None
            return None
        except Exception:
            return None
