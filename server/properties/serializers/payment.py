from rest_framework import serializers
from payments.models import Invoice, Expense
from utils.format import format_money_with_currency

class PaymentReportInvoiceSerializer(serializers.Serializer):
    number = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    status = serializers.CharField()
    date = serializers.DateField(source="issue_date")
    property_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    def get_number(self, obj):
        issue_date = getattr(obj, "issue_date", None)
        if issue_date:
            year_short = str(issue_date.year)[-2:]
            month = f"{issue_date.month:02d}"
        else:
            year_short = "00"
            month = "00"
        return f"INV-{year_short}{month}-{str(obj.invoice_number).zfill(4)}"

    def get_recipient(self, obj):
        if obj.tenants.exists():
            return obj.tenants.first().tenant_user.get_full_name()
        elif obj.owners.exists():
            return obj.owners.first().owner_user.get_full_name()
        return ""

    def get_amount(self, obj):
        return format_money_with_currency(obj.total_amount)

    def get_property_name(self, obj):
        return obj.property.name if obj.property else ""

    def get_location_name(self, obj):
        return obj.property.node_type if obj.property else ""

class PaymentReportExpenseSerializer(serializers.Serializer):
    number = serializers.SerializerMethodField()
    vendor = serializers.CharField(source="vendor.name")
    amount = serializers.SerializerMethodField()
    status = serializers.CharField()
    date = serializers.DateField(source="invoice_date")
    desc = serializers.CharField(source="description")
    property_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    def get_number(self, obj):
        return f"PV-{obj.created_at.strftime('%y')}-{obj.expense_number:04d}"

    def get_amount(self, obj):
        return format_money_with_currency(obj.total_amount)

    def get_property_name(self, obj):
        return obj.location_node.name if obj.location_node else ""

    def get_location_name(self, obj):
        return obj.location_node.node_type if obj.location_node else ""

class PaymentReportStatsSerializer(serializers.Serializer):
    totalIncome = serializers.CharField()
    totalExpenses = serializers.CharField()
    netBalance = serializers.CharField()

class PaymentReportSerializer(serializers.Serializer):
    stats = PaymentReportStatsSerializer()
    recentInvoices = PaymentReportInvoiceSerializer(many=True)
    recentExpenses = PaymentReportExpenseSerializer(many=True)
