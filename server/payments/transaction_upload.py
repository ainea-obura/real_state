from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime
from decimal import Decimal
import json

from payments.models import InstantPaymentNotification


class BulkTransactionUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            transactions_data = request.data.get('transactions', [])
            
            if not transactions_data:
                return Response({
                    'error': True,
                    'message': 'No transaction data provided',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)

            results = []
            success_count = 0
            error_count = 0

            for i, transaction_data in enumerate(transactions_data):
                try:
                    # Validate required fields (msisdn is optional for Excel uploads)
                    required_fields = ['trans_id', 'trans_amount', 'payment_method', 'trans_time']
                    missing_fields = [field for field in required_fields if not transaction_data.get(field)]
                    
                    if missing_fields:
                        results.append({
                            'row': i + 1,
                            'success': False,
                            'error': f'Missing required fields: {", ".join(missing_fields)}',
                            'data': transaction_data
                        })
                        error_count += 1
                        continue

                    # Check if transaction already exists
                    existing_transaction = InstantPaymentNotification.objects.filter(
                        trans_id=transaction_data['trans_id']
                    ).first()

                    if existing_transaction:
                        results.append({
                            'row': i + 1,
                            'success': False,
                            'error': f'Transaction ID {transaction_data["trans_id"]} already exists',
                            'data': transaction_data
                        })
                        error_count += 1
                        continue

                    # Create transaction
                    transaction = InstantPaymentNotification.objects.create(
                        merchant_code=transaction_data.get('merchant_code', ''),
                        business_short_code=transaction_data.get('business_short_code', ''),
                        invoice_number=transaction_data.get('invoice_number', ''),
                        payment_method=transaction_data['payment_method'],
                        trans_id=transaction_data['trans_id'],
                        third_party_trans_id=transaction_data.get('third_party_trans_id', ''),
                        full_name=transaction_data.get('full_name', ''),
                        first_name=transaction_data.get('first_name', ''),
                        middle_name=transaction_data.get('middle_name', ''),
                        last_name=transaction_data.get('last_name', ''),
                        transaction_type=transaction_data.get('transaction_type', 'payment'),
                        msisdn=transaction_data.get('msisdn', ''),
                        org_account_balance=transaction_data.get('org_account_balance', ''),
                        trans_amount=transaction_data['trans_amount'],
                        trans_time=transaction_data['trans_time'],
                        bill_ref_number=transaction_data.get('bill_ref_number', ''),
                        is_verified=transaction_data.get('is_verified', False),
                    )

                    results.append({
                        'row': i + 1,
                        'success': True,
                        'message': f'Transaction {transaction_data["trans_id"]} created successfully',
                        'data': {
                            'transaction_id': str(transaction.id),
                            'trans_id': transaction.trans_id,
                            'amount': transaction.trans_amount,
                            'account_ref': transaction.bill_ref_number,
                            'phone': transaction.msisdn
                        }
                    })
                    success_count += 1

                except Exception as e:
                    results.append({
                        'row': i + 1,
                        'success': False,
                        'error': f'Error creating transaction: {str(e)}',
                        'data': transaction_data
                    })
                    error_count += 1

            return Response({
                'error': False,
                'message': f'Bulk upload completed. {success_count} successful, {error_count} failed',
                'data': {
                    'total_processed': len(transactions_data),
                    'success_count': success_count,
                    'error_count': error_count,
                    'results': results
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': True,
                'message': f'Error processing bulk upload: {str(e)}',
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
