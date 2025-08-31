import datetime

import django_filters

from django.db import models, transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.filters import OrderingFilter
from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Users
from payments.models import Invoice, InvoiceItem, Penalty
from properties.models import (
    LocationNode,
    PropertyOwner,
    PropertyService,
    PropertyTenant,
)
from utils.currency import get_serialized_default_currency
from utils.custom_pagination import CustomPageNumberPagination
from utils.format import format_money_with_currency
from utils.invoice import get_missing_invoice_items, send_invoice_email

from .serializers.invoice import (
    InvoiceCreateSerializer,
    InvoiceStatsSerializer,
    InvoiceTableItemSerializer,
    InvoiceUpdateSerializer,
    OwnerNodeItemDetailsSerializer,
    RecipientUserSerializer,
    TenantUnitItemDetailsSerializer,
)


class RecipientUserFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_q")
    email = django_filters.CharFilter(field_name="email", lookup_expr="icontains")
    phone = django_filters.CharFilter(field_name="phone", lookup_expr="icontains")
    type = django_filters.CharFilter(field_name="type", lookup_expr="exact")

    class Meta:
        model = Users
        fields = ["q", "email", "phone", "type"]

    def filter_q(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value)
            | Q(last_name__icontains=value)
            | Q(email__icontains=value)
            | Q(phone__icontains=value)
        )


