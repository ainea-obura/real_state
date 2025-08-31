from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AlertsSerializer,
    DashboardStatsSerializer,
    FinanceSummarySerializer,
    RecentTransactionsSerializer,
)


class DashboardStatsView(APIView):
    """API view for retrieving dashboard statistics"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get dashboard statistics"""
        try:
            serializer = DashboardStatsSerializer()
            data = serializer.to_representation(None)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error retrieving dashboard stats: {str(e)}",
                    "data": {"count": 0, "results": {}},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FinanceSummaryView(APIView):
    """API view for retrieving finance summary data"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get finance summary data"""
        try:
            from utils.payments import check_account_balance
            from utils.get_sassa_pay_token import token
            import os
            from utils.format import format_money_with_currency

            serializer = FinanceSummarySerializer()
            data = serializer.to_representation(None)
            access_token = token()
            merchant_code = os.environ.get("MERCHANT_CODE")
            if access_token:
                balance = check_account_balance(merchant_code, access_token)
                if balance.get("responseCode") == "0":
                    data["org_account_balance"] = format_money_with_currency(
                        balance["data"].get("OrgAccountBalance", None)
                    )
                else:
                    data["org_account_balance"] = None
            else:
                data["org_account_balance"] = None

            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error retrieving finance summary: {str(e)}",
                    "data": {"summary": {}, "chartData": []},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RecentTransactionsView(APIView):
    """API view for retrieving recent transactions data"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get recent transactions data"""
        try:
            serializer = RecentTransactionsSerializer()
            data = serializer.to_representation(None)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error retrieving recent transactions: {str(e)}",
                    "data": {"transactions": []},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuickActionsView(APIView):
    """API view for retrieving quick actions data"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get quick actions data"""
        try:
            serializer = QuickActionsSerializer()
            data = serializer.to_representation(None)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error retrieving quick actions: {str(e)}",
                    "data": {"actions": []},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AlertsView(APIView):
    """API view for retrieving alerts data"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get alerts data"""
        try:
            serializer = AlertsSerializer()
            data = serializer.to_representation(None)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {
                    "error": True,
                    "message": f"Error retrieving alerts: {str(e)}",
                    "data": {"alerts": []},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
