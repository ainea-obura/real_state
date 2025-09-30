import datetime
import json
import os
import time
import uuid

import requests

from django.core.cache import cache
from django.db.models import Max, Sum
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from requests.auth import HTTPBasicAuth
from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from payments.models import (
    InstantPaymentNotification,
    Invoice,
    PaymentRequestTransactions,
    Receipt,
)
from payments.serializers.payment import (
    CreateCreditNoteSerializer,
    CreatePaymentSerializer,
    PaymentStatsSerializer,
    PaymentTableItemSerializer,
    PaymentTableResponseSerializer,
    UnpaidInvoiceSerializer,
)
from properties.models import PropertyOwner, PropertyTenant
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.exception_handler import flatten_errors
from utils.format import format_money_with_currency
from utils.payments import get_payment_request, payout_withdrawal
from utils.redis_pubsub import wait_for_payment_status


@extend_schema(
    tags=["Payments"],
    description="Get all unpaid invoices for a tenant or owner user. Returns count and results list. Query params: user_id (required, Users table), recipient_type ('tenant' or 'owner', required).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True), name="dispatch"
)
class UnpaidInvoicesForUserView(APIView):
    def get(self, request):
        user_id = request.query_params.get("user_id")
        recipient_type = request.query_params.get("recipient_type")
        if not user_id:
            return Response(
                {"error": True, "message": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if recipient_type not in ("tenant", "owner"):
            return Response(
                {
                    "error": True,
                    "message": "recipient_type must be 'tenant' or 'owner'.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = Users.objects.get(id=user_id, type=recipient_type)
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only consider invoices with status PARTIAL or OVERDUE and balance > 0
        status_filter = ["PARTIAL", "OVERDUE", "ISSUED"]

        if recipient_type == "tenant":
            property_tenants = PropertyTenant.objects.filter(tenant_user=user)
            invoices = Invoice.objects.filter(
                status__in=status_filter,
                tenants__in=property_tenants,
            ).distinct()
        else:  # owner
            property_owners = PropertyOwner.objects.filter(owner_user=user)
            invoices = Invoice.objects.filter(
                status__in=status_filter,
                owners__in=property_owners,
            ).distinct()

        # Only include invoices with balance > 0
        unpaid_invoices = [
            inv
            for inv in invoices
            if getattr(inv, "balance", None) is not None and inv.balance > 0
        ]

        serializer = UnpaidInvoiceSerializer(unpaid_invoices, many=True)
        data = {
            "count": len(serializer.data),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


def token():
    url = "https://sandbox.sasapay.app/api/v1/auth/token/?grant_type=client_credentials"
    params = {"grant_type": "client_credentials"}
    res = requests.get(
        url,
        auth=HTTPBasicAuth(
            "40tcB9ytloIYRTUbuG3LNdYT7TTCc7SYGIeU7T65",
            "gvye9Sk6TnfCQiP7rqaXUQ9aaOohw6AySO0tBLTbybpDuuJrSQmU8dKxfpK9hEI6aTQGYX1scqAgyUWvvUgXBltSXjC7C4JimMDtX3vMzGiSXJZuoONwrsUoV5Va3dsD",
        ),
        params=params,
    )
    response = json.loads(res.text)
    access_token = response["access_token"]
    return access_token


@extend_schema(
    tags=["Payments"],
    description="Record a payment against one or more invoices. Accepts recipient info, payment details, and applied amounts. Creates Receipt(s) and updates Invoice status/balance.",
    request=CreatePaymentSerializer,
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class RecordPaymentView(CreateAPIView):
    serializer_class = CreatePaymentSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        recipient_id = data["recipient"]["id"]
        recipient_type = data["recipientType"]
        payment_method = data["paymentMethod"]
        invoices_applied = data["invoicesApplied"]
        trans_ids = data.get("trans_ids", [])

        # Validate all invoices first
        validated_invoices = []
        total_amount = 0

        for inv_applied in invoices_applied:
            try:
                invoice = Invoice.objects.get(id=inv_applied["id"])
            except Invoice.DoesNotExist:
                return Response(
                    {
                        "error": True,
                        "message": f"Invoice {inv_applied['id']} not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Validate recipient permissions
            if recipient_type == "tenant":
                if not invoice.tenants.filter(tenant_user__id=recipient_id).exists():
                    return Response(
                        {
                            "error": True,
                            "message": f"User {recipient_id} is not a tenant on invoice {invoice.id}.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif recipient_type == "owner":
                if not invoice.owners.filter(owner_user__id=recipient_id).exists():
                    return Response(
                        {
                            "error": True,
                            "message": f"User {recipient_id} is not an owner on invoice {invoice.id}.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            applied_amount = float(inv_applied["appliedAmount"])
            total_amount += applied_amount

            validated_invoices.append(
                {
                    "invoice": invoice,
                    "applied_amount": applied_amount,
                    "invoice_data": inv_applied,
                }
            )

        # Handle cash payments
        if payment_method == "cash":
            for inv_data in validated_invoices:
                invoice = inv_data["invoice"]
                applied_amount = inv_data["applied_amount"]

                total_paid_before = (
                    invoice.receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
                )
                total_paid_after = float(total_paid_before) + applied_amount
                new_balance = max(0, float(invoice.balance) - total_paid_after)

                Receipt.objects.create(
                    invoice=invoice,
                    paid_amount=applied_amount,
                    balance=new_balance,
                )
                invoice.balance = new_balance
                if invoice.balance == 0:
                    invoice.status = "PAID"
                elif invoice.balance > 0:
                    invoice.status = "PARTIAL"
                invoice.save()

            return Response(
                {"error": False, "message": "Cash payment recorded successfully."},
                status=status.HTTP_200_OK,
            )

        # Handle automatic collection
        if payment_method == "paybill/buygoods":
            for inv_data in validated_invoices:
                invoice = inv_data["invoice"]
                applied_amount = inv_data["applied_amount"]

                total_paid_before = (
                    invoice.receipts.aggregate(total=Sum("paid_amount"))["total"] or 0
                )
                total_paid_after = float(total_paid_before) + applied_amount
                new_balance = max(0, float(invoice.balance) - total_paid_after)

                Receipt.objects.create(
                    invoice=invoice,
                    paid_amount=applied_amount,
                    balance=new_balance,
                )
                invoice.balance = new_balance
                if invoice.balance == 0:
                    invoice.status = "PAID"
                elif invoice.balance > 0:
                    invoice.status = "PARTIAL"
                invoice.save()

            # Unverifying the transactions
            for trans_id in trans_ids:
                InstantPaymentNotification.objects.filter(
                    trans_id=trans_id,
                ).update(is_verified=False)

            return Response(
                    {"error": False, "message": "Cash payment recorded successfully."},
                status=status.HTTP_200_OK,
            )

        # Handle non-cash payments (single payment request for total amount)
        token_access = token()
        if not token_access:
            return Response(
                {"error": True, "message": "Failed to generate payment token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user phone number from first invoice
        first_invoice = validated_invoices[0]["invoice"]
        user_phone = ""
        if recipient_type == "tenant":
            user_phone = first_invoice.tenants.first().tenant_user.phone
        else:
            user_phone = first_invoice.owners.first().owner_user.phone

        # Create description for multiple invoices
        if len(validated_invoices) == 1:
            transaction_desc = f"Payment for invoice {first_invoice.invoice_number}"
            account_ref = f"INV-{first_invoice.issue_date.year}-{str(first_invoice.invoice_number).zfill(3)}"
        else:
            transaction_desc = f"Payment for {len(validated_invoices)} invoices"
            account_ref = f"MULTI-{first_invoice.issue_date.year}-{str(first_invoice.invoice_number).zfill(3)}"

        payment_request = get_payment_request(
            merchant_code=os.environ.get("MERCHANT_CODE"),
            network_code=payment_method,
            amount=total_amount,
            callback_url=os.environ.get("CALLBACK_URL"),
            phone_number=user_phone,
            transaction_desc=transaction_desc,
            account_ref=account_ref,
            currency="KES",
            transaction_fee=0,
            token=token_access,
        )

        if payment_request["ResponseCode"] != "0":
            return Response(
                {"error": True, "message": payment_request["detail"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store invoice data for callback processing
        invoices_data = []
        for inv_data in validated_invoices:
            invoices_data.append(
                {
                    "invoice_id": str(inv_data["invoice"].id),
                    "invoice_number": inv_data["invoice"].invoice_number,
                    "applied_amount": inv_data["applied_amount"],
                    "total_amount": float(inv_data["invoice"].total_amount),
                }
            )

        # Create transaction record with multiple invoice support
        payment_request_transaction = PaymentRequestTransactions.objects.create(
            user_id=validated_invoices[0]["invoice"].tenants.first().tenant_user
            if recipient_type == "tenant"
            else validated_invoices[0]["invoice"].owners.first().owner_user,
            invoice=first_invoice,  # Keep reference to first invoice for backward compatibility
            payment_gateway=payment_request["PaymentGateway"],
            merchant_request_id=payment_request["MerchantRequestID"],
            checkout_request_id=payment_request["CheckoutRequestID"],
            transaction_reference=payment_request["TransactionReference"],
            response_code=payment_request["ResponseCode"],
            response_description=payment_request["ResponseDescription"],
            status="pending",
            invoices_data=invoices_data,
            expected_total_amount=total_amount,
            is_multiple_invoices=len(validated_invoices) > 1,
        )

        # Wait for payment confirmation using Redis Pub/Sub
        status_result = wait_for_payment_status(
            payment_request_transaction.id, timeout=60
        )
        if status_result == "Paid":
            return Response(
                {"error": False, "message": "Payment successful."},
                status=status.HTTP_200_OK,
            )
        elif status_result == "Failed":
            return Response(
                {"error": True, "message": "Payment failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            return Response(
                {"error": True, "message": "Payment confirmation timed out."},
                status=status.HTTP_408_REQUEST_TIMEOUT,
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            error_text = flatten_errors(serializer.errors)
            return Response(
                {"error": True, "message": error_text},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self.perform_create(serializer)
        return Response(
            {"error": False, "message": "Payment recorded successfully."},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Payments"],
    description="Create a credit note and send refund to recipient. Updates invoice balance and creates negative receipt after successful payment callback.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True), name="dispatch"
)
class CreateCreditNoteView(CreateAPIView):
    serializer_class = CreateCreditNoteSerializer

    def perform_create(self, serializer):
        if not serializer.is_valid():
            error_text = flatten_errors(serializer.errors)
            return Response(
                {"error": True, "message": error_text},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        invoice_id = data["invoice_id"]
        credit_amount = data["amount"]
        reason = data.get("reason", "")
        description = data.get("description", "")
        payment_method = data.get(
            "paymentMethod", "cash"
        )  # Get payment method from request data
        account_number = data.get(
            "accountNumber", ""
        )  # Get account number from request data

        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": f"Invoice {invoice_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate credit amount
        if credit_amount <= 0:
            return Response(
                {"error": True, "message": "Credit amount must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if credit_amount > float(invoice.balance):
            return Response(
                {
                    "error": True,
                    "message": "Credit amount cannot exceed invoice balance.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate account number (not required for cash)
        if payment_method != "cash" and not account_number:
            return Response(
                {
                    "error": True,
                    "message": "Account number is required for non-cash payments.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get recipient type for transaction record (still needed for user_id in PaymentRequestTransactions)
        recipient_type = ""
        if invoice.tenants.exists():
            recipient_type = "tenant"
        elif invoice.owners.exists():
            recipient_type = "owner"
        else:
            return Response(
                {"error": True, "message": "No recipient found for this invoice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Handle cash payments directly (no API call needed)
        if payment_method == "cash":
            # Update invoice balance
            invoice.balance = max(0, float(invoice.balance) - float(credit_amount))
            invoice.save()

            # Create negative receipt for credit note
            Receipt.objects.create(
                invoice=invoice,
                paid_amount=-float(credit_amount),  # Negative amount for credit
                balance=invoice.balance,
                payment_method="credit_note",
                notes=f"Credit note: {reason} - {description}",
            )

            return Response(
                {
                    "error": False,
                    "message": "Cash credit note processed successfully.",
                    "data": {
                        "amount": float(credit_amount),
                        "recipient_phone": account_number,
                    },
                },
                status=status.HTTP_200_OK,
            )

        # Generate payment token for non-cash payments
        token_access = token()
        if not token_access:
            return Response(
                {"error": True, "message": "Failed to generate payment token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate reference number for credit note
        gen_ref_number = (
            f"CREDIT-{invoice.invoice_number}-"
            f"{datetime.datetime.now().strftime('%d-%m-%y %I:%M:%S %p')}-"
            f"{uuid.uuid4().hex[:8]}"
        )

        # Use payout_withdrawal for disbursement (sending money to user)
        payout_response = payout_withdrawal(
            MerchantCode=os.environ.get("MERCHANT_CODE"),
            MerchantTransactionReference=gen_ref_number,
            Amount=str(float(credit_amount)),
            ReceiverNumber=str(account_number),  # Use account_number here
            Channel=str(payment_method),
            Reason=f"Credit note refund for invoice {invoice.invoice_number}",
            CallBackURL=os.environ.get("CALLBACK_URL_FOR_CREDIT"),
            token=token_access,
            Currency="KES",
        )

        if payout_response.get("ResponseCode") != "0":
            return Response(
                {"error": True, "message": payout_response.get("detail")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create transaction record for credit note
        credit_transaction = PaymentRequestTransactions.objects.create(
            user_id=invoice.tenants.first().tenant_user
            if recipient_type == "tenant"
            else invoice.owners.first().owner_user,
            invoice=invoice,
            payment_gateway=payout_response.get("PaymentGateway"),
            merchant_request_id=payout_response.get("MerchantRequestID"),
            checkout_request_id=payout_response.get("CheckoutRequestID"),
            transaction_reference=gen_ref_number,
            response_code=payout_response.get("ResponseCode"),
            response_description=payout_response.get("ResponseDescription"),
            status="pending",
            amount=str(float(credit_amount)),
            invoices_data=[
                {
                    "invoice_id": str(invoice.id),
                    "invoice_number": invoice.invoice_number,
                    "credit_amount": float(credit_amount),
                    "reason": reason,
                    "description": description,
                    "recipient_type": recipient_type,
                    "recipient_phone": account_number,  # Use account_number here
                    "payment_method": payment_method,  # Added
                }
            ],
            expected_total_amount=float(credit_amount),
            is_multiple_invoices=False,
        )

        # Wait for payment confirmation using Redis Pub/Sub
        status_result = wait_for_payment_status(credit_transaction.id, timeout=60)

        if status_result == "Paid":
            return Response(
                {
                    "error": False,
                    "message": "Credit note payment initiated successfully.",
                    "data": {
                        "transaction_id": str(credit_transaction.id),
                        "amount": float(credit_amount),
                        "recipient_phone": account_number,
                    },
                },
                status=status.HTTP_200_OK,
            )
        elif status_result == "Failed":
            return Response(
                {"error": True, "message": "Credit note payment failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            return Response(
                {
                    "error": True,
                    "message": "Credit note payment confirmation timed out.",
                },
                status=status.HTTP_408_REQUEST_TIMEOUT,
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            error_text = flatten_errors(serializer.errors)
            return Response(
                {"error": True, "message": error_text},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self.perform_create(serializer)


@extend_schema(
    tags=["Payments"],
    responses={200: PaymentStatsSerializer},
    description="Get summary statistics for payments (stat cards). Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD for date range filtering.",
)
class PaymentStatsSummaryView(ListAPIView):
    serializer_class = PaymentStatsSerializer

    def list(self, request, *args, **kwargs):
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        receipt_qs = Receipt.objects.all()
        invoice_qs = Invoice.objects.all()
        # Date range filtering
        try:
            if from_str:
                from_date = datetime.datetime.strptime(from_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__gte=from_date)
                invoice_qs = invoice_qs.filter(issue_date__gte=from_date)
            if to_str:
                to_date = datetime.datetime.strptime(to_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__lte=to_date)
                invoice_qs = invoice_qs.filter(issue_date__lte=to_date)
        except ValueError as e:
            return Response(
                {"error": True, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_payments = receipt_qs.count()
        total_amount_paid = receipt_qs.aggregate(total=Sum("paid_amount"))["total"] or 0
        total_invoices = invoice_qs.count()
        total_outstanding = invoice_qs.aggregate(total=Sum("balance"))["total"] or 0
        last_payment_date = receipt_qs.aggregate(last=Max("payment_date"))["last"]

        data = {
            "totalPayments": total_payments,
            "totalAmountPaid": format_money_with_currency(float(total_amount_paid)),
            "totalInvoices": total_invoices,
            "totalOutstanding": format_money_with_currency(float(total_outstanding)),
            "lastPaymentDate": (
                last_payment_date.date().isoformat() if last_payment_date else None
            ),
            "currency": get_serialized_default_currency(),
        }
        serializer = self.get_serializer(data)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(
    tags=["Payments"],
    responses={200: PaymentTableResponseSerializer},
    description="List all payments (paginated, cached, filterable by date range). Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&page_size=10.",
)
class PaymentTableListView(ListAPIView):
    serializer_class = PaymentTableItemSerializer
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        receipt_qs = Receipt.objects.select_related("invoice").all()
        from_str = self.request.query_params.get("from")
        to_str = self.request.query_params.get("to")
        if from_str:
            try:
                from_date = datetime.datetime.strptime(from_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__gte=from_date)
            except Exception:
                pass
        if to_str:
            try:
                to_date = datetime.datetime.strptime(to_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__lte=to_date)
            except Exception:
                pass
        return receipt_qs.order_by("-payment_date", "-id")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        from_str = request.query_params.get("from", "")
        to_str = request.query_params.get("to", "")
        filters = f"from:{from_str}:to:{to_str}"
        receipt_qs = Receipt.objects.select_related("invoice").all()
        if from_str:
            try:
                from_date = datetime.datetime.strptime(from_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__gte=from_date)
            except Exception:
                pass
        if to_str:
            try:
                to_date = datetime.datetime.strptime(to_str, "%Y-%m-%d").date()
                receipt_qs = receipt_qs.filter(payment_date__date__lte=to_date)
            except Exception:
                pass
        qs = receipt_qs.order_by("-payment_date", "-id")
        page = self.paginate_queryset(qs)

        def build_item(receipt):
            invoice = receipt.invoice
            # Compose the payment row as per PaymentTableItemSchema
            return {
                "id": str(receipt.id),
                # Use receipt.receipt_number for paymentNumber, formatted like invoice number
                "paymentNumber": (
                    f"RV-{receipt.payment_date.year}-{str(receipt.receipt_number).zfill(4)}"  # noqa: E501
                    if hasattr(receipt, "receipt_number")
                    and receipt.receipt_number is not None
                    else ""
                ),
                "tenant": {
                    "name": (
                        invoice.tenants.first().tenant_user.get_full_name()
                        if invoice.tenants.exists()
                        else (
                            invoice.owners.first().owner_user.get_full_name()
                            if invoice.owners.exists()
                            else ""
                        )
                    ),
                    "email": (
                        invoice.tenants.first().tenant_user.email
                        if invoice.tenants.exists()
                        else (
                            invoice.owners.first().owner_user.email
                            if invoice.owners.exists()
                            else ""
                        )
                    ),
                    "phone": (
                        invoice.tenants.first().tenant_user.phone
                        if invoice.tenants.exists()
                        else (
                            invoice.owners.first().owner_user.phone
                            if invoice.owners.exists()
                            else ""
                        )
                    ),
                },
                "property": {
                    "unit": invoice.property.name if invoice.property else "",
                    "projectName": (
                        next(
                            (
                                a.name
                                for a in invoice.property.get_ancestors(
                                    include_self=True
                                )
                                if a.node_type == "PROJECT"
                            ),
                            "",
                        )
                        if invoice.property
                        else ""
                    ),
                },
                "paymentDate": receipt.payment_date.isoformat(),
                "paymentMethod": "cash",  # TODO: update if you have payment method field
                "amountPaid": format_money_with_currency(float(receipt.paid_amount)),
                "amountPaidNoCurrency": float(receipt.paid_amount),
                "invoicesApplied": [
                    {
                        "id": str(invoice.id),
                        "invoiceNumber": f"INV-{invoice.issue_date.year}-{str(invoice.invoice_number).zfill(3)}",
                        "amount": format_money_with_currency(
                            float(invoice.total_amount)
                        ),
                    }
                ],
                "balanceRemaining": format_money_with_currency(float(receipt.balance)),
                "status": "success",  # TODO: update if you have payment status field
                "notes": invoice.description or "",
                "receiptUrl": None,
                "createdBy": "",  # TODO: fill if you have creator info
                "createdAt": receipt.payment_date.isoformat(),
                "updatedAt": None,
            }

        if page is not None:
            items = [build_item(receipt) for receipt in page]
            paginated_response = self.get_paginated_response(items)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        items = [build_item(receipt) for receipt in qs]
        data = {
            "count": qs.count(),
            "results": items,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
