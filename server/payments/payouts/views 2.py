import json

# from utils.get_sassa_pay_token import token
import os
import uuid

from datetime import datetime, timezone

import requests

from django.db.models import Sum
from django.utils.dateparse import parse_date
from requests.auth import HTTPBasicAuth
from rest_framework import generics, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.decorators import api_view

from payments.models import PayBill, PaymentDisparment, Payout
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.format import format_money_with_currency
from utils.payments import pay_bills, payout_withdrawal
from utils.redis_pubsub import (
    wait_for_payment_status,
    wait_for_payout_status_payout,
)
from utils.serilaizer import flatten_errors

from .serializers import PayoutSerializer, PayoutStatusUpdateSerializer


class PayoutListView(generics.ListAPIView):
    serializer_class = PayoutSerializer
    pagination_class = CustomPageNumberPagination
    queryset = Payout.objects.all().order_by("-created_at")

    def get_queryset(self):
        queryset = super().get_queryset()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=parse_date(date_from))
        if date_to:
            queryset = queryset.filter(created_at__date__lte=parse_date(date_to))
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        response = super().list(request, *args, **kwargs)
        # Calculate summary based on filtered queryset
        total_payouts = queryset.count()
        pending = queryset.filter(status="pending").count()
        total_amount = queryset.aggregate(total=Sum("net_amount"))["total"] or 0
        completed_amount = (
            queryset.filter(status="completed").aggregate(total=Sum("net_amount"))[
                "total"
            ]
            or 0
        )
        currency = get_serialized_default_currency()
        summary = {
            "total_payouts": str(total_payouts),
            "pending": str(pending),
            "total_amount": format_money_with_currency(total_amount),
            "completed_amount": format_money_with_currency(completed_amount),
        }
        return Response({"error": False, "data": response.data, "summary": summary})


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


