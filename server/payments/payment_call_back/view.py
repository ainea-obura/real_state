from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import (
    Expense,
    Invoice,
    PayBill,
    PaymentDisparment,
    PaymentRequestTransactions,
    Payout,
    Receipt,
)
from utils.redis_pubsub import (
    notify_expense_status,
    notify_payment_status,
    notify_payout_status,
)


def get_transaction(checkout_id, merchant_id):
    return PaymentRequestTransactions.objects.filter(
        Q(checkout_request_id=checkout_id) & Q(merchant_request_id=merchant_id)
    ).first()


def update_transaction_fields(transaction, update_data):
    for key, value in update_data.items():
        setattr(transaction, key, value)
    transaction.save()


def safe_decimal(value):
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


class PaymentCallBackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        result_code = str(data.get("ResultCode"))
        checkout_id = data.get("CheckoutRequestID")
        merchant_id = data.get("MerchantRequestID")

        transaction = get_transaction(checkout_id, merchant_id)
        if not transaction:
            return Response(
                {"message": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if result_code == "0":
            # Update transaction fields
            update_data = {
                "payment_request_id": data.get("PaymentRequestID"),
                "result_code": result_code,
                "result_desc": data.get("ResultDesc"),
                "amount": data.get("TransAmount", 0),
                "source_channel": data.get("SourceChannel"),
                "bill_ref_number": data.get("BillRefNumber"),
                "transaction_date": data.get("TransactionDate"),
                "customer_mobile": data.get("CustomerMobile"),
                "transaction_code": data.get("TransactionCode"),
                "third_party_trans_id": data.get("ThirdPartyTransID"),
                "pay_status": "Paid",
            }
            update_transaction_fields(transaction, update_data)

            trans_amount_decimal = safe_decimal(data.get("TransAmount", 0))

            # Check if this is a multiple invoice transaction
            if transaction.is_multiple_invoices and transaction.invoices_data:
                # Validate received amount matches expected total
                if (
                    abs(
                        float(trans_amount_decimal)
                        - float(transaction.expected_total_amount)
                    )
                    > 0.01
                ):
                    # Amount mismatch - mark as failed
                    transaction.pay_status = "Failed"
                    transaction.result_desc = f"Amount mismatch. Expected: {transaction.expected_total_amount}, Received: {trans_amount_decimal}"
                    transaction.save()
                    notify_payment_status(transaction.id, "Failed")
                    return Response(
                        {"message": "Payment amount mismatch"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Process multiple invoices
                self._process_multiple_invoices(transaction, trans_amount_decimal)
            else:
                # Process single invoice (backward compatibility)
                self._process_single_invoice(transaction, trans_amount_decimal)

            notify_payment_status(transaction.id, "Paid")
        else:
            update_data = {
                "MerchantRequestID": data.get("MerchantRequestID"),
                "CheckoutRequestID": data.get("CheckoutRequestID"),
                "MerchantCode": data.get("MerchantCode"),
                "PaymentRequestID": data.get("PaymentRequestID"),
                "ResultCode": result_code,
                "ResultDesc": data.get("ResultDesc"),
                "pay_status": "Failed",
            }
            update_transaction_fields(transaction, update_data)
            notify_payment_status(transaction.id, "Failed")

        return Response(
            {"message": "Payment callback received"}, status=status.HTTP_200_OK
        )

    def _process_single_invoice(self, transaction, trans_amount_decimal):
        """Process payment for a single invoice (backward compatibility)"""
        invoice = transaction.invoice

        total_paid_before = (
            invoice.receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
        )
        total_paid_after = float(total_paid_before) + float(trans_amount_decimal)
        new_balance = max(0, float(invoice.total_amount) - total_paid_after)

        print(total_paid_before, total_paid_after, new_balance)

        Receipt.objects.create(
            invoice=invoice,
            paid_amount=trans_amount_decimal,
            balance=new_balance,
            payment_method=transaction.payment_method
            or "unknown",  # Use actual payment method from transaction
        )
        invoice.balance = new_balance
        if invoice.balance == 0:
            invoice.status = "PAID"
            # TODO: Make the related Penalty status PAID
        elif invoice.balance > 0:
            invoice.status = "PARTIAL"
        invoice.save()

    def _process_multiple_invoices(self, transaction, trans_amount_decimal):
        """Process payment for multiple invoices"""
        invoices_data = transaction.invoices_data
        total_received = float(trans_amount_decimal)

        # Calculate total expected amount for validation
        total_expected = sum(float(inv["applied_amount"]) for inv in invoices_data)

        # Validate total amounts match
        if abs(total_received - total_expected) > 0.01:
            raise ValueError(
                f"Amount mismatch. Expected: {total_expected}, Received: {total_received}"
            )

        # Process each invoice
        for inv_data in invoices_data:
            try:
                invoice = Invoice.objects.get(id=inv_data["invoice_id"])
                applied_amount = float(inv_data["applied_amount"])

                # Calculate new balance for this invoice
                total_paid_before = (
                    invoice.receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
                )
                total_paid_after = float(total_paid_before) + applied_amount
                new_balance = max(0, float(invoice.balance) - total_paid_after)

                # Create receipt for this invoice
                Receipt.objects.create(
                    invoice=invoice,
                    paid_amount=applied_amount,
                    balance=new_balance,
                    payment_method=transaction.payment_method
                    or "unknown",  # Use actual payment method from transaction
                )

                # Update invoice status and balance
                invoice.balance = new_balance
                if invoice.balance == 0:
                    invoice.status = "PAID"
                    # TODO: Make the related Penalty status PAID
                elif invoice.balance > 0:
                    invoice.status = "PARTIAL"
                invoice.save()

                print(f"Processed invoice {invoice.invoice_number}: {applied_amount}")

            except Invoice.DoesNotExist:
                print(f"Invoice {inv_data['invoice_id']} not found")
                continue
            except Exception as e:
                print(f"Error processing invoice {inv_data['invoice_id']}: {str(e)}")
                continue


class PayoutCallBackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        result_code = data["ResultCode"]

        if result_code == "0":
            reference_number = data.get("MerchantTransactionReference")
            payouts = PaymentDisparment.objects.filter(
                Q(originator_conversation_id=reference_number)
            ).first()
            payment_data = {
                "merchant_code": data.get("MerchantCode"),
                "destination_channel": data.get("DestinationChannel"),
                "recipient_name": data.get("RecipientName"),
                "recipient_account_number": data.get("RecipientAccountNumber"),
                "result_code": data.get("ResultCode"),
                "checkout_request_id": data.get("CheckoutRequestID"),
                "merchant_request_id": data.get("MerchantRequestID"),
                "result_desc": data.get("ResultDesc"),
                "source_channel": data.get("SourceChannel"),
                "sasapay_transaction_code": data.get("SasaPayTransactionCode"),
                "transaction_date": data.get("TransactionDate"),
                "transaction_amount": data.get("TransactionAmount"),
                "sasapay_transaction_id": data.get("SasaPayTransactionID"),
                "merchant_transaction_reference": data.get(
                    "MerchantTransactionReference"
                ),
                "merchant_account_balance": data.get("MerchantAccountBalance"),
                "transaction_charges": data.get("TransactionCharge"),
                "pay_status": "Paid",
            }

            if payouts:
                for key, value in payment_data.items():
                    setattr(payouts, key, value)
                payouts.save()

            updated_payout = Payout.objects.filter(
                reference_number=reference_number
            ).first()

            if updated_payout:
                updated_payout.status = "completed"
                updated_payout.save()
            else:
                notify_payout_status(reference_number, "Failed")
                return Response(
                    {"message": "Payout not found"}, status=status.HTTP_404_NOT_FOUND
                )

            # Notify payout status via Redis
            notify_payout_status(reference_number, "Paid")

            return Response(
                {"message": "Payout callback received"}, status=status.HTTP_200_OK
            )

        notify_payout_status(reference_number, "Failed")


class ExpenseCallBackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        result_code = data.get("ResultCode")
        originator_id = data.get("MerchantTransactionReference")

        payment_disparment = PaymentDisparment.objects.filter(
            originator_conversation_id=originator_id
        ).first()
        if not payment_disparment:
            notify_expense_status(originator_id, "Failed")
            return Response(
                {"message": "Expense payment transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update PaymentDisparment fields
        payment_data = {
            "merchant_code": data.get("MerchantCode"),
            "destination_channel": data.get("DestinationChannel"),
            "recipient_name": data.get("RecipientName"),
            "recipient_account_number": data.get("RecipientAccountNumber"),
            "result_code": data.get("ResultCode"),
            "checkout_request_id": data.get("CheckoutRequestID"),
            "merchant_request_id": data.get("MerchantRequestID"),
            "result_desc": data.get("ResultDesc"),
            "source_channel": data.get("SourceChannel"),
            "sasapay_transaction_code": data.get("SasaPayTransactionCode"),
            "transaction_date": data.get("TransactionDate"),
            "transaction_amount": data.get("TransactionAmount"),
            "sasapay_transaction_id": data.get("SasaPayTransactionID"),
            "merchant_transaction_reference": data.get("MerchantTransactionReference"),
            "merchant_account_balance": data.get("MerchantAccountBalance"),
            "transaction_charges": data.get("TransactionCharge"),
            "pay_status": "Paid" if result_code == "0" else "Failed",
        }
        for key, value in payment_data.items():
            setattr(payment_disparment, key, value)
        payment_disparment.save()

        # Find the related Expense by parsing the originator_id
        expense = Expense.objects.filter(reference_number=originator_id).first()
        if result_code == "0":
            if expense:
                expense.paid_date = timezone.now().date()
                expense.status = "paid"
                expense.save()
            # Notify Redis of success
            notify_expense_status(originator_id, "Paid")
            return Response(
                {"message": "Expense payment callback received and processed."},
                status=status.HTTP_200_OK,
            )
        else:
            notify_expense_status(originator_id, "Failed")
            return Response(
                {"message": "Expense payment failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CreditNoteCallBackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        print("Credit note callback data:", data)
        result_code = str(data.get("ResultCode"))
        reference_number = data.get("MerchantTransactionReference")

        # Find transaction by reference number (payout_withdrawal format)
        transaction = PaymentRequestTransactions.objects.filter(
            transaction_reference=reference_number
        ).first()

        if not transaction:
            return Response(
                {"message": "Credit note transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if result_code == "0":
            # Update transaction fields for payout_withdrawal response
            update_data = {
                "result_code": result_code,
                "result_desc": data.get("ResultDesc"),
                "amount": data.get("TransactionAmount", 0),
                "source_channel": data.get("SourceChannel"),
                "destination_channel": data.get("DestinationChannel"),
                "recipient_name": data.get("RecipientName"),
                "recipient_account_number": data.get("RecipientAccountNumber"),
                "transaction_date": data.get("TransactionDate"),
                "sasapay_transaction_code": data.get("SasaPayTransactionCode"),
                "sasapay_transaction_id": data.get("SasaPayTransactionID"),
                "merchant_account_balance": data.get("MerchantAccountBalance"),
                "transaction_charges": data.get("TransactionCharge"),
                "pay_status": "Paid",
            }
            update_transaction_fields(transaction, update_data)

            # Process credit note - update invoice and create negative receipt
            if transaction.invoices_data:
                credit_data = transaction.invoices_data[
                    0
                ]  # Single invoice for credit note
                try:
                    invoice = Invoice.objects.get(id=credit_data["invoice_id"])
                    credit_amount = float(credit_data["credit_amount"])
                    reason = credit_data.get("reason", "")
                    description = credit_data.get("description", "")

                    # Update invoice balance
                    invoice.balance = max(0, float(invoice.balance) - credit_amount)
                    invoice.save()

                    # Create negative receipt for credit note
                    Receipt.objects.create(
                        invoice=invoice,
                        paid_amount=-credit_amount,  # Negative amount for credit
                        balance=invoice.balance,
                        payment_method=transaction.payment_method
                        or "credit_note",  # Use actual payment method if available
                        notes=f"Credit note: {reason} - {description}",
                    )

                    print(
                        f"Credit note processed: Invoice {invoice.invoice_number}, Amount: {credit_amount}"
                    )

                except Invoice.DoesNotExist:
                    print(
                        f"Invoice {credit_data['invoice_id']} not found for credit note"
                    )
                except Exception as e:
                    print(f"Error processing credit note: {str(e)}")

            # Notify credit note status via Redis
            notify_payment_status(transaction.id, "Paid")

        else:
            update_data = {
                "result_code": result_code,
                "result_desc": data.get("ResultDesc"),
                "pay_status": "Failed",
            }
            update_transaction_fields(transaction, update_data)
            notify_payment_status(transaction.id, "Failed")

        return Response(
            {"message": "Credit note callback received"}, status=status.HTTP_200_OK
        )


class PayBillCallBackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        print("Pay bill callback data:", data)
        result_code = str(data.get("ResultCode"))
        checkout_request_id = data.get("CheckoutRequestID")

        # Find transaction by reference number (payout_withdrawal format)
        transaction = PayBill.objects.filter(
            checkout_request_id=checkout_request_id
        ).first()

        if not transaction:
            return Response(
                {"message": "Pay bill transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if result_code == "0":
            # Update transaction fields for payout_withdrawal response
            update_data = {
                "merchant_request_id": data.get("MerchantRequestID"),
                "checkout_request_id": data.get("CheckoutRequestID"),
                "result_code": data.get("ResultCode"),
                "result_desc": data.get("ResultDesc"),
                "merchant_code": data.get("MerchantCode"),
                "transaction_amount": data.get("TransactionAmount"),
                "transaction_charge": data.get("TransactionCharge"),
                "merchant_fees": data.get("MerchantFees"),
                "merchant_account_balance": data.get("MerchantAccountBalance"),
                "source_channel": data.get("SourceChannel"),
                "sasapay_transaction_id": data.get("SasaPayTransactionID"),
                "recipient_name": data.get("RecipientName"),
                "sender_account_number": data.get("SenderAccountNumber"),
            }
            for key, value in update_data.items():
                setattr(transaction, key, value)
            transaction.save()

            if transaction.type == "expense":
                expense = Expense.objects.filter(
                    reference_number=transaction.reference_number
                ).first()

                if expense:
                    expense.paid_date = timezone.now().date()
                    # Use safe_decimal to handle None values and convert to Decimal
                    transaction_amount = safe_decimal(transaction.transaction_amount)
                    expense.paid_amount += transaction_amount
                    expense.save()

                    expense.status = (
                        "paid"
                        if expense.paid_amount == expense.total_amount
                        else "partial"
                    )
                    expense.save()

            if transaction.type == "payout":
                payout = Payout.objects.filter(
                    reference_number=transaction.reference_number
                ).first()
                if payout:
                    # Use safe_decimal to handle None values and convert to Decimal
                    transaction_amount = safe_decimal(transaction.transaction_amount)
                    payout.paid_amount += transaction_amount
                    payout.save()

                    payout.status = (
                        "paid" if payout.paid_amount == payout.net_amount else "partial"
                    )
                    payout.save()

            notify_payment_status(transaction.reference_number, "Paid")
            return Response(
                {"message": "Pay bill callback received"}, status=status.HTTP_200_OK
            )

        notify_payment_status(transaction.reference_number, "Failed")
        return Response(
            {"message": "Pay bill callback received"}, status=status.HTTP_200_OK
        )
