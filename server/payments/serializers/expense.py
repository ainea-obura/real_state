from rest_framework import serializers

from payments.models import Expense, Vendor
from properties.models import LocationNode, Service
from utils.currency import get_serialized_default_currency
from utils.format import format_money_with_currency

from .currency import CurrencySerializer


class LocationNodeSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["id", "name", "project_name"]

    def get_project_name(self, obj):
        if getattr(obj, "node_type", None) == "PROJECT":
            return obj.name
        # Traverse ancestors to find the PROJECT node
        node = obj
        while hasattr(node, "parent") and node.parent is not None:
            node = node.parent
            if getattr(node, "node_type", None) == "PROJECT":
                return node.name
        return ""


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "billed_to"]


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "email", "phone"]


class ExpenseSerializer(serializers.ModelSerializer):
    location_node = LocationNodeSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    vendor = VendorSerializer(read_only=True)
    document_url = serializers.SerializerMethodField()
    currency = CurrencySerializer(read_only=True)
    expense_number = serializers.SerializerMethodField()
    commission_type = serializers.SerializerMethodField()
    commission_reference = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "location_node",
            "service",
            "vendor",
            "description",
            "amount",
            "tax_amount",
            "total_amount",
            "invoice_date",
            "due_date",
            "paid_date",
            "status",
            "payment_method",
            "notes",
            "document_url",
            "currency",
            "commission_type",
            "commission_reference",
        ]

    def get_document_url(self, obj):
        if obj.attachments:
            return obj.attachments.url
        return None

    def get_expense_number(self, obj):
        return f"PV-{obj.created_at.strftime('%y')}-{obj.expense_number:04d}"

    def get_commission_type(self, obj):
        if obj.commission_type == "sales":
            return "Sales Commission"
        elif obj.commission_type == "tenant":
            return "Tenant Commission"
        elif obj.commission_type == "sales_person":
            return "Sales Person Commission"
        return ""  # Return empty string instead of None

    def get_commission_reference(self, obj):
        if obj.commission_reference:
            return str(obj.commission_reference)  # Ensure it's a string
        return ""  # Return empty string instead of None

    def get_amount(self, obj):
        return format_money_with_currency(obj.amount)

    def get_total_amount(self, obj):
        return format_money_with_currency(obj.total_amount)


class ExpenseStatsSerializer(serializers.Serializer):
    totalExpenses = serializers.CharField()
    totalPaid = serializers.CharField()
    outStanding = serializers.CharField()
    pendingExpenses = serializers.CharField()
    overdueExpenses = serializers.CharField()
    budgetRemaining = serializers.CharField()
    monthlyBudget = serializers.CharField()
    currency = serializers.DictField()


# Optionally, a thin list serializer (if you want to optimize table payload)
class ExpenseListSerializer(serializers.ModelSerializer):
    currency = CurrencySerializer(read_only=True)
    expense_number = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "location_node",
            "service",
            "vendor",
            "amount",
            "total_amount",
            "status",
            "invoice_date",
            "due_date",
            "currency",
        ]

    def get_expense_number(self, obj):
        return f"PV-{obj.created_at.strftime('%y')}-{obj.expense_number:04d}"


class ExpenseCreateSerializer(serializers.ModelSerializer):
    location_node_id = serializers.PrimaryKeyRelatedField(
        queryset=Expense._meta.get_field("location_node").related_model.objects.all(),
        source="location_node",
        write_only=True,
    )
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Expense._meta.get_field("service").related_model.objects.all(),
        source="service",
        write_only=True,
    )
    vendor_id = serializers.PrimaryKeyRelatedField(
        queryset=Expense._meta.get_field("vendor").related_model.objects.all(),
        source="vendor",
        write_only=True,
    )
    currency = serializers.PrimaryKeyRelatedField(
        queryset=Expense._meta.get_field("currency").related_model.objects.all(),
        write_only=True,
    )
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    invoice_date = serializers.DateField()
    due_date = serializers.DateField()
    payment_method = serializers.CharField(max_length=64)
    description = serializers.CharField(allow_blank=True, required=False)
    notes = serializers.CharField(allow_blank=True, required=False)
    attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = [
            "location_node_id",
            "service_id",
            "vendor_id",
            "amount",
            "tax_amount",
            "total_amount",
            "invoice_date",
            "due_date",
            "payment_method",
            "description",
            "notes",
            "attachment",
            "currency",
        ]

    def create(self, validated_data):
        attachment = validated_data.pop("attachment", None)
        expense = super().create(validated_data)

        # Set status based on service pricing type
        if expense.service and expense.service.pricing_type == "VARIABLE":
            expense.status = "waiting_for_approval"
        else:
            expense.status = "pending"

        if attachment:
            expense.attachments = attachment

        expense.save()
        return expense