@extend_schema(
    tags=["Recipients"],
    description="Search recipients (tenants/owners) for invoice creation. 'type' is required. 'q' (min 3 chars) is used for general search (name, email, phone). If 'q' is missing or less than 3 chars, returns empty. No pagination. Cached.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class RecipientUserListView(ListAPIView):
    serializer_class = RecipientUserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # No pagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = RecipientUserFilter

    def get_queryset(self):
        params = self.request.query_params
        user_type = params.get("type")
        base_qs = Users.objects.filter(is_deleted=False)
        if user_type == "tenant":
            return base_qs.filter(type="tenant")
        elif user_type == "owner":
            return base_qs.filter(type="owner")
        return base_qs.none()

    def list(self, request, *args, **kwargs):
        params = request.query_params.dict()
        user_type = params.get("type")
        q = params.get("q", None)
        # Enforce type is always required
        if not user_type:
            return Response(
                {"error": True, "message": "'type' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # If q is present, must be at least 3 chars
        if q is not None and len(q.strip()) < 3:
            return Response(
                {"error": False, "data": {"count": 0, "results": []}},
                status=status.HTTP_200_OK,
            )
        # If q is not present, also return empty (enforce search only)
        if not q:
            return Response(
                {"error": False, "data": {"count": 0, "results": []}},
                status=status.HTTP_200_OK,
            )
        filters = str(sorted(params.items()))
        qs = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
@extend_schema(
    tags=["Invoice Items"],
    description="Get all invoice items (rent and services) for a tenant's units. Returns a list of units, each with an 'items' list (rent, fixed, percentage, variable services). 'tenant_id' is required. Optionally pass 'period_label' (e.g., 'July 2024').",
)
class TenantUnitItemDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        tenant_id = request.query_params.get("tenant_id")
        now = datetime.datetime.now()
        period_label = now.strftime("%B %Y")
        year, month = now.year, now.month

        if not tenant_id:
            return Response(
                {"error": True, "message": "'tenant_id' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tenant = Users.objects.get(id=tenant_id, is_deleted=False, type="tenant")
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "Tenant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_tenants = PropertyTenant.objects.filter(
            tenant_user=tenant, is_deleted=False
        ).select_related("node", "currency")
        units_data = []
        with_items = request.query_params.get("with_items", "true").lower() == "true"
        for pt in property_tenants:
            node = pt.node
            unit_id = str(node.id)
            ancestors = list(node.get_ancestors(include_self=True))
            filtered_ancestors = []
            has_block_or_house = any(
                a.node_type in ("BLOCK", "HOUSE") for a in ancestors
            )
            for a in ancestors:
                if a.node_type == "FLOOR" and has_block_or_house:
                    continue
                filtered_ancestors.append(a)
            unit_name = " -> ".join([a.name for a in filtered_ancestors])
            node_type = node.node_type
            items = get_missing_invoice_items(
                user=tenant,
                node=node,
                year=year,
                month=month,
                user_type="tenant",
                period_label=period_label,
            )
            if with_items:
                if not items:
                    continue
            units_data.append(
                {
                    "unit_id": unit_id,
                    "unit_name": unit_name,
                    "node_type": node_type,
                    "items": items,
                }
            )
        serializer = TenantUnitItemDetailsSerializer(units_data, many=True)
        data = {
            "count": len(serializer.data),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
@extend_schema(
    tags=["Invoice Items"],
    description="Get all invoice items (services only) for an owner's nodes. Returns a list of nodes, each with an 'items' list (services only). 'owner_id' is required.",
)
class OwnerNodeItemDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        owner_id = request.query_params.get("owner_id")
        now = datetime.datetime.now()
        year, month = now.year, now.month
        if not owner_id:
            return Response(
                {"error": True, "message": "'owner_id' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            owner = Users.objects.get(id=owner_id, is_deleted=False, type="owner")
        except Users.DoesNotExist:
            return Response(
                {"error": True, "message": "Owner not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        property_owners = PropertyOwner.objects.filter(
            owner_user=owner, is_deleted=False
        ).select_related("node")
        nodes_data = []
        for po in property_owners:
            node = po.node
            node_id = str(node.id)
            ancestors = list(node.get_ancestors(include_self=True))
            has_block_or_house = any(
                a.node_type in ("BLOCK", "HOUSE") for a in ancestors
            )
            filtered_ancestors = []
            for a in ancestors:
                if a.node_type == "FLOOR" and has_block_or_house:
                    continue
                filtered_ancestors.append(a)
            node_name = " -> ".join([a.name for a in filtered_ancestors])
            node_type = node.node_type
            items = get_missing_invoice_items(
                user=owner,
                node=node,
                year=year,
                month=month,
                user_type="owner",
                period_label=None,
            )
            if items:
                nodes_data.append(
                    {
                        "unit_id": node_id,
                        "unit_name": node_name,
                        "node_id": node_id,
                        "node_name": node_name,
                        "node_type": node_type,
                        "items": items,
                    }
                )
        serializer = OwnerNodeItemDetailsSerializer(nodes_data, many=True)
        data = {
            "count": len(serializer.data),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Invoices"],
    request=InvoiceCreateSerializer,
    responses={201: InvoiceCreateSerializer},
    description="Create a new invoice with nested items, grouped by recipient and unit. Accepts the full invoice payload as described in the frontend schema.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class InvoiceCreateView(CreateAPIView):
    serializer_class = InvoiceCreateSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        created_invoices = []
        send_email = data.get("status") == "issued"

        for recipient in data["recipients"]:
            for unit in recipient["units"]:
                # Get property from unitId
                try:
                    property_node = LocationNode.objects.get(pk=unit["unitId"])
                except LocationNode.DoesNotExist:
                    continue  # or handle error

                tenant = owner = None
                recipient_email = None
                recipient_name = recipient["name"]
                if recipient["type"] == "tenant":
                    tenant = (
                        PropertyTenant.objects.filter(
                            tenant_user=recipient["id"], node=unit["unitId"]
                        )
                        .select_related("tenant_user")
                        .first()
                    )
                    if tenant and tenant.tenant_user:
                        recipient_email = tenant.tenant_user.email
                elif recipient["type"] == "owner":
                    owner = (
                        PropertyOwner.objects.filter(
                            owner_user=recipient["id"], node=unit["unitId"]
                        )
                        .select_related("owner_user")
                        .first()
                    )
                    if owner and owner.owner_user:
                        recipient_email = owner.owner_user.email

                invoice = Invoice.objects.create(
                    issue_date=data["issueDate"],
                    due_date=data["dueDate"],
                    status=data["status"].upper(),
                    description=data.get("notes", ""),
                    discount=data.get("discountPercentage", 0),
                    tax_percentage=data.get("taxPercentage", 0),
                    total_amount=0,
                    balance=0,
                    property=property_node,
                )
                if tenant:
                    invoice.tenants.add(tenant)
                if owner:
                    invoice.owners.add(owner)

                total = 0
                for item in unit["items"]:
                    service = None
                    penalty = None
                    if item.get("serviceId"):
                        try:
                            service = PropertyService.objects.get(pk=item["serviceId"])
                        except PropertyService.DoesNotExist:
                            pass
                    # Penalty handling (only by penaltyId)
                    penalty_id = item.get("penaltyId")
                    if item.get("type", "").upper() == "PENALTY" and penalty_id:
                        try:
                            penalty = Penalty.objects.get(pk=penalty_id)
                            penalty.status = "applied_to_invoice"
                            penalty.linked_invoice = invoice
                            penalty.save()
                        except Penalty.DoesNotExist:
                            print(f"Penalty not found for item: {item}")

                    # Extract amount, quantity, and price from item data
                    amount = item.get("amount", 0) or 0
                    quantity = item.get("quantity", 1) or 1
                    price = item.get("price", 0) or (
                        amount * quantity
                    )  # Use provided price or calculate

                    invoice_item = InvoiceItem.objects.create(
                        invoice=invoice,
                        type=item["type"],
                        name=item["description"],
                        service=service,
                        penalty=penalty,
                        amount=amount,  # Single item amount
                        quantity=quantity,  # Number of items
                        price=price,  # Total amount (amount × quantity)
                    )
                    total += price  # Use the price for total
                invoice.total_amount = total
                discount_amount = (
                    (float(total) * float(invoice.discount) / 100)
                    if invoice.discount
                    else 0
                )
                invoice.balance = float(total) - discount_amount
                invoice.save()
                created_invoices.append(invoice.id)

                # --- Send email if issued ---
                if send_email and recipient_email:
                    # Use the send_invoice_email function to send email with PDF
                    result = send_invoice_email(invoice, user=request.user)
                    print("Email result", result)

                    invoice.status = "ISSUED"
                    invoice.save()

        # Invalidate caches
        return Response(
            {
                "error": False,
                "message": "Invoices created successfully.",
                "invoice_ids": created_invoices,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
@extend_schema(
    tags=["Invoices"],
    responses={200: InvoiceStatsSerializer},
    description="Get summary statistics for invoices (stat cards). Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD for date range filtering.",
)
class InvoiceStatsSummaryView(APIView):
    """
    API endpoint for invoice stat card summary.
    Supports date range filtering on issue_date using 'from' and 'to' query parameters.
    Uses cache for performance.
    """

    def parse_date(self, date_str, param_name):
        if not date_str:
            return None
        try:
            return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid {param_name} format. Use YYYY-MM-DD.")

    def get(self, request, *args, **kwargs):
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")

        qs = Invoice.objects.filter(~Q(status__iexact="CANCELLED"), is_deleted=False)
        # Date range filtering
        filters = {}
        try:
            if from_str:
                filters["issue_date__gte"] = self.parse_date(from_str, "from")
            if to_str:
                filters["issue_date__lte"] = self.parse_date(to_str, "to")
            if filters:
                qs = qs.filter(**filters)
        except ValueError as e:
            return Response(
                {"error": True, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregation
        total_invoices = qs.count()
        draft_invoices = qs.filter(status__iexact="DRAFT").count()
        sent_invoices = qs.filter(status__iexact="ISSUED").count()
        paid_invoices = qs.filter(status__iexact="PAID").count()
        overdue_invoices = qs.filter(
            due_date__lt=timezone.now().date(), status__iexact="PARTIAL"
        ).count()
        total_amount = qs.aggregate(total=models.Sum("total_amount"))["total"] or 0
        paid_amount = (
            qs.filter(status__iexact="paid").aggregate(
                total=models.Sum("total_amount")
            )["total"]
            or 0
        )
        outstanding_amount = total_amount - paid_amount

        data = {
            "totalInvoices": total_invoices,
            "totalAmount": format_money_with_currency(float(total_amount)),
            "paidAmount": format_money_with_currency(float(paid_amount)),
            "outstandingAmount": format_money_with_currency(float(outstanding_amount)),
            "draftInvoices": draft_invoices,
            "sentInvoices": sent_invoices,
            "paidInvoices": paid_invoices,
            "overdueInvoices": overdue_invoices,
            "currency": get_serialized_default_currency(),
        }
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Invoices"],
    description="List all invoices (paginated, cached, filterable by date range).",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class InvoiceTableListView(ListAPIView):
    serializer_class = InvoiceTableItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_queryset(self):
        qs = Invoice.objects.all()
        from_str = self.request.query_params.get("from")
        to_str = self.request.query_params.get("to")
        if from_str:
            try:
                from_date = datetime.datetime.strptime(from_str, "%Y-%m-%d").date()
                qs = qs.filter(issue_date__gte=from_date)
            except Exception:
                pass
        if to_str:
            try:
                to_date = datetime.datetime.strptime(to_str, "%Y-%m-%d").date()
                qs = qs.filter(issue_date__lte=to_date)
            except Exception:
                pass
        # Order by invoice number (descending) and creation date (descending) to show newest first
        return qs.order_by("-invoice_number", "-created_at")

    def list(self, request, *args, **kwargs):
        page_number = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)
        from_str = request.query_params.get("from", "")
        to_str = request.query_params.get("to", "")
        filters = f"from:{from_str}:to:{to_str}"
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
    tags=["Invoices"],
    description="Get all invoices for a specific tenant. 'user_id' is required. Returns paginated list of invoices with property details.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class TenantInvoicesView(ListAPIView):
    serializer_class = InvoiceTableItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        if not user_id:
            return Invoice.objects.none()

        # Get invoices where the user is a tenant
        return (
            Invoice.objects.filter(tenants__tenant_user_id=user_id, is_deleted=False)
            .select_related("property")
            .prefetch_related("tenants__tenant_user", "tenants__node")
            .order_by("-issue_date", "-created_at")
        )

    def list(self, request, *args, **kwargs):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"error": True, "message": "'user_id' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset()

        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data})


@extend_schema(
    tags=["Invoices"],
    description="Get all invoices for a specific owner. 'user_id' is required. Returns paginated list of invoices with property details.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class OwnerInvoicesView(ListAPIView):
    serializer_class = InvoiceTableItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        if not user_id:
            return Invoice.objects.none()

        # Get invoices where the user is an owner
        return (
            Invoice.objects.filter(owners__owner_user_id=user_id, is_deleted=False)
            .select_related("property")
            .prefetch_related("owners__owner_user", "owners__node")
            .order_by("-issue_date", "-created_at")
        )

    def list(self, request, *args, **kwargs):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"error": True, "message": "'user_id' parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset()

        serializer = self.get_serializer(qs, many=True)
        data = {
            "count": qs.count(),
            "results": serializer.data,
        }
        return Response({"error": False, "data": data})


@extend_schema(
    tags=["Invoices"],
    description="Get invoice details and payment history for a specific invoice. 'invoice_id' is required.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        try:
            invoice = (
                Invoice.objects.select_related("property")
                .prefetch_related(
                    "tenants__tenant_user", "tenants__node", "items", "receipts"
                )
                .get(id=invoice_id, is_deleted=False)
            )
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get invoice details
        invoice_data = {
            "id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "description": invoice.description,
            "total_amount": format_money_with_currency(invoice.total_amount),
            "balance": format_money_with_currency(invoice.balance),
            "status": invoice.status,
            "issue_date": invoice.issue_date.isoformat(),
            "due_date": invoice.due_date.isoformat(),
            "currency": "USD",  # Default currency since Invoice doesn't have currency field
            "property_name": invoice.property.name,
            "property_address": self._get_property_address(invoice.property),
        }

        # Get invoice items for THIS specific invoice only
        items = []
        print(f"DEBUG: Invoice ID: {invoice.id}")
        print(f"DEBUG: Invoice items count: {invoice.items.count()}")

        for (
            item
        ) in invoice.items.all():  # This should already be filtered by the invoice
            print(f"DEBUG: Processing item {item.id} for invoice {item.invoice.id}")
            items.append(
                {
                    "id": str(item.id),
                    "description": item.name,
                    "type": item.type,
                    "quantity": float(item.quantity),
                    "amount": format_money_with_currency(item.amount),
                    "price": format_money_with_currency(item.price),
                    "rate": format_money_with_currency(item.amount)
                    if item.quantity == 1
                    else format_money_with_currency(item.amount / item.quantity),
                    "node_name": getattr(item, "node_name", "") or "",
                    "percentage_rate": getattr(item, "percentage_rate", None),
                    "service_id": str(item.service.id) if item.service else None,
                    "penalty_id": str(item.penalty.id) if item.penalty else None,
                    "invoice_id": str(
                        invoice.id
                    ),  # Add invoice_id for frontend filtering
                }
            )

        print(f"DEBUG: Final items count: {len(items)}")

        # Get payment history
        payments = []
        for receipt in invoice.receipts.all():
            payments.append(
                {
                    "id": str(receipt.id),
                    "transaction_id": f"TXN-{receipt.receipt_number}",
                    "amount": format_money_with_currency(receipt.paid_amount),
                    "payment_method": receipt.payment_method,
                    "status": "Completed",
                    "payment_date": receipt.payment_date.isoformat(),
                    "currency": "USD",  # Default currency since Invoice doesn't have currency field
                    "notes": receipt.notes or "",
                }
            )

        data = {
            "invoice": invoice_data,
            "items": items,
            "payments": payments,
        }

        print("data", data)

        return Response({"error": False, "data": data}, status=status.HTTP_200_OK)

    def _get_property_address(self, property_node):
        """Get formatted property address from location node"""
        try:
            # Get project details if available
            if (
                hasattr(property_node, "project_detail")
                and property_node.project_detail
            ):
                return property_node.project_detail.address
            else:
                # Fallback to property name
                return property_node.name
        except:
            return property_node.name


@extend_schema(
    tags=["Invoices"],
    description="Update an invoice's variable items and status. Only variable items are accepted. Pass type as 'draft' or 'issued'.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="PATCH", block=True),
    name="dispatch",
)
class InvoiceUpdateView(UpdateAPIView):
    serializer_class = InvoiceUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "invoice_id"

    def get_queryset(self):
        return Invoice.objects.all()

    def update(self, request, *args, **kwargs):
        invoice_id = self.kwargs.get(self.lookup_url_kwarg)
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."}, status=404
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Update invoice fields
        old_status = invoice.status
        invoice.status = data["type"].upper()

        # Update new fields if provided
        if "tax_percentage" in data:
            invoice.tax_percentage = data["tax_percentage"]
        if "notes" in data:
            invoice.description = data["notes"]
        if "due_date" in data:
            invoice.due_date = data["due_date"]
        if "issue_date" in data:
            invoice.issue_date = data["issue_date"]
        # Note: discount is not updated in the update view, it's calculated from percentage

        invoice.save()

        # Update variable items
        for item_data in data["items"]:
            try:
                item = invoice.items.get(id=item_data["id"])
                # Handle new amount and quantity fields
                if "amount" in item_data:
                    item.amount = item_data["amount"]
                if "quantity" in item_data:
                    item.quantity = item_data["quantity"]
                # Recalculate price based on amount and quantity
                item.price = item.amount * item.quantity
                item.save()
            except Exception:
                continue

        # Calculate new totals with tax and discount
        subtotal = sum(item.price for item in invoice.items.all())
        tax_amount = (
            float(subtotal) * (float(invoice.tax_percentage) / 100)
            if invoice.tax_percentage
            else 0
        )
        discount_amount = (
            float(invoice.discount) if invoice.discount else 0
        )  # Convert to float
        total_amount = float(subtotal) + tax_amount - discount_amount

        # Update invoice amounts
        invoice.total_amount = subtotal
        invoice.balance = total_amount
        invoice.save()

        # Send email if status changed to ISSUED
        if old_status != "ISSUED" and invoice.status == "ISSUED":
            result = send_invoice_email(invoice, user=request.user)
            print("Email result", result)

            if result["success"]:
                print(f"Email sent successfully for invoice {invoice.invoice_number}")
                if result["pdf_generated"]:
                    print(f"PDF generated: {result['pdf_path']}")
            else:
                print(f"Email sending failed: {result.get('error', 'Unknown error')}")

        return Response({"error": False, "message": "Invoice updated successfully."})


class InvoiceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."}, status=404
            )
        if invoice.status.upper() != "DRAFT":
            return Response(
                {"error": True, "message": "Only draft invoices can be deleted."},
                status=400,
            )

        # Delete all invoice items
        invoice.items.all().delete()

        invoice.delete()
        # Delete all payments
        return Response(
            {"error": False, "message": "Invoice deleted successfully."}, status=200
        )


class InvoiceCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."}, status=404
            )
        if invoice.status.upper() not in ["DRAFT", "ISSUED"]:
            return Response(
                {
                    "error": True,
                    "message": "Only draft or issued invoices can be cancelled.",
                },
                status=400,
            )
        invoice.status = "CANCELLED"

        penalty_items = InvoiceItem.objects.filter(
            invoice=invoice, type__iexact="PENALTY"
        )
        for item in penalty_items:
            penalty = getattr(item, "penalty", None)
            if penalty and getattr(penalty, "linked_invoice_id", None) == invoice.id:
                penalty.status = "pending"
                penalty.linked_invoice = None
                penalty.save()

        invoice.save()

        # Send cancellation email
        try:
            result = send_invoice_email(invoice, user=request.user)
            print("Email result", result)
        except Exception as e:
            print(f"Error sending cancellation email: {e}")

        return Response(
            {"error": False, "message": "Invoice cancelled successfully."}, status=200
        )


@extend_schema(
    tags=["Invoices"],
    description="Send or resend an invoice via email. Updates invoice status to ISSUED if it was DRAFT.",
)
@method_decorator(
    ratelimit(key="ip", rate="10/m", method="POST", block=True),
    name="dispatch",
)
class InvoiceSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."}, status=404
            )

        # Check if invoice can be sent
        if invoice.status.upper() not in ["DRAFT", "ISSUED"]:
            return Response(
                {
                    "error": True,
                    "message": "Only draft or issued invoices can be sent.",
                },
                status=400,
            )

        # Get custom message from request
        custom_message = request.data.get("customMessage", "")

        # Update status to ISSUED if it was DRAFT
        if invoice.status.upper() == "DRAFT":
            invoice.status = "ISSUED"
            invoice.save()

        # Send email using send_invoice_email function
        try:
            result = send_invoice_email(
                invoice, user=request.user, custom_message=custom_message
            )
            print("Email result", result)

        except Exception as e:
            print(f"Error sending invoice: {e}")
            return Response(
                {
                    "error": True,
                    "message": f"Error sending invoice: {str(e)}",
                },
                status=500,
            )

        return Response(
            {
                "error": False,
                "message": "Invoice sent successfully.",
            },
            status=200,
        )


@extend_schema(
    tags=["Invoices"],
    description="Download invoice PDF file. Returns the PDF file for viewing/download.",
)
@method_decorator(
    ratelimit(key="ip", rate="20/m", method="GET", block=True),
    name="dispatch",
)
class InvoiceDownloadPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id, is_deleted=False)

            # Generate PDF on-demand every time
            try:
                print(f"Generating PDF for invoice {invoice.id}...")

                # Build context for the invoice
                from utils.invoice import build_invoice_context

                context = build_invoice_context(invoice, request.user)

                # Render template to HTML
                from utils.email_utils import email_service

                template_content = email_service._load_template(
                    "invoice_email_template.html"
                )
                html_content = email_service._render_template(template_content, context)

                # Generate PDF in memory (don't save to database)
                from utils.invoice import generate_invoice_pdf

                pdf_file_path = generate_invoice_pdf(invoice, html_content)

                if not pdf_file_path:
                    return Response(
                        {
                            "error": True,
                            "message": "Failed to generate PDF for this invoice.",
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Read the generated PDF content
                try:
                    # Reset file pointer to beginning
                    invoice.pdf_file.seek(0)
                    pdf_content = invoice.pdf_file.read()

                    # Check if file has content
                    if not pdf_content:
                        return Response(
                            {"error": True, "message": "Generated PDF is empty."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )

                except (OSError, IOError) as e:
                    return Response(
                        {
                            "error": True,
                            "message": f"Generated PDF cannot be read: {str(e)}",
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Return the PDF file directly
                response = HttpResponse(pdf_content, content_type="application/pdf")
                response["Content-Disposition"] = (
                    f'inline; filename="invoice_{invoice.invoice_number}.pdf"'
                )

                return response

            except Exception as e:
                print(f"Error generating PDF: {e}")
                return Response(
                    {"error": True, "message": f"Failed to generate PDF: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Invoice.DoesNotExist:
            return Response(
                {"error": True, "message": "Invoice not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": True, "message": f"Error downloading PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
