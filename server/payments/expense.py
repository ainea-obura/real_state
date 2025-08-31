import datetime
import json
import os
import uuid

from decimal import Decimal

import requests

from django.db import models
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from requests.auth import HTTPBasicAuth
from rest_framework import serializers, status
from rest_framework.generics import DestroyAPIView, ListAPIView, get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# Local imports
from payments.models import PaymentDisparment
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.expense import send_expense_approval_email
from utils.format import format_money_with_currency
from utils.payments import pay_bills, payout_withdrawal
from utils.redis_pubsub import wait_for_expense_status, wait_for_payment_status
from utils.serilaizer import flatten_errors

from .models import Expense, PayBill
from .serializers.expense import (
    ExpenseCreateSerializer,
    ExpenseSerializer,
    ExpenseStatsSerializer,
)

# Commission-related imports
try:
    from sales.models import SaleCommission, PropertySale, PropertySaleItem, SalesPerson
    from properties.models import PropertyTenant, LocationNode, Currencies
    from accounts.models import Users
    from payments.models import Invoice, InvoiceItem

    print("Debug: All commission models imported successfully")
except ImportError as e:
    print(f"Debug: Import error: {e}")
    SaleCommission = None
    PropertyTenant = None
    SalesPerson = None
    Invoice = None
    InvoiceItem = None


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
    tags=["Billings"],
    responses={200: ExpenseStatsSerializer},
    description="Get summary statistics for expenses (stat cards). Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD for date range filtering.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ExpenseStatsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = Expense.objects.all()
        total_expenses = qs.aggregate(total=models.Sum("total_amount"))[
            "total"
        ] or Decimal("0.0")
        pending_expenses = qs.filter(status="pending").aggregate(
            total=models.Sum("total_amount")
        )["total"] or Decimal("0.0")
        overdue_expenses = qs.filter(status="overdue").aggregate(
            total=models.Sum("total_amount")
        )["total"] or Decimal("0.0")
        monthly_budget = Decimal("0.0")
        budget_remaining = monthly_budget - total_expenses
        data = {
            "totalExpenses": format_money_with_currency(total_expenses),
            "totalPaid": format_money_with_currency(
                total_expenses - pending_expenses - overdue_expenses
            ),
            "outStanding": format_money_with_currency(
                pending_expenses + overdue_expenses
            ),
            "pendingExpenses": format_money_with_currency(pending_expenses),
            "overdueExpenses": format_money_with_currency(overdue_expenses),
            "budgetRemaining": format_money_with_currency(budget_remaining),
            "monthlyBudget": format_money_with_currency(monthly_budget),
            "currency": get_serialized_default_currency(),
        }
        serializer = ExpenseStatsSerializer(data)
        return Response(
            {"error": False, "data": serializer.data}, status=status.HTTP_200_OK
        )


