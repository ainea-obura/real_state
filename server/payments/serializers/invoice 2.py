import datetime

from rest_framework import serializers

from accounts.models import Users
from payments.models import Invoice
from properties.models import (
    PropertyOwner,
    PropertyTenant,
)
from utils.invoice import get_missing_invoice_items
from utils.format import format_money_with_currency

now = datetime.date.today()


class RecipientUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    rented_units = serializers.SerializerMethodField()
    owned_nodes = serializers.SerializerMethodField()

    class Meta:
        model = Users
        fields = ["id", "name", "email", "phone", "type", "rented_units", "owned_nodes"]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_rented_units(self, obj):
        if obj.type != "tenant":
            return []
        year, month = now.year, now.month
        qs = PropertyTenant.objects.filter(
            tenant_user=obj, is_deleted=False
        ).select_related("node", "currency")
        result = []
        for pt in qs:
            node = pt.node
            items = get_missing_invoice_items(
                user=obj, node=node, year=year, month=month, user_type="tenant"
            )
            if items:
                ancestors = node.get_ancestors(include_self=True)
                path = " -> ".join([a.name for a in ancestors])
                result.append(
                    {
                        "id": str(pt.id),
                        "name": path,
                        "node_type": node.node_type,
                        "details": {
                            "rent_price": pt.rent_amount,
                            "currency": {
                                "id": str(pt.currency.id),
                                "code": pt.currency.code,
                                "name": pt.currency.name,
                                "symbol": pt.currency.symbol,
                            },
                        },
                    }
                )
        return result

    def get_owned_nodes(self, obj):
        if obj.type != "owner":
            return []
        year, month = now.year, now.month
        qs = PropertyOwner.objects.filter(
            owner_user=obj, is_deleted=False
        ).select_related("node")
        result = []
        for po in qs:
            node = po.node
            items = get_missing_invoice_items(
                user=obj, node=node, year=year, month=month, user_type="owner"
            )
            if items:
                ancestors = node.get_ancestors(include_self=True)
                path = " -> ".join([a.name for a in ancestors])
                result.append(
                    {
                        "id": str(po.id),
                        "name": path,
                        "node_type": node.node_type,
                    }
                )
        return result


class InvoiceItemSerializer(serializers.Serializer):
    description = serializers.CharField()
    node_name = serializers.CharField(required=False, allow_blank=True)
    type = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=4, default=1)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, help_text="Single item amount"
    )
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2, help_text="Total amount (amount × quantity)"
    )
    percentage_rate = serializers.FloatField(allow_null=True)
    currency = serializers.SerializerMethodField()
    inputRequired = serializers.BooleanField(required=False)
    serviceId = serializers.CharField(required=False, allow_null=True)
    unitId = serializers.CharField(required=False, allow_null=True)
    penaltyId = serializers.CharField(required=False, allow_null=True)

    def get_currency(self, obj):
        # obj['currency'] may be a code, id, or object; try to resolve symbol
        currency = obj.get("currency", {})
        if isinstance(currency, dict):
            return {
                "id": str(currency.get("id", "")),
                "code": currency.get("code", ""),
                "name": currency.get("name", ""),
                "symbol": currency.get("symbol", ""),
            }

        return {"id": "", "code": currency or "", "name": "", "symbol": ""}


class TenantUnitItemDetailsSerializer(serializers.Serializer):
    unit_id = serializers.CharField(help_text="ID of the unit")
    unit_name = serializers.CharField(help_text="Name of the unit")
    node_type = serializers.CharField(help_text="Type of the node/unit")
    items = InvoiceItemSerializer(many=True)


# Use the same serializer structure as tenant
class OwnerNodeItemDetailsSerializer(serializers.Serializer):
    node_id = serializers.CharField()
    node_name = serializers.CharField()
    node_type = serializers.CharField()
    items = InvoiceItemSerializer(many=True)


class CurrencySerializer(serializers.Serializer):
    id = serializers.CharField()
    code = serializers.CharField()
    name = serializers.CharField()
    symbol = serializers.CharField()


class UnitSerializer(serializers.Serializer):
    unitId = serializers.CharField()
    unitName = serializers.CharField()
    items = InvoiceItemSerializer(many=True)


class RecipientSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.CharField()
    name = serializers.CharField()
    units = UnitSerializer(many=True)


class InvoiceCreateSerializer(serializers.Serializer):
    recipients = RecipientSerializer(many=True)
    dueDate = serializers.CharField()
    issueDate = serializers.CharField()
    notes = serializers.CharField(allow_blank=True, required=False)
    isRecurring = serializers.BooleanField(required=False, default=False)
    recurringFrequency = serializers.CharField(required=False, allow_blank=True)
    recurringEndDate = serializers.CharField(allow_blank=True, required=False)
    taxPercentage = serializers.FloatField(required=False, default=0)
    discountPercentage = serializers.FloatField(required=False, default=0)
    status = serializers.ChoiceField(
        choices=[("draft", "Draft"), ("issued", "Issued")],
        help_text="Status of the invoice: 'draft' or 'issued'.",
    )


class InvoiceStatsSerializer(serializers.Serializer):
    """
    Serializer for invoice stat card summary data.
    Matches the InvoiceStatsSchema in features/finance/scehmas/invoice.ts.
    """

    totalInvoices = serializers.IntegerField()
    totalAmount = serializers.CharField()
    paidAmount = serializers.CharField()
    outstandingAmount = serializers.CharField()
    draftInvoices = serializers.IntegerField()
    sentInvoices = serializers.IntegerField()
    paidInvoices = serializers.IntegerField()
    overdueInvoices = serializers.IntegerField()
    currency = serializers.DictField()


