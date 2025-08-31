from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView
from django.db.models import Count, Sum, Q
import logging

from .models import (
    PropertySale,
    PaymentPlan,
    PaymentSchedule,
    SaleCommission,
    PaymentPlanTemplate,
)
from .serializers import (
    PropertySaleSerializer,
)

# Configure logging
logger = logging.getLogger(__name__)


class PropertySaleCreateView(CreateAPIView):
    """
    Create a new property sale with payment plan and commissions in one API call.
    This handles the complete sales flow from the frontend wizard.
    """

    serializer_class = PropertySaleSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new property sale with all related data.
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            sale = serializer.save()

            logger.info(f"Property sale created successfully: {sale.id}")

            # Get sale items and payment plans for response
            sale_items = sale.sale_items.all()
            total_properties = sale_items.count()
            total_buyers = len(set(item.buyer.id for item in sale_items))
            total_value = sum(item.sale_price for item in sale_items)

            # Get payment plan details for each owner
            payment_plans_data = []
            for sale_item in sale_items:
                if hasattr(sale_item, "payment_plan"):
                    payment_plan = sale_item.payment_plan

                    # Get payment schedule for this owner
                    payment_schedules = payment_plan.payment_schedule.all().order_by(
                        "payment_number"
                    )
                    schedule_data = [
                        {
                            "payment_number": schedule.payment_number,
                            "due_date": schedule.due_date,
                            "amount": schedule.amount,
                            "status": schedule.status,
                            "paid_date": schedule.paid_date,
                            "paid_amount": schedule.paid_amount,
                        }
                        for schedule in payment_schedules
                    ]

                    payment_plans_data.append(
                        {
                            "owner_name": sale_item.buyer.get_full_name(),
                            "property_name": sale_item.property_node.name,
                            "ownership_percentage": sale_item.ownership_percentage,
                            "sale_price": sale_item.sale_price,
                            "down_payment": sale_item.down_payment,
                            "installment_count": payment_plan.installment_count,
                            "frequency": payment_plan.frequency,
                            "installment_amount": payment_plan.get_installment_amount(),
                            "is_custom": payment_plan.is_custom,
                            "payment_schedule": schedule_data,
                        }
                    )

            return Response(
                {
                    "success": True,
                    "message": "Property sale created successfully",
                    "data": {
                        "id": sale.id,
                        "total_properties": total_properties,
                        "total_buyers": total_buyers,
                        "total_sale_value": total_value,
                        "status": sale.status,
                        "created_at": sale.created_at,
                        "sale_items": [
                            {
                                "property_name": item.property_node.name,
                                "buyer_name": item.buyer.get_full_name(),
                                "sale_price": item.sale_price,
                                "down_payment": item.down_payment,
                                "ownership_percentage": item.ownership_percentage,
                            }
                            for item in sale_items
                        ],
                        "payment_plans": payment_plans_data,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.error(f"Error creating property sale: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "message": "Failed to create property sale",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