@extend_schema(
    tags=["Billings"],
    description="List all expenses (paginated, cached, filterable by date range).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class ExpenseTableListView(ListAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        return Expense.objects.all().order_by("-invoice_date", "-id")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            data = paginated_response.data
            return Response({"error": False, "data": data}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Billings"],
    request=ExpenseCreateSerializer,
    responses={201: ExpenseSerializer, 400: "Validation error"},
    description="Create a new expense. Accepts multipart/form-data for file upload.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ExpenseCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ExpenseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": flatten_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        expense = serializer.save()

        # Check if this is a variable service expense that needs approval
        if expense.service and expense.service.pricing_type == "VARIABLE":
            # Set status to waiting for approval
            expense.status = "waiting_for_approval"
            expense.save()

            # Send approval email to company owner
            try:
                result = send_expense_approval_email(expense, user=request.user)
                print(f"Expense approval email result: {result}")
            except Exception as e:
                print(f"Error sending expense approval email: {e}")

        output_serializer = ExpenseSerializer(expense)
        return Response(
            {
                "error": False,
                "message": "Billing created successfully",
                "data": output_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Billings"],
    description="Delete an expense by ID.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="DELETE", block=True),
    name="dispatch",
)
class ExpenseDestroyView(DestroyAPIView):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        try:
            return super().delete(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {"error": True, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=["Billings"],
    description="Approve an expense. Changes status from 'waiting_for_approval' to 'pending'.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ExpenseApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, expense_id, *args, **kwargs):
        try:
            expense = Expense.objects.get(id=expense_id)
        except Expense.DoesNotExist:
            return Response(
                {"error": True, "message": "Expense not found."}, status=404
            )

        if expense.status != "waiting_for_approval":
            return Response(
                {
                    "error": True,
                    "message": "Only expenses waiting for approval can be approved.",
                },
                status=400,
            )

        expense.status = "pending"
        expense.save()

        # Send notification email to expense creator (optional)
        try:
            result = send_expense_approval_email(expense, user=request.user)
            print(f"Expense approval notification email result: {result}")
        except Exception as e:
            print(f"Error sending expense approval notification email: {e}")

        serializer = ExpenseSerializer(expense)
        return Response(
            {
                "error": False,
                "message": "Expense approved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Billings"],
    description="Reject an expense. Changes status from 'waiting_for_approval' to 'rejected'.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ExpenseRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, expense_id, *args, **kwargs):
        try:
            expense = Expense.objects.get(id=expense_id)
        except Expense.DoesNotExist:
            return Response(
                {"error": True, "message": "Expense not found."}, status=404
            )

        if expense.status != "waiting_for_approval":
            return Response(
                {
                    "error": True,
                    "message": "Only expenses waiting for approval can be rejected.",
                },
                status=400,
            )

        # Get rejection reason from request body
        reason = request.data.get("reason", "")

        expense.status = "rejected"
        expense.notes = (
            f"{expense.notes or ''}\n\nRejection Reason: {reason}".strip()
            if reason
            else expense.notes
        )
        expense.save()

        # Send notification email to expense creator (optional)
        try:
            result = send_expense_approval_email(expense, user=request.user)
            print(f"Expense rejection notification email result: {result}")
        except Exception as e:
            print(f"Error sending expense rejection notification email: {e}")

        serializer = ExpenseSerializer(expense)
        return Response(
            {
                "error": False,
                "message": "Expense rejected successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Billings"],
    description="Mark an expense as paid. Sets status to 'paid' and paid_date to now.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class ExpensePayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        expense = get_object_or_404(Expense, pk=pk)
        if expense.status == "paid":
            return Response(
                {"error": True, "message": "Billing is already paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method")
        vendor_account = request.data.get("account")
        tab = request.data.get("tab")
        paybill_option = request.data.get("paybill_option")
        paybill_number = request.data.get("paybill_number")
        amount = request.data.get("amount")

        if float(amount) > (expense.total_amount - expense.paid_amount):
            return Response(
                {
                    "error": True,
                    "message": "Billing amount is greater than total amount.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate required fields based on tab
        if not payment_method:
            return Response(
                {"error": True, "message": "Payment method is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tab is None or tab not in ["mobile", "bank", "paybill"]:
            return Response(
                {"error": True, "message": "Tab is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tab == "paybill":
            if not vendor_account:
                field_name = (
                    "Till Number" if paybill_option == "TILL" else "Account Number"
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
        elif not vendor_account:
            field_name = "Phone Number" if tab == "mobile" else "Account Number"
            return Response(
                {"error": True, "message": f"{field_name} is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment_method == "cash":
            expense.status = "paid"
            expense.paid_date = timezone.now().date()
            expense.save()
            serializer = ExpenseSerializer(expense)
            return Response(
                {
                    "error": False,
                    "data": serializer.data,
                    "message": "Cash expense payment recorded successfully.",
                },
                status=status.HTTP_200_OK,
            )
        # Non-cash: initiate payment to vendor
        if not vendor_account:
            return Response(
                {
                    "error": True,
                    "message": "Vendor phone/account is required for non-cash payments.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Call external payment API (pseudo, replace with actual call)
        access_token = token()
        # Generate transaction reference inline, matching payouts/views.py
        timestamp = datetime.datetime.now().strftime("%d-%m-%y %I:%M:%S %p")
        random_suffix = uuid.uuid4().hex[:8]
        originator_id = f"EXP-{expense.expense_number}-{timestamp}-{random_suffix}"

        if tab in ["mobile", "bank"]:
            payout_response = payout_withdrawal(
                MerchantCode=os.environ.get("MERCHANT_CODE"),
                MerchantTransactionReference=originator_id,
                Amount=str(amount),
                ReceiverNumber=str(vendor_account),
                Channel=str(payment_method),
                Reason=f"Billing payment for {expense.description}",
                CallBackURL=os.environ.get("CALLBACK_URL_FOR_EXPENSEPAY"),
                Currency="KES",
                token=access_token,
            )
            if payout_response["ResponseCode"] != "0":
                return Response(
                    {"error": True, "message": payout_response["detail"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            PaymentDisparment.objects.create(
                user=request.user,  # Use the current authenticated user
                status=payout_response.get("status"),
                detail=f"Billing payment for {expense.description}",
                b2c_request_id=payout_response.get("B2CRequestID"),
                conversation_id=payout_response.get("ConversationID"),
                originator_conversation_id=originator_id,
                transaction_amount=payout_response.get("TransactionAmount"),
                response_code=payout_response.get("ResponseCode"),
                result_desc=payout_response.get("ResponseDescription"),
            )

            Expense.objects.filter(id=expense.id).update(reference_number=originator_id)

            # Wait for the webhook to update the table and notify via Redis
            status_result = wait_for_expense_status(originator_id, timeout=90)
            if status_result == "Paid":
                expense.status = "paid"
                expense.paid_date = timezone.now().date()
                expense.save()
                serializer = ExpenseSerializer(expense)
                return Response(
                    {
                        "error": False,
                        "data": serializer.data,
                        "message": "Billing payment successful.",
                    },
                    status=status.HTTP_200_OK,
                )
            elif status_result == "Failed":
                return Response(
                    {"error": True, "message": "Billing payment failed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": True,
                        "message": "Billing payment confirmation timed out.",
                    },
                    status=status.HTTP_408_REQUEST_TIMEOUT,
                )

        if tab == "paybill":
            accountReference = ""
            paybill_options = paybill_option

            if paybill_options == "PAYBILL":
                accountReference = str(vendor_account)

            payout_response = pay_bills(
                token=access_token,
                merchantCode=os.environ.get("MERCHANT_CODE"),
                transactionReference=originator_id,
                amount=str(amount),
                senderAccountNumber=os.environ.get("MERCHANT_CODE"),  # pm wallet,
                receiverMerchantCode=vendor_account,
                accountReference=accountReference,
                billerType=paybill_options,
                payment_method=payment_method,
                reason=f"Billing payment for {expense.description}",
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
                type="expense",
                reference_number=originator_id,
            )

            print("id", expense.id)
            print("originator_id", originator_id)
            Expense.objects.filter(id=expense.id).update(reference_number=originator_id)

            # Wait for the webhook to update the table and notify via Redis
            status_result = wait_for_payment_status(originator_id, timeout=90)
            if status_result == "Paid":
                return Response(
                    {
                        "error": False,
                        "message": "Billing payment successful.",
                    },
                    status=status.HTTP_200_OK,
                )
            elif status_result == "Failed":
                return Response(
                    {"error": True, "message": "Billing payment failed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": True,
                        "message": "Billing payment confirmation timed out.",
                    },
                    status=status.HTTP_408_REQUEST_TIMEOUT,
                )

        return Response(
            {"error": True, "message": "Invalid tab."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(
    tags=["Commissions"],
    description="Get pending commissions for agents and sales staff",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class PendingCommissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Get all pending commissions for agents and sales staff"""
        print("Debug: PendingCommissionsView.get() called")

        try:
            # Validate models are available
            if not all([SaleCommission, PropertyTenant, SalesPerson]):
                return Response(
                    {"error": True, "message": "Commission models not available"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            print("Debug: Models accessible, proceeding with commission fetch")
            pending_commissions = []

            # Fetch all commission types using DRY approach
            commission_data = self._fetch_all_commissions()

            # Process each commission type
            for commission_type, commissions in commission_data.items():
                if commissions:
                    processed = self._process_commissions(commission_type, commissions)
                    pending_commissions.extend(processed)

            print(f"Debug: Total commissions found: {len(pending_commissions)}")

            return Response(
                {
                    "error": False,
                    "data": pending_commissions,
                    "message": f"Found {len(pending_commissions)} pending commissions",
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            print(f"Debug: Error in PendingCommissionsView: {e}")
            return Response(
                {"error": True, "message": f"Error fetching commissions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _fetch_all_commissions(self):
        """Fetch all commission types using DRY approach"""
        commission_data = {}

        # Define commission fetch configurations
        fetch_configs = {
            "sales": {
                "model": SaleCommission,
                "filter": {"status": "pending"},
                "select_related": ["agent", "sale"],
                "prefetch_related": ["sale__sale_items__property_node"],
            },
            "tenant": {
                "model": PropertyTenant,
                "filter": {"commission__isnull": False, "commission__gt": 0},
                "select_related": ["agent", "node", "currency"],
            },
            "sales_person": {
                "model": SalesPerson,
                "filter": {
                    "commission_type__isnull": False,
                    "commission_property_sale__isnull": False,
                },
                "select_related": ["user", "commission_property_sale"],
            },
        }

        # Debug: Check sales person data before filtering
        print("Debug: Checking sales person data before filtering...")
        try:
            all_sales_persons = SalesPerson.objects.all()
            print(
                f"Debug: Total sales persons in database: {all_sales_persons.count()}"
            )

            with_commission_type = SalesPerson.objects.filter(
                commission_type__isnull=False
            )
            print(
                f"Debug: Sales persons with commission_type: {with_commission_type.count()}"
            )

            with_property_sale = SalesPerson.objects.filter(
                commission_property_sale__isnull=False
            )
            print(
                f"Debug: Sales persons with commission_property_sale: {with_property_sale.count()}"
            )

            # Show some examples
            for sp in SalesPerson.objects.all()[:3]:
                print(
                    f"Debug: Sales Person {sp.id}: type={sp.commission_type}, rate={sp.commission_rate}, property_sale={sp.commission_property_sale_id}"
                )

        except Exception as e:
            print(f"Debug: Error checking sales person data: {e}")

        # Fetch each commission type
        for commission_type, config in fetch_configs.items():
            try:
                queryset = config["model"].objects.filter(**config["filter"])

                if "select_related" in config:
                    queryset = queryset.select_related(*config["select_related"])
                if "prefetch_related" in config:
                    queryset = queryset.prefetch_related(*config["prefetch_related"])

                commission_data[commission_type] = list(queryset)
                print(
                    f"Debug: Found {len(commission_data[commission_type])} {commission_type} commissions"
                )

            except Exception as e:
                print(f"Debug: Error fetching {commission_type} commissions: {e}")
                commission_data[commission_type] = []

        return commission_data

    def _process_commissions(self, commission_type, commissions):
        """Process commissions of a specific type"""
        print(f"Debug: Processing {commission_type} commissions")
        print(f"Debug: Commissions: {commissions}")
        processed_commissions = []

        for commission in commissions:
            try:
                # Check if already paid
                if self._is_commission_paid(commission_type, commission):
                    continue

                # Process based on type
                if commission_type == "sales":
                    processed = self._process_sales_commission(commission)
                elif commission_type == "tenant":
                    processed = self._process_tenant_commission(commission)
                elif commission_type == "sales_person":
                    processed = self._process_sales_person_commission(commission)

                if processed:
                    processed_commissions.append(processed)

            except Exception as e:
                print(
                    f"Debug: Error processing {commission_type} commission {getattr(commission, 'id', 'unknown')}: {e}"
                )
                continue

        return processed_commissions

    def _is_commission_paid(self, commission_type, commission):
        """Check if commission has already been paid via expenses"""
        try:
            commission_id = str(getattr(commission, "id", commission.id))
            print(f"Debug: Checking commission {commission_type} with ID {commission_id}")
            
            existing_expense = Expense.objects.filter(
                commission_type=commission_type,
                commission_reference=commission_id,
                status__in=["paid", "approved"],
            ).first()

            if existing_expense:
                print(
                    f"Debug: Skipping {commission_type} commission {commission_id} - already paid via expense {existing_expense.id}"
                )
                return True

            # For sales_person commissions, check invoice payment status
            if commission_type == "sales_person":
                print(f"Debug: Checking invoice payment status for sales person {commission_id}")
                should_hide = self._should_hide_sales_person_commission(commission_id)
                print(f"Debug: Sales person commission {commission_id} should hide: {should_hide}")
                if should_hide:
                    return True

            print(f"Debug: Commission {commission_type} {commission_id} is ready to show")
            return False
        except Exception as e:
            print(f"Debug: Error checking if commission is paid: {e}")
            return False

    def _process_sales_commission(self, commission):
        """Process sales commission"""
        try:
            sale_item = commission.sale.sale_items.first()
            if not sale_item or not sale_item.property_node:
                return None

            buyer_name = (
                sale_item.buyer.get_full_name() if sale_item.buyer else "Unknown Buyer"
            )
            default_currency = get_serialized_default_currency()

            return {
                "id": str(commission.id),
                "type": "sales",
                "recipient": self._build_recipient_data(commission.agent),
                "amount": str(commission.commission_amount),
                "currency": default_currency,
                "reference": f"Property Sale - {sale_item.property_node.name} - {buyer_name}",
                "commission_id": str(commission.id),
                "sale_id": str(commission.sale.id),
                "property_node_id": str(sale_item.property_node.id),
                "property_node_name": sale_item.property_node.name,
            }
        except Exception as e:
            print(f"Debug: Error processing sales commission {commission.id}: {e}")
            return None

    def _process_tenant_commission(self, commission):
        """Process tenant commission"""
        try:
            if not commission.agent or not commission.node:
                return None

            return {
                "id": str(commission.id),
                "type": "tenant",
                "recipient": self._build_recipient_data(commission.agent),
                "amount": str(commission.commission),
                "currency": self._build_currency_data(commission.currency),
                "reference": f"Tenant Assignment - {commission.node.name} - {commission.tenant_user.get_full_name()}",
                "commission_id": str(commission.id),
                "tenant_id": str(commission.id),
                "property_node_id": str(commission.node.id),
                "property_node_name": commission.node.name,
            }
        except Exception as e:
            print(f"Debug: Error processing tenant commission {commission.id}: {e}")
            return None

    def _process_sales_person_commission(self, commission):
        """Process sales person commission"""
        try:
            # Get the property sale from the commission relationship
            property_sale = commission.commission_property_sale

            if not property_sale:
                print(
                    f"Debug: Sales person {commission.id} has no property sale assigned"
                )
                return None

            # Get sale items for this property sale
            sale_items = PropertySaleItem.objects.filter(sale=property_sale)

            if not sale_items.exists():
                print(
                    f"Debug: No sale items found for property sale {property_sale.id}"
                )
                return None

            # Get the first sale item for property reference
            sale_item = sale_items.first()

            if not sale_item or not sale_item.property_node:
                print(
                    f"Debug: No property node found for sale item {sale_item.id if sale_item else 'None'}"
                )
                return None

            # Calculate commission amount
            commission_amount = self._calculate_sales_person_commission(
                commission, property_sale
            )

            if commission_amount <= 0:
                print(f"Debug: Commission amount is 0 for sales person {commission.id}")
                return None

            default_currency = get_serialized_default_currency()

            # Build commission data
            commission_data = {
                "id": str(commission.id),
                "type": "sales_person",
                "recipient": self._build_recipient_data(commission.user),
                "amount": str(commission_amount),
                "currency": default_currency,
                "reference": f"Sales Person Commission - {sale_item.property_node.name}",
                "commission_id": str(commission.id),
                "sales_person_id": str(commission.id),
                "property_node_id": str(sale_item.property_node.id),
                "property_node_name": sale_item.property_node.name,
                "commission_type": commission.commission_type,
                "commission_rate": str(commission.commission_rate),
                "payment_setting": commission.commission_payment_setting,
            }

            print(
                f"Debug: Successfully processed sales person commission {commission.id}"
            )
            return commission_data

        except Exception as e:
            print(
                f"Debug: Error processing sales person commission {commission.id}: {e}"
            )
            return None

    def _build_recipient_data(self, user):
        """Build recipient data structure"""
        return {
            "id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone or "",
        }

    def _build_currency_data(self, currency):
        """Build currency data structure"""
        return {
            "id": str(currency.id),
            "code": currency.code,
            "name": currency.name,
            "symbol": currency.symbol or "",
        }

    def _get_sales_person_property_node(self, sales_person):
        """Get the property node for a sales person commission (DRY helper)."""
        try:
            property_sale = sales_person.commission_property_sale
            if not property_sale:
                return None
            
            # Get the first sale item's property node
            sale_item = property_sale.sale_items.first()
            if sale_item:
                return sale_item.property_node
            
            return None
        except Exception as e:
            print(f"Debug: Error getting property node: {e}")
            return None

    def _should_hide_sales_person_commission(self, commission_id):
        """Check if sales person commission should be hidden based on payment setting"""
        try:
            print(f"Debug: Starting _should_hide_sales_person_commission for ID: {commission_id}")
            
            sales_person = SalesPerson.objects.get(id=commission_id)
            print(f"Debug: Found SalesPerson: {sales_person.id}")
            print(f"Debug: Commission type: {sales_person.commission_type}")
            print(f"Debug: Commission rate: {sales_person.commission_rate}")
            print(f"Debug: Payment setting: {sales_person.commission_payment_setting}")
            
            property_node = self._get_sales_person_property_node(sales_person)
            print(f"Debug: Property node: {property_node}")

            if not property_node:
                print(f"Debug: No property node found - hiding commission")
                return True

            payment_setting = sales_person.commission_payment_setting
            print(f"Debug: Processing payment setting: {payment_setting}")

            if payment_setting == "per_payment":
                print(f"Debug: Calling per_payment logic")
                result = self._should_hide_per_payment_commission(property_node)
                print(f"Debug: Per_payment result: {result}")
                return result
            elif payment_setting == "per_project_completion":
                print(f"Debug: Calling per_project_completion logic")
                result = self._should_hide_per_project_completion_commission(property_node)
                print(f"Debug: Per_project_completion result: {result}")
                return result
            else:
                print(f"Debug: Unknown payment setting '{payment_setting}' - hiding commission")
                return True

        except Exception as e:
            print(f"Debug: Error checking commission status: {e}")
            import traceback
            traceback.print_exc()
            return True  # Hide on error

    def _should_hide_per_payment_commission(self, property_node):
        """Check if per_payment commission should be hidden"""
        try:
            print(f"Debug: _should_hide_per_payment_commission called for property: {property_node.id}")
            
            # For per_payment: show commission when ANY installment is paid
            paid_installments = Invoice.objects.filter(
                property=property_node, items__type="INSTALLMENT", status="PAID"
            ).exists()

            print(f"Debug: Property {property_node.id} - has paid installments: {paid_installments}")
            
            should_hide = not paid_installments  # Hide if no paid installments
            print(f"Debug: Property {property_node.id} - should hide: {should_hide}")
            
            return should_hide

        except Exception as e:
            print(f"Debug: Error checking per_payment status: {e}")
            import traceback
            traceback.print_exc()
            return True

    def _should_hide_per_project_completion_commission(self, property_node):
        """Check if per_project_completion commission should be hidden"""
        try:
            print(f"Debug: _should_hide_per_project_completion_commission called for property: {property_node.id}")
            
            # Find the property sale item for this property
            sale_item = PropertySaleItem.objects.filter(
                property_node=property_node
            ).first()

            if not sale_item:
                print(f"Debug: No sale item found for property {property_node.id} - hiding commission")
                return True

            # Get total property sale value
            total_property_value = sale_item.sale_price
            print(f"Debug: Property {property_node.id} - total sale value: {total_property_value}")

            # Get total paid amount from all installment invoices
            invoices_with_installments = Invoice.objects.filter(
                property=property_node, items__type="INSTALLMENT"
            ).distinct()

            if not invoices_with_installments.exists():
                print(f"Debug: No installment invoices for property {property_node.id} - hiding commission")
                return True

            # Calculate total paid amount
            total_paid = sum(
                invoice.total_amount
                for invoice in invoices_with_installments
                if invoice.status == "PAID"
            )
            print(f"Debug: Property {property_node.id} - total paid: {total_paid}, required: {total_property_value}")

            # Commission ready when total paid >= total property value
            commission_ready = total_paid >= total_property_value
            print(f"Debug: Property {property_node.id} - commission ready: {commission_ready}")

            should_hide = not commission_ready  # Hide if commission not ready
            print(f"Debug: Property {property_node.id} - should hide: {should_hide}")
            
            return should_hide

        except Exception as e:
            print(f"Debug: Error checking per_project_completion status: {e}")
            import traceback
            traceback.print_exc()
            return True

    def _calculate_sales_person_commission(self, sales_person, property_sale):
        """Calculate sales person commission amount based on type and payment setting"""
        try:
            print(f"Debug: Calculating commission for sales person {sales_person.id}")
            print(f"Debug: Commission type: {sales_person.commission_type}")
            print(f"Debug: Commission rate: {sales_person.commission_rate}")

            if not sales_person.commission_type or not sales_person.commission_rate:
                print(
                    f"Debug: Missing commission type or rate for sales person {sales_person.id}"
                )
                return 0.0

            if sales_person.commission_type == "percentage":
                # Get base amount from property sale or sale items
                base_amount = 0.0

                # Try to get from property sale first
                if (
                    hasattr(property_sale, "total_amount")
                    and property_sale.total_amount
                ):
                    base_amount = float(property_sale.total_amount)
                    print(f"Debug: Using property sale total_amount: {base_amount}")
                else:
                    # Fallback to sale items
                    sale_items = PropertySaleItem.objects.filter(sale=property_sale)
                    if sale_items.exists():
                        base_amount = sum(float(item.sale_price) for item in sale_items)
                        print(
                            f"Debug: Calculated base amount from sale items: {base_amount}"
                        )
                    else:
                        print(
                            f"Debug: No sale items found for property sale {property_sale.id}"
                        )
                        return 0.0

                if base_amount <= 0:
                    print(f"Debug: Base amount is 0 or negative: {base_amount}")
                    return 0.0

                commission_amount = (
                    float(sales_person.commission_rate) / 100
                ) * base_amount
                print(f"Debug: Calculated percentage commission: {commission_amount}")

            else:  # fixed amount
                commission_amount = float(sales_person.commission_rate)
                print(f"Debug: Using fixed commission amount: {commission_amount}")

            return commission_amount

        except Exception as e:
            print(f"Debug: Error calculating sales person commission: {e}")
            return 0.0


@extend_schema(
    tags=["Commissions"],
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "commissions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["sales", "tenant", "sales_person"],
                            },
                            "amount": {"type": "string"},
                            "property_node_id": {"type": "string"},
                            "commission_id": {"type": "string"},
                        },
                        "required": [
                            "id",
                            "type",
                            "amount",
                            "property_node_id",
                            "commission_id",
                        ],
                    },
                },
                "payment_method": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["commissions", "payment_method"],
        }
    },
    responses={
        201: "Commission expenses created successfully",
        400: "Validation error",
    },
    description="Create commission expenses for multiple commissions",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class CreateCommissionExpensesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            print("Debug: CreateCommissionExpensesView.post() called")

            # Validate required fields
            commissions_data = request.data.get("commissions", [])
            payment_method = request.data.get("payment_method")
            notes = request.data.get("notes", "")

            if not commissions_data:
                return Response(
                    {"error": True, "message": "No commissions provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not payment_method:
                return Response(
                    {"error": True, "message": "Payment method is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            print(f"Debug: Processing {len(commissions_data)} commissions")

            created_expenses = []
            total_amount = Decimal("0.0")

            for commission_data in commissions_data:
                commission_id = commission_data.get("id")
                commission_type = commission_data.get("type")
                amount = Decimal(commission_data.get("amount", "0"))
                property_node_id = commission_data.get("property_node_id")
                commission_reference = commission_data.get("commission_id")

                print(
                    f"Debug: Processing commission {commission_id} of type {commission_type}"
                )

                # Validate commission data
                if not all(
                    [
                        commission_id,
                        commission_type,
                        amount,
                        property_node_id,
                        commission_reference,
                    ]
                ):
                    return Response(
                        {
                            "error": True,
                            "message": f"Missing required fields for commission {commission_id}",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                try:
                    # Get the property node
                    property_node = LocationNode.objects.get(id=property_node_id)

                    # Create the expense record
                    expense = Expense.objects.create(
                        location_node=property_node,
                        description=f"Commission payment for {commission_type} commission",
                        amount=amount,
                        total_amount=amount,
                        invoice_date=timezone.now().date(),
                        due_date=timezone.now().date(),
                        payment_method=payment_method,
                        notes=notes,
                        created_by=request.user.get_full_name(),
                        status="pending",
                        # Commission-specific fields
                        commission_type=commission_type,
                        commission_reference=commission_reference,
                    )

                    # Set agent or sales_staff based on commission type
                    if commission_type == "sales":
                        # Get the commission to find the agent
                        try:
                            commission = SaleCommission.objects.get(
                                id=commission_reference
                            )
                            expense.agent = commission.agent
                        except SaleCommission.DoesNotExist:
                            print(
                                f"Debug: SaleCommission {commission_reference} not found"
                            )
                    elif commission_type == "tenant":
                        # Get the tenant to find the agent
                        try:
                            tenant = PropertyTenant.objects.get(id=commission_reference)
                            expense.agent = tenant.agent
                        except PropertyTenant.DoesNotExist:
                            print(
                                f"Debug: PropertyTenant {commission_reference} not found"
                            )
                    elif commission_type == "sales_person":
                        # Get the sales person to find the user
                        try:
                            sales_person = SalesPerson.objects.get(
                                id=commission_reference
                            )
                            expense.agent = sales_person.user
                        except SalesPerson.DoesNotExist:
                            print(
                                f"Debug: SalesPerson {commission_reference} not found"
                            )

                    expense.save()

                    created_expenses.append(
                        {
                            "id": str(expense.id),
                            "expense_number": expense.expense_number,
                            "amount": str(expense.amount),
                            "status": expense.status,
                        }
                    )

                    total_amount += amount

                    print(
                        f"Debug: Created expense {expense.expense_number} for commission {commission_id}"
                    )

                except LocationNode.DoesNotExist:
                    return Response(
                        {
                            "error": True,
                            "message": f"Property node {property_node_id} not found",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                except Exception as e:
                    print(
                        f"Debug: Error creating expense for commission {commission_id}: {e}"
                    )
                    return Response(
                        {
                            "error": True,
                            "message": f"Error creating expense for commission {commission_id}: {str(e)}",
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

            print(
                f"Debug: Successfully created {len(created_expenses)} expenses, total: {total_amount}"
            )

            return Response(
                {
                    "error": False,
                    "message": f"Successfully created {len(created_expenses)} commission expenses",
                    "data": {
                        "expenses": created_expenses,
                        "total_amount": str(total_amount),
                        "count": len(created_expenses),
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            print(f"Debug: Error in CreateCommissionExpensesView: {e}")
            return Response(
                {
                    "error": True,
                    "message": f"Error creating commission expenses: {str(e)}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