class InvoiceTableItemPropertySerializer(serializers.Serializer):
    unit = serializers.CharField()
    projectName = serializers.CharField()


class InvoiceTableItemInvoiceItemSerializer(serializers.Serializer):
    description = serializers.CharField(source="name")
    quantity = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    id = serializers.UUIDField()
    rate = serializers.SerializerMethodField()
    node_name = serializers.SerializerMethodField()
    percentage_rate = serializers.SerializerMethodField()
    serviceId = serializers.SerializerMethodField()
    penaltyId = serializers.SerializerMethodField()

    def get_type(self, obj):
        return obj.type.lower()

    def get_quantity(self, obj):
        return float(obj.quantity) if obj.quantity else 1.0

    def get_amount(self, obj):
        return float(obj.amount) if obj.amount else 0.0

    def get_price(self, obj):
        return float(obj.price) if obj.price else 0.0

    def get_rate(self, obj):
        return float(obj.amount) if obj.amount else 0.0

    def get_node_name(self, obj):
        return getattr(obj, "node_name", "") or ""

    def get_percentage_rate(self, obj):
        return getattr(obj, "percentage_rate", None)

    def get_serviceId(self, obj):
        return str(obj.service.id) if obj.service else None

    def get_penaltyId(self, obj):
        return str(obj.penalty.id) if obj.penalty else None


class InvoiceTableItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    invoiceNumber = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    property = serializers.SerializerMethodField()
    items = InvoiceTableItemInvoiceItemSerializer(many=True)
    subtotal = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    tax_percentage = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    total_no_currency = serializers.SerializerMethodField()
    dueDate = serializers.CharField(source="due_date")
    issueDate = serializers.CharField(source="issue_date")
    status = serializers.ChoiceField(
        choices=["draft", "sent", "viewed", "paid", "overdue", "cancelled", "partial"]
    )
    currency = serializers.SerializerMethodField()

    def get_recipient(self, obj):
        # Example logic: adjust as per your model relations
        # If invoice is for a tenant
        if hasattr(obj, "tenants") and obj.tenants.exists():
            tenant = obj.tenants.first().tenant_user
            return {
                "name": f"{tenant.first_name} {tenant.last_name}".strip(),
                "email": tenant.email,
                "phone": tenant.phone,
                "type": "tenant",
            }
        # If invoice is for an owner
        if hasattr(obj, "owners") and obj.owners.exists():
            owner = obj.owners.first().owner_user
            return {
                "name": f"{owner.first_name} {owner.last_name}".strip(),
                "email": owner.email,
                "phone": owner.phone,
                "type": "owner",
            }
        return {
            "name": "",
            "email": "",
            "phone": "",
            "type": "",
        }

    def get_property(self, obj):
        # obj.property is a LocationNode of type PROPERTY
        property_node = getattr(obj, "property", None)
        if property_node:
            # The "unit" is the property name
            unit_name = property_node.name
            # Traverse ancestors to find the project node
            project_name = ""
            for ancestor in property_node.get_ancestors(include_self=True):
                if ancestor.node_type == "PROJECT":
                    project_name = ancestor.name
                    break
            return {
                "unit": unit_name,
                "projectName": project_name,
            }
        return {
            "unit": "",
            "projectName": "",
        }

    def get_subtotal(self, obj):
        # If you want to sum item prices:
        # return sum(item.price for item in obj.items.all())
        # Or just return 0 if you don't have this info:
        return format_money_with_currency(0)

    def get_tax(self, obj):
        return format_money_with_currency(0)

    def get_discount(self, obj):
        return obj.discount

    def get_discount_percentage(self, obj):
        return obj.discount

    def get_tax_percentage(self, obj):
        return obj.tax_percentage

    def get_balance(self, obj):
        # Calculate total amount including tax and discount
        total_amount = float(obj.total_amount)
        tax_percentage = float(obj.tax_percentage) if obj.tax_percentage else 0
        discount_amount = float(obj.discount) if obj.discount else 0

        # Calculate tax amount
        tax_amount = total_amount * (tax_percentage / 100)

        # Calculate final balance: total + tax - discount
        balance = total_amount + tax_amount - discount_amount

        return format_money_with_currency(balance)

    def get_total(self, obj):
        return format_money_with_currency(obj.total_amount)

    def get_total_no_currency(self, obj):
        return obj.total_amount

    def get_invoiceNumber(self, obj):
        return f"INV-{obj.issue_date.strftime('%y')}-{obj.invoice_number:04d}"

    def get_currency(self, obj):
        # obj is an Invoice instance
        property_node = getattr(obj, "property", None)
        tenants = getattr(obj, "tenants", None)
        if property_node and tenants and tenants.exists():
            # Find the PropertyTenant whose node matches the invoice property
            for pt in tenants.all():
                if getattr(pt, "node", None) == property_node:
                    if pt.currency:
                        return CurrencySerializer(pt.currency).data
        return None


class InvoiceVariableItemUpdateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=4, required=False)


class InvoiceUpdateSerializer(serializers.Serializer):
    items = InvoiceVariableItemUpdateSerializer(many=True)
    type = serializers.ChoiceField(choices=[("draft", "Draft"), ("issued", "Issued")])
    tax_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, default=0
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateField(required=False)
    issue_date = serializers.DateField(required=False)
