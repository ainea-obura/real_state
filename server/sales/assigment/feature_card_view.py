from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .feature_card_serializer import FeatureCardSerializer


class FeatureCardView(APIView):
    """
    API view to get feature card data for the sales dashboard.
    Provides aggregated payment-related metrics.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get feature card data"""
        try:
            serializer = FeatureCardSerializer()
            data = serializer.get_feature_card_data()

            # Format the response
            response_data = {
                "success": True,
                "message": "Feature card data retrieved successfully",
                "data": {
                    "feature_cards": {
                        "total_sales_value": data[
                            "total_sales_value"
                        ],  # Already formatted string
                        "active_payment_plans": data["active_payment_plans"],
                        "outstanding_payments": data[
                            "outstanding_payments"
                        ],  # Already formatted string
                        "commission_due": data[
                            "commission_due"
                        ],  # Already formatted string
                    },
                    "additional_metrics": {
                        "overdue_payments_count": data["overdue_payments_count"],
                        "upcoming_payments_count": data["upcoming_payments_count"],
                        "total_payment_plans": data["total_payment_plans"],
                    },
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to retrieve feature card data",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
