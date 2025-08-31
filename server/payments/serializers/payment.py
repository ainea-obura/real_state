from rest_framework import serializers

from payments.models import Invoice, Receipt


class UnpaidInvoiceSerializer(serializers.ModelSerializer):
    paid_amount = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField(method_name="get_invoiceNumber")

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "due_date",
            "total_amount",
            "paid_amount",
            "balance",
            "status",
        ]

    def get_paid_amount(self, obj):
        # Sum all receipts for this invoice
        return sum(receipt.paid_amount for receipt in obj.receipts.all())

    def get_balance(self, obj):
        # Use the balance field from the model which already includes tax and discount calculations
        return float(obj.balance)

    def get_invoiceNumber(self, obj):
        """
        Returns invoice number in the format: INV-YYMM-XXXX
        Where:
            YY = last two digits of issue year
            MM = two-digit month
            XXXX = zero-padded invoice number
        """
        issue_date = getattr(obj, "issue_date", None)
        if issue_date:
            year_short = str(issue_date.year)[-2:]
            month = f"{issue_date.month:02d}"
        else:
            year_short = "00"
            month = "00"
        return f"INV-{year_short}{month}-{str(obj.invoice_number).zfill(4)}"


class PaymentInvoiceAppliedSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    invoiceNumber = serializers.CharField()
    amount = serializers.FloatField()
    appliedAmount = serializers.FloatField()


class CreatePaymentSerializer(serializers.Serializer):
    recipientType = serializers.ChoiceField(
        choices=[("tenant", "Tenant"), ("owner", "Owner")]
    )
    recipient = serializers.DictField()  # {id, name}
    paymentDate = serializers.DateField()
    paymentMethod = serializers.CharField()
    amountPaid = serializers.FloatField()
    notes = serializers.CharField(required=False, allow_blank=True)
    sendReceipt = serializers.BooleanField(required=False)
    invoicesApplied = PaymentInvoiceAppliedSerializer(many=True)
    totalApplied = serializers.FloatField()
    balance = serializers.FloatField()
    status = serializers.CharField()
    trans_ids = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )


class PaymentStatsSerializer(serializers.Serializer):
    totalPayments = serializers.CharField()
    totalAmountPaid = serializers.CharField()
    totalInvoices = serializers.CharField()
    totalOutstanding = serializers.CharField()
    lastPaymentDate = serializers.DateField(allow_null=True)


class PaymentTableItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    paymentNumber = serializers.CharField()
    tenant = serializers.DictField()
    property = serializers.DictField()
    paymentDate = serializers.CharField()
    paymentMethod = serializers.ChoiceField(
        choices=[
            "cash",
            "bank_transfer",
            "online",
            "evc_plus",
            "mpesa",
            "other",
        ]
    )
    amountPaid = serializers.FloatField()
    amountPaidNoCurrency = serializers.FloatField()
    invoicesApplied = serializers.ListField(child=serializers.DictField())
    balanceRemaining = serializers.FloatField()
    status = serializers.ChoiceField(
        choices=["success", "failed", "refunded", "partial", "pending"]
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    receiptUrl = serializers.CharField(required=False, allow_blank=True)
    createdBy = serializers.CharField()
    createdAt = serializers.CharField()
    updatedAt = serializers.CharField(required=False, allow_blank=True)


class PaymentTableResponseSerializer(serializers.Serializer):
    error = serializers.BooleanField()
    data = serializers.DictField()


class CreateCreditNoteSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField(
        help_text="ID of the invoice to create credit note for"
    )
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, help_text="Credit amount to refund"
    )
    reason = serializers.CharField(
        required=False, allow_blank=True, help_text="Reason for the credit note"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Detailed description of the credit note",
    )
    paymentMethod = serializers.CharField(
        help_text="Payment method for the credit note disbursement"
    )
    accountNumber = serializers.CharField(
        help_text="Account number or phone number for the disbursement",
        required=False,
        allow_blank=True,
    )
