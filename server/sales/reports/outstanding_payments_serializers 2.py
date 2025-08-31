from rest_framework import serializers
from django.utils import timezone


class OutstandingPaymentSerializer(serializers.Serializer):
    """Serializer for individual outstanding payment data"""

    id = serializers.UUIDField()
    invoiceNumber = serializers.CharField()
    paymentNumber = serializers.CharField()

    # Buyer information
    buyer = serializers.CharField(source="payment_plan.sale_item.buyer.get_full_name")
    buyerPhone = serializers.CharField(source="payment_plan.sale_item.buyer.phone")
    buyerEmail = serializers.CharField(source="payment_plan.sale_item.buyer.email")

    # Property information - these will be populated in the view
    projectName = serializers.CharField()
    propertyInfo = serializers.CharField()

    # Salesperson information
    salesperson = serializers.CharField(
        source=("payment_plan.sale_item.sale.assigned_sales_person.user.get_full_name")
    )
    salespersonPhone = serializers.CharField(
        source=("payment_plan.sale_item.sale.assigned_sales_person.user.phone")
    )
    salespersonEmail = serializers.CharField(
        source=("payment_plan.sale_item.sale.assigned_sales_person.user.email")
    )

    # Payment details
    dueDate = serializers.DateField(source="due_date")
    daysOverdue = serializers.SerializerMethodField()
    amount = serializers.FloatField()
    status = serializers.CharField()

    # Follow-up information
    lastFollowUpDate = serializers.DateField(
        source="last_follow_up_date", allow_null=True
    )
    followUpStatus = serializers.CharField(source="follow_up_status", allow_null=True)

    def get_daysOverdue(self, obj):
        """Calculate days overdue"""
        if obj.status == "paid":
            return 0
        if obj.due_date < timezone.now().date():
            return (timezone.now().date() - obj.due_date).days
        return 0


class OutstandingPaymentsKPISerializer(serializers.Serializer):
    """Serializer for Outstanding Payments KPIs"""

    overdueInvoicesCount = serializers.IntegerField()
    overdueAmountTotal = serializers.FloatField()
    avgDaysOverdue = serializers.FloatField()
    leadsWithoutFollowup = serializers.IntegerField()


class OutstandingPaymentsReportSerializer(serializers.Serializer):
    """Main serializer for Outstanding Payments report"""

    success = serializers.BooleanField()
    message = serializers.CharField()
    data = serializers.DictField()

    # Nested serializers
    kpis = OutstandingPaymentsKPISerializer()
    overduePayments = OutstandingPaymentSerializer(many=True)


class OutstandingPaymentsQuerySerializer(serializers.Serializer):
    """Query parameters for Outstanding Payments report"""

    from_date = serializers.DateField(required=False)
    to_date = serializers.DateField(required=False)
    project_id = serializers.UUIDField(required=False)