class PayoutStatusUpdateView(RetrieveUpdateAPIView):
    queryset = Payout.objects.all()
    serializer_class = PayoutStatusUpdateSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = serializer.validated_data.get("payment_method")
        account = serializer.validated_data.get("account")
        tab = serializer.validated_data.get("tab")
        reference = serializer.validated_data.get("reference")
        paybill_option = serializer.validated_data.get("paybill_option")
        paybill_number = serializer.validated_data.get("paybill_number")
        amount = serializer.validated_data.get("amount")

        if float(amount) > (instance.net_amount - instance.paid_amount):
            return Response(
                {"error": True, "message": "Payout amount is greater than net amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate required fields based on tab
        if not payment_method:
            return Response(
                {"error": True, "message": "Payment method is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tab == "paybill":
            if not account:
                field_name = (
                    "Till Number" if paybill_option == "TILL" else "Paybill Number"
                )
                return Response(
                    {"error": True, "message": f"{field_name} is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if paybill_option == "PAYBILL" and not paybill_number:
                return Response(
                    {"error": True, "message": "Paybill Number is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif not account:
            field_name = "Phone Number" if tab == "mobile" else "Account Number"
            return Response(
                {"error": True, "message": f"{field_name} is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment_method == "cash":
            # Directly update payout as completed for cash
            instance.status = "completed"
            instance.save()
            return Response(
                {"error": False, "message": "Cash payout recorded successfully."},
                status=status.HTTP_200_OK,
            )

        access_token = token()
        if access_token:
            if tab is None or tab not in ["mobile", "bank", "paybill"]:
                return Response(
                    {"error": True, "message": "Tab is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            gen_ref_number = (
                f"{instance.payout_number}-"
                f"{datetime.now().strftime('%d-%m-%y %I:%M:%S %p')}-"
                f"{uuid.uuid4().hex[:8]}"
            )

            if tab in ["mobile", "bank"]:
                payout_response = payout_withdrawal(
                    MerchantCode=os.environ.get("MERCHANT_CODE"),
                    MerchantTransactionReference=gen_ref_number,
                    Amount=str(amount),
                    ReceiverNumber=str(account),
                    Channel=str(payment_method),
                    Reason=f"Payout for {instance.owner.first_name} {instance.owner.last_name}",
                    CallBackURL=os.environ.get("CALLBACK_URL_FOR_PAYOUTS"),
                    token=access_token,
                    Currency="KES",
                )

                if payout_response.get("ResponseCode") != "0":
                    return Response(
                        {"error": True, "message": payout_response.get("detail")},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                PaymentDisparment.objects.create(
                    user=instance.owner,
                    status=payout_response.get("status"),
                    detail=f"Payout for {instance.owner.first_name} {instance.owner.last_name}",
                    b2c_request_id=payout_response.get("B2CRequestID"),
                    conversation_id=payout_response.get("ConversationID"),
                    originator_conversation_id=payout_response.get(
                        "OriginatorConversationID"
                    ),
                    transaction_amount=payout_response.get("TransactionAmount"),
                    response_code=payout_response.get("ResponseCode"),
                    result_desc=payout_response.get("ResponseDescription"),
                )

                Payout.objects.filter(id=instance.id).update(
                    reference_number=gen_ref_number
                )

                # Wait for the webhook to update the table and notify via Redis
                payout_status = wait_for_payout_status_payout(
                    gen_ref_number, timeout=90
                )
                if payout_status == "Paid":
                    return Response(
                        {"error": False, "message": "Payout successful."},
                        status=status.HTTP_200_OK,
                    )
                elif payout_status == "Failed":
                    return Response(
                        {"error": True, "message": "Payout failed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                else:
                    return Response(
                        {"error": True, "message": "Payout confirmation timed out."},
                        status=status.HTTP_408_REQUEST_TIMEOUT,
                    )

            if tab == "paybill":
                accountReference = ""
                paybill_options = serializer.validated_data.get("paybill_option")

                if paybill_options == "PAYBILL":
                    accountReference = str(account)

                payout_response = pay_bills(
                    token=access_token,
                    merchantCode=os.environ.get("MERCHANT_CODE"),
                    transactionReference=gen_ref_number,
                    amount=str(amount),
                    senderAccountNumber=os.environ.get("MERCHANT_CODE"),  # pm wallet,
                    receiverMerchantCode=account,
                    accountReference=accountReference,
                    billerType=paybill_options,
                    payment_method=payment_method,
                    reason=f"Payout for {instance.owner.first_name} {instance.owner.last_name}",
                    CallBackURL=os.environ.get("CALLBACK_URL_FOR_PAYBILL"),
                )

                if payout_response.get("responseCode") != "0":
                    return Response(
                        {"error": True, "message": payout_response.get("message")},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                PayBill.objects.create(
                    status=payout_response.get("status"),
                    message=payout_response.get("message"),
                    checkout_request_id=payout_response.get("checkoutRequestId"),
                    merchant_reference=payout_response.get("merchantReference"),
                    response_code=payout_response.get("responseCode"),
                    transaction_charges=payout_response.get("transactionCharges"),
                    merchant_fees=payout_response.get("merchantFees"),
                    type="payout",
                    reference_number=gen_ref_number,
                )

                Payout.objects.filter(id=instance.id).update(
                    reference_number=gen_ref_number
                )

                # Wait for the webhook to update the table and notify via Redis
                payout_status = wait_for_payment_status(gen_ref_number, timeout=90)
                if payout_status == "Paid":
                    return Response(
                        {"error": False, "message": "Payout successful."},
                        status=status.HTTP_200_OK,
                    )
                elif payout_status == "Failed":
                    return Response(
                        {"error": True, "message": "Payout failed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                else:
                    return Response(
                        {"error": True, "message": "Payout confirmation timed out."},
                        status=status.HTTP_408_REQUEST_TIMEOUT,
                    )

        return Response(
            {"error": True, "message": "Invalid payment method."},
            status=status.HTTP_400_BAD_REQUEST,
        )
