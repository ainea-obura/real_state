from decimal import Decimal
from django.db.models import Sum, Q, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from sales.models import PropertySale, PropertySaleItem, SaleCommission, SalesPerson
from accounts.models import Users
from properties.models import LocationNode


class CommissionCalculationView(APIView):
    """
    Calculate and manage commissions based on contract signing and down payment collection
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Calculate commission for a sale after contract is signed"""
        try:
            sale_id = request.data.get('sale_id')
            if not sale_id:
                return Response({
                    "error": True,
                    "message": "Sale ID is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get the sale
            try:
                sale = PropertySale.objects.get(id=sale_id)
            except PropertySale.DoesNotExist:
                return Response({
                    "error": True,
                    "message": "Sale not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if sale has an assigned sales person
            if not sale.assigned_sales_person:
                return Response({
                    "error": True,
                    "message": "No sales person assigned to this sale"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate total sale value
            total_sale_value = PropertySaleItem.objects.filter(
                sale=sale
            ).aggregate(total=Sum('sale_price'))['total'] or Decimal('0')

            # Calculate 3% commission
            commission_rate = Decimal('3.0')  # 3%
            commission_amount = (total_sale_value * commission_rate) / Decimal('100')

            # Create or update commission record
            commission, created = SaleCommission.objects.get_or_create(
                sale=sale,
                agent=sale.assigned_sales_person.user,
                defaults={
                    'commission_amount': commission_amount,
                    'commission_type': '%',
                    'commission_rate': commission_rate,
                    'status': 'pending',
                    'notes': f'3% commission after contract signing for sale {sale.id}'
                }
            )

            if not created:
                # Update existing commission
                commission.commission_amount = commission_amount
                commission.commission_rate = commission_rate
                commission.status = 'pending'
                commission.notes = f'3% commission after contract signing for sale {sale.id}'
                commission.save()

            return Response({
                "error": False,
                "message": "Commission calculated successfully",
                "data": {
                    "commission_id": commission.id,
                    "sale_id": sale.id,
                    "agent_name": sale.assigned_sales_person.user.get_full_name(),
                    "total_sale_value": float(total_sale_value),
                    "commission_rate": float(commission_rate),
                    "commission_amount": float(commission_amount),
                    "status": commission.status,
                    "created": created
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error calculating commission: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownPaymentTrackingView(APIView):
    """
    Track down payment collection (20% of sale price)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get down payment tracking data"""
        try:
            # Get all sales with down payment information
            sales_with_down_payments = PropertySaleItem.objects.select_related(
                'sale', 'sale__assigned_sales_person__user', 'property_node'
            ).filter(
                sale__status__in=['active', 'completed']
            )

            down_payment_data = []
            total_expected_down_payments = Decimal('0')
            total_collected_down_payments = Decimal('0')

            for sale_item in sales_with_down_payments:
                sale = sale_item.sale
                expected_down_payment = sale_item.down_payment
                collected_down_payment = sale_item.down_payment  # Assuming down payment is collected when set
                
                # Calculate 20% of sale price
                twenty_percent = (sale_item.sale_price * Decimal('20')) / Decimal('100')
                
                down_payment_data.append({
                    "sale_id": sale.id,
                    "property_name": sale_item.property_node.name,
                    "sale_price": float(sale_item.sale_price),
                    "expected_down_payment_20_percent": float(twenty_percent),
                    "actual_down_payment": float(expected_down_payment),
                    "down_payment_percentage": float(sale_item.down_payment_percentage),
                    "agent_name": sale.assigned_sales_person.user.get_full_name() if sale.assigned_sales_person else "Unassigned",
                    "sale_status": sale.status,
                    "sale_date": sale.sale_date.isoformat(),
                    "is_down_payment_collected": expected_down_payment > 0,
                    "down_payment_variance": float(expected_down_payment - twenty_percent)
                })

                total_expected_down_payments += twenty_percent
                total_collected_down_payments += collected_down_payment

            # Calculate collection rate
            collection_rate = (total_collected_down_payments / total_expected_down_payments * 100) if total_expected_down_payments > 0 else 0

            return Response({
                "error": False,
                "message": "Down payment tracking data retrieved successfully",
                "data": {
                    "down_payments": down_payment_data,
                    "summary": {
                        "total_expected_down_payments": float(total_expected_down_payments),
                        "total_collected_down_payments": float(total_collected_down_payments),
                        "collection_rate": float(collection_rate),
                        "total_sales": len(down_payment_data)
                    }
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error retrieving down payment data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CommissionManagementView(APIView):
    """
    Manage commission payments and status updates
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all commissions with filtering options"""
        try:
            # Get query parameters
            status_filter = request.GET.get('status', 'all')
            agent_id = request.GET.get('agent_id')
            date_from = request.GET.get('date_from')
            date_to = request.GET.get('date_to')

            # Build query
            commissions_query = SaleCommission.objects.select_related(
                'sale', 'agent', 'sale__assigned_sales_person__user'
            ).all()

            # Apply filters
            if status_filter != 'all':
                commissions_query = commissions_query.filter(status=status_filter)
            
            if agent_id:
                commissions_query = commissions_query.filter(agent_id=agent_id)
            
            if date_from:
                commissions_query = commissions_query.filter(sale__sale_date__gte=date_from)
            
            if date_to:
                commissions_query = commissions_query.filter(sale__sale_date__lte=date_to)

            commissions_data = []
            total_pending_amount = Decimal('0')
            total_paid_amount = Decimal('0')

            for commission in commissions_query:
                # Get sale items for this commission
                sale_items = PropertySaleItem.objects.filter(sale=commission.sale)
                total_sale_value = sum(item.sale_price for item in sale_items)
                total_down_payment = sum(item.down_payment for item in sale_items)

                commission_data = {
                    "commission_id": commission.id,
                    "sale_id": commission.sale.id,
                    "agent_name": commission.agent.get_full_name(),
                    "agent_email": commission.agent.email,
                    "total_sale_value": float(total_sale_value),
                    "total_down_payment": float(total_down_payment),
                    "commission_rate": float(commission.commission_rate) if commission.commission_rate else 0,
                    "commission_amount": float(commission.commission_amount),
                    "status": commission.status,
                    "sale_date": commission.sale.sale_date.isoformat(),
                    "paid_date": commission.paid_date.isoformat() if commission.paid_date else None,
                    "paid_amount": float(commission.paid_amount) if commission.paid_amount else 0,
                    "notes": commission.notes,
                    "properties": [
                        {
                            "name": item.property_node.name,
                            "sale_price": float(item.sale_price),
                            "down_payment": float(item.down_payment)
                        }
                        for item in sale_items
                    ]
                }

                commissions_data.append(commission_data)

                # Calculate totals
                if commission.status == 'pending':
                    total_pending_amount += commission.commission_amount
                elif commission.status == 'paid':
                    total_paid_amount += commission.paid_amount or commission.commission_amount

            return Response({
                "error": False,
                "message": "Commission data retrieved successfully",
                "data": {
                    "commissions": commissions_data,
                    "summary": {
                        "total_commissions": len(commissions_data),
                        "total_pending_amount": float(total_pending_amount),
                        "total_paid_amount": float(total_paid_amount),
                        "pending_count": len([c for c in commissions_data if c['status'] == 'pending']),
                        "paid_count": len([c for c in commissions_data if c['status'] == 'paid'])
                    }
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error retrieving commission data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request):
        """Update commission status (approve, pay, etc.)"""
        try:
            commission_id = request.data.get('commission_id')
            new_status = request.data.get('status')
            paid_amount = request.data.get('paid_amount')
            notes = request.data.get('notes', '')

            if not commission_id or not new_status:
                return Response({
                    "error": True,
                    "message": "Commission ID and status are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                commission = SaleCommission.objects.get(id=commission_id)
            except SaleCommission.DoesNotExist:
                return Response({
                    "error": True,
                    "message": "Commission not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Update commission
            commission.status = new_status
            
            if new_status == 'paid':
                commission.paid_date = timezone.now().date()
                commission.paid_amount = Decimal(str(paid_amount)) if paid_amount else commission.commission_amount
            
            if notes:
                commission.notes = notes
            
            commission.save()

            return Response({
                "error": False,
                "message": f"Commission {new_status} successfully",
                "data": {
                    "commission_id": commission.id,
                    "status": commission.status,
                    "paid_date": commission.paid_date.isoformat() if commission.paid_date else None,
                    "paid_amount": float(commission.paid_amount) if commission.paid_amount else 0
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": True,
                "message": f"Error updating commission: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




