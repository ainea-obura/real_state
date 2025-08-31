# server/apps/payments/models.py

import os
import uuid

from django.db import models
from django.utils import timezone

from accounts.models import Users
from properties.models import (
    Currencies,
    LocationNode,
    PropertyOwner,
    PropertyService,
    PropertyTenant,
    Service,
    TimeStampedUUIDModel,
)


def invoice_pdf_upload_path(instance, filename):
    """Generate upload path for invoice PDFs organized by year/month"""
    # Get the year and month from the invoice issue date
    year = instance.issue_date.year
    month = instance.issue_date.month

    # Create path: invoices/pdfs/YYYY/MM/filename
    return os.path.join("invoices", "pdfs", str(year), f"{month:02d}", filename)


PAYMENT_METHOD_CHOICES = [
    ("cash", "Cash"),
    ("bank_transfer", "Bank Transfer"),
    ("paybill/buygoods", "PayBill/BuyGoods"),
    ("credit_note", "Credit Note"),
    ("00", "SasaPay"),
    ("01", "KCB"),
    ("02", "Standard Chartered Bank KE"),
    ("03", "Absa Bank"),
    ("07", "NCBA"),
    ("10", "Prime Bank"),
    ("11", "Cooperative Bank"),
    ("12", "National Bank"),
    ("14", "M-Oriental"),
    ("16", "Citibank"),
    ("18", "Middle East Bank"),
    ("19", "Bank of Africa"),
    ("23", "Consolidated Bank"),
    ("25", "Credit Bank"),
    ("31", "Stanbic Bank"),
    ("35", "ABC Bank"),
    ("36", "Choice Microfinance Bank"),
    ("43", "Eco Bank"),
    ("50", "Paramount Universal Bank"),
    ("51", "Kingdom Bank"),
    ("53", "Guaranty Bank"),
    ("54", "Victoria Commercial Bank"),
    ("55", "Guardian Bank"),
    ("57", "I&M Bank"),
    ("61", "HFC Bank"),
    ("63", "DTB"),
    ("65", "Mayfair Bank"),
    ("66", "Sidian Bank"),
    ("68", "Equity Bank"),
    ("70", "Family Bank"),
    ("72", "Gulf African Bank"),
    ("74", "First Community Bank"),
    ("75", "DIB Bank"),
    ("76", "UBA"),
    ("78", "KWFT Bank"),
    ("89", "Stima Sacco"),
    ("97", "Telcom Kenya"),
    ("63902", "MPesa"),
    ("63903", "AirtelMoney"),
    ("63907", "T-Kash"),
]


class Invoice(TimeStampedUUIDModel):
    """
    Represents a bill issued to one or more tenants/owners for various charges.
    Supports discounts, penalties, and tracks balance.
    """

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("ISSUED", "Issued"),
        ("PAID", "Paid"),
        ("PARTIAL", "Partial"),
        ("OVERDUE", "Overdue"),
        ("CANCELLED", "Cancelled"),
    ]

    invoice_number = models.PositiveIntegerField(
        unique=True,
        db_index=True,
        editable=False,
        help_text="Auto-incrementing invoice number",
    )
    tenants = models.ManyToManyField(
        PropertyTenant,
        related_name="invoices",
        blank=True,
        help_text="Tenants billed (can be multiple)",
    )
    owners = models.ManyToManyField(
        PropertyOwner,
        related_name="invoices",
        blank=True,
        help_text="Owners billed or receiving payment (can be multiple)",
    )
    property = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="invoices",
        db_index=True,
        help_text="Property this invoice relates to",
    )
    issue_date = models.DateField(
        default=timezone.now, db_index=True, help_text="Date invoice was created"
    )
    due_date = models.DateField(db_index=True, help_text="Date payment is due")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
        db_index=True,
        help_text="Current status of the invoice",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Sum of all line items on the invoice (before discount/penalty)",
    )
    description = models.TextField(
        blank=True, help_text="Optional notes or description for the invoice"
    )
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Discount applied to the invoice (absolute value)",
    )
    tax_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Tax percentage applied to invoice",
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Outstanding balance after payments, discounts, penalties",
    )
    pdf_file = models.FileField(
        upload_to=invoice_pdf_upload_path,
        null=True,
        blank=True,
        help_text="Generated PDF file for this invoice",
    )

    class Meta:
        db_table = "invoice"
        indexes = [
            models.Index(fields=["issue_date", "due_date"]),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by("-invoice_number").first()
            self.invoice_number = (last.invoice_number if last else 0) + 1
        super().save(*args, **kwargs)


class InvoiceItem(TimeStampedUUIDModel):
    """
    Individual line item within an Invoice.
    Can optionally link to a PropertyService.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Invoice this item belongs to",
    )
    type = models.CharField(
        max_length=20, default="RENT", help_text="Type of invoice item"
    )
    name = models.CharField(max_length=255, help_text="Name/description of this item")
    service = models.ForeignKey(
        PropertyService,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_items",
        help_text="Linked service (if applicable)",
    )
    penalty = models.ForeignKey(
        "Penalty",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
        help_text="Penalty associated with this invoice (if any)",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Single item amount (e.g., monthly rent amount)",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=1,
        help_text="Quantity for this item (e.g., number of months)",
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total price for this item (amount × quantity)",
    )
    percentage_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage rate for percentage-based items",
    )

    class Meta:
        db_table = "invoice_item"
        indexes = [
            models.Index(fields=["invoice", "service"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.price})"


class Penalty(TimeStampedUUIDModel):
    """
    Enhanced penalty model with full functionality for penalty management.
    """

    PENALTY_TYPE_CHOICES = [
        ("late_payment", "Late Payment"),
        ("returned_payment", "Returned Payment"),
        ("lease_violation", "Lease Violation"),
        ("utility_overcharge", "Utility Overcharge"),
        ("other", "Other"),
    ]
    AMOUNT_TYPE_CHOICES = [
        ("fixed", "Fixed Amount"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("applied_to_invoice", "Applied to Invoice"),
        ("waived", "Waived"),
        ("paid", "Paid"),
    ]

    penalty_number = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Auto-generated unique penalty number",
    )
    property_tenant = models.ForeignKey(
        PropertyTenant,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="penalties",
        help_text="Property tenant this penalty is applied to",
    )
    currency = models.ForeignKey(
        Currencies,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="penalties",
        help_text="Currency for this penalty",
    )
    penalty_type = models.CharField(
        max_length=20,
        choices=PENALTY_TYPE_CHOICES,
        help_text="Type of penalty",
        default="late_payment",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Penalty amount",
        default=0,
    )
    amount_type = models.CharField(
        max_length=10,
        choices=AMOUNT_TYPE_CHOICES,
        default="fixed",
        help_text="Penalty amount type (fixed only)",
    )

    date_applied = models.DateField(
        help_text="Date penalty was applied",
        null=True,
        blank=True,
        default=timezone.now,
    )
    due_date = models.DateField(
        help_text="Date penalty is due",
        null=True,
        blank=True,
        default=timezone.now,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status of the penalty",
    )
    linked_invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="penalties",
        help_text="Invoice this penalty is linked to (if applied to invoice)",
    )
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about the penalty",
        null=True,
    )
    tenant_notes = models.TextField(
        blank=True, help_text="Notes visible to the tenant", null=True
    )
    created_by = models.ForeignKey(
        Users,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="created_penalties",
        help_text="User who created the penalty",
    )
    waived_at = models.DateTimeField(
        null=True, blank=True, help_text="Date and time penalty was waived"
    )
    waived_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waived_penalties",
        help_text="User who waived the penalty",
    )
    waived_reason = models.TextField(
        blank=True, help_text="Reason for waiving the penalty", null=True
    )

    class Meta:
        db_table = "penalty"
        indexes = [
            models.Index(fields=["penalty_type", "status"]),
            models.Index(fields=["penalty_number"]),
            models.Index(fields=["date_applied", "due_date"]),
            models.Index(fields=["property_tenant", "status"]),
            models.Index(fields=["currency"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Penalty {self.penalty_number} - {self.amount} ({self.get_penalty_type_display()})"

    def save(self, *args, **kwargs):
        """Auto-generate penalty number if not provided"""
        if not self.penalty_number:
            from .penalties.utils import generate_penalty_number

            self.penalty_number = generate_penalty_number()
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if penalty is overdue"""
        from django.utils import timezone

        return self.due_date < timezone.now().date() and self.status == "pending"

    @property
    def calculated_amount(self):
        """Calculate the actual penalty amount"""
        return self.amount


class Receipt(TimeStampedUUIDModel):
    """
    Receipt for a payment made against an invoice.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="receipts",
        help_text="Invoice this receipt is for",
    )
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Amount paid in this receipt"
    )
    payment_date = models.DateTimeField(
        default=timezone.now, help_text="Date/time payment was made"
    )
    notes = models.TextField(
        blank=True, help_text="Optional notes or description for the receipt"
    )
    receipt_number = models.PositiveIntegerField(
        unique=True,
        db_index=True,
        editable=False,
        help_text="Auto-incrementing receipt number",
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.0,
        help_text="Balance after this receipt",
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="bank_transfer",
        help_text="Payment method used for this receipt",
    )

    class Meta:
        db_table = "receipt"
        indexes = [
            models.Index(fields=["invoice", "payment_date"]),
        ]

    def __str__(self):
        return f"Receipt {self.paid_amount} for {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            last = Receipt.objects.order_by("-receipt_number").first()
            self.receipt_number = (last.receipt_number if last else 0) + 1
        super().save(*args, **kwargs)


class Payout(TimeStampedUUIDModel):
    """
    Payout model for managing payments to property owners.
    Tracks rent collected, services/expenses, and net amounts for owner payouts.
    One payout per owner per property per month/year.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("partial", "Partial"),
    ]

    payout_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Auto-generated unique payout number",
    )
    owner = models.ForeignKey(
        Users,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="payouts",
        limit_choices_to={"type": "owner"},
        db_index=True,
        help_text="Property owner receiving the payout",
    )
    property_node = models.ForeignKey(
        LocationNode,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="payouts",
        limit_choices_to={"node_type__in": ["PROJECT", "HOUSE", "UNIT"]},
        help_text="Property included in this payout calculation",
    )
    payout_date = models.DateField(
        db_index=True,
        null=True,
        blank=True,
        help_text="Date when payout is scheduled or processed",
    )
    month = models.PositiveSmallIntegerField(
        db_index=True,
        help_text="Month for which this payout is calculated (1-12)",
    )
    year = models.PositiveSmallIntegerField(
        db_index=True,
        help_text="Year for which this payout is calculated",
    )
    rent_collected = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Total rent collected for the payout period",
    )
    services_expenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Total services and expenses deducted",
    )
    management_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Total management fee deducted",
    )
    net_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Net amount to be paid to owner (editable for pending payouts)",
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Total amount paid to owner",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
        help_text="Current status of the payout",
    )
    approved_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payouts",
        help_text="User who approved the payout",
    )
    currency = models.ForeignKey(
        Currencies,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="payouts",
        help_text="Currency for this payout",
    )
    notes = models.TextField(
        blank=True,
        help_text="Optional notes about the payout",
    )
    reference_number = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Reference number for this payout",
    )

    class Meta:
        db_table = "payout"
        indexes = [
            models.Index(fields=["payout_number"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["payout_date"]),
            models.Index(fields=["status", "payout_date"]),
            models.Index(fields=["owner", "property_node", "month", "year"]),
        ]
        unique_together = ("owner", "property_node", "month", "year")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payout {self.payout_number} - {self.owner.get_full_name()} - {self.property.name} ({self.net_amount})"

    def save(self, *args, **kwargs):
        """Auto-generate payout number if not provided"""
        if not self.payout_number:
            last = Payout.objects.order_by("-payout_number").first()
            if last and last.payout_number:
                try:
                    last_num = int(last.payout_number.split("-")[-1])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
            year = self.year if self.year else timezone.now().year
            month = self.month if self.month else timezone.now().month
            self.payout_number = f"PO-{year}-{month:02d}-{str(new_num).zfill(3)}"
        super().save(*args, **kwargs)

    @property
    def is_editable(self):
        """Check if payout amount can be edited (pending or failed status)"""
        return self.status in ["pending", "failed"]

    @property
    def calculated_net_amount(self):
        """Calculate net amount based on rent collected and services/expenses"""
        return self.rent_collected - self.services_expenses

    def approve(self, approved_by_user):
        """Approve the payout"""
        if self.status == "pending":
            self.status = "completed"
            self.approved_by = approved_by_user
            self.save()
            return True
        return False

    def cancel(self):
        """Cancel the payout"""
        if self.status in ["pending", "failed"]:
            self.status = "cancelled"
            self.save()
            return True
        return False

    def recalculate(self):
        """Recalculate the payout with the updated logic"""
        from payments.payouts.utils import calculate_owner_payout

        # Recalculate using the updated logic
        recalculated_payout = calculate_owner_payout(
            self.owner, self.property_node, self.month, self.year
        )

        # Update this instance with the recalculated values
        self.rent_collected = recalculated_payout.rent_collected
        self.services_expenses = recalculated_payout.services_expenses
        self.management_fee = recalculated_payout.management_fee
        self.net_amount = recalculated_payout.net_amount

        # Only update status if it was pending and now has a valid amount
        if self.status == "pending" and self.net_amount >= 0:
            self.status = "pending"  # Keep as pending
        elif self.status == "pending" and self.net_amount < 0:
            # If still negative after recalculation, keep as pending but log
            pass

        self.save()
        return self


class Vendor(TimeStampedUUIDModel):
    """
    Represents a vendor for property-related expenses.
    """

    VENDOR_TYPE_CHOICES = [
        ("company", "Company"),
        ("individual", "Individual"),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    type = models.CharField(
        max_length=255, choices=VENDOR_TYPE_CHOICES, default="company"
    )

    class Meta:
        db_table = "vendor"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(TimeStampedUUIDModel):
    """
    Represents an expense for a project, house, or unit, with vendor, service, amount, and supporting documents.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("partial", "Partial"),
        ("waiting_for_approval", "Waiting for Approval"),
    ]

    expense_number = models.PositiveIntegerField(
        unique=True,
        db_index=True,
        editable=False,
        help_text="Auto-incrementing expense number",
    )
    location_node = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="expenses",
        help_text="Project, House, or Unit this expense is for",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Service/category for this expense",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="Vendor for this expense",
    )
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default="pending", db_index=True
    )
    payment_method = models.CharField(max_length=32, choices=PAYMENT_METHOD_CHOICES)
    notes = models.TextField(blank=True)
    created_by = models.CharField(
        max_length=255, help_text="Name of the user who created the expense"
    )
    attachments = models.FileField(
        upload_to="finance/expenses/",
        blank=True,
        null=True,
        help_text="List of attachment metadata (name, url, size, type, etc.)",
    )
    currency = models.ForeignKey(
        Currencies,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    reference_number = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Reference number for this expense",
    )
    
    # Commission-related fields
    agent = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_expenses",
        help_text="Agent who earned this commission",
    )
    sales_staff = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_staff_expenses",
        help_text="Sales staff who earned this commission",
    )
    commission_type = models.CharField(
        max_length=20,
        choices=[
            ("sales", "Sales Commission"),
            ("tenant", "Tenant Commission"),
            ("sales_person", "Sales Person Commission"),
        ],
        null=True,
        blank=True,
        help_text="Type of commission being paid",
    )
    commission_reference = models.UUIDField(
        null=True,
        blank=True,
        help_text="Reference to the original commission record",
    )

    class Meta:
        db_table = "expense"
        indexes = [
            models.Index(fields=["location_node", "service", "status"]),
            models.Index(fields=["invoice_date", "due_date"]),
            models.Index(fields=["expense_number"]),
        ]
        ordering = ["-invoice_date"]

    def __str__(self):
        return f"Expense {self.expense_number} - {self.service} - {self.amount} for {self.location_node}"

    def save(self, *args, **kwargs):
        if not self.expense_number:
            last = Expense.objects.order_by("-expense_number").first()
            self.expense_number = (last.expense_number if last else 0) + 1
        super().save(*args, **kwargs)


class PaymentRequestTransactions(TimeStampedUUIDModel):
    user_id = models.ForeignKey(Users, on_delete=models.CASCADE)
    invoice = models.ForeignKey("Invoice", on_delete=models.CASCADE)
    payment_gateway = models.CharField(max_length=255, null=True, blank=True)
    merchant_request_id = models.CharField(max_length=255, null=True, blank=True)
    checkout_request_id = models.CharField(max_length=255, null=True, blank=True)
    transaction_reference = models.CharField(max_length=255, null=True, blank=True)
    response_code = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=255, null=True, blank=True)
    response_description = models.CharField(max_length=255, null=True, blank=True)
    amount = models.CharField(max_length=255, null=True, blank=True)
    payment_request_id = models.CharField(max_length=255, null=True, blank=True)
    result_code = models.CharField(max_length=255, null=True, blank=True)
    result_desc = models.CharField(max_length=255, null=True, blank=True)
    source_channel = models.CharField(max_length=255, null=True, blank=True)
    bill_ref_number = models.CharField(max_length=255, null=True, blank=True)
    transaction_date = models.CharField(max_length=255, null=True, blank=True)
    customer_mobile = models.CharField(max_length=255, null=True, blank=True)
    transaction_code = models.CharField(max_length=255, null=True, blank=True)
    third_party_trans_id = models.CharField(max_length=255, null=True, blank=True)
    pay_status = models.CharField(max_length=255, null=True, blank=True)

    # New fields for multiple invoice support
    invoices_data = models.JSONField(
        null=True,
        blank=True,
        help_text="JSON data containing all invoices and their applied amounts",
    )
    expected_total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total expected amount from all invoices",
    )
    is_multiple_invoices = models.BooleanField(
        default=False, help_text="Whether this transaction involves multiple invoices"
    )
    payment_method = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Payment method used for this transaction (e.g., MPesa, Equity Bank, cash)",
    )

    class Meta:
        db_table = "request_transactions"


class PaymentDisparment(TimeStampedUUIDModel):
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    detail = models.CharField(max_length=255, null=True, blank=True)
    b2c_request_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    conversation_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    originator_conversation_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    response_code = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=255, null=True, blank=True)
    response_description = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    merchant_code = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    destination_channel = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    recipient_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    recipient_account_number = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    result_code = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    checkout_request_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    merchant_request_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    result_desc = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    source_channel = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    sasapay_transaction_code = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    transaction_date = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    transaction_amount = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    sasapay_transaction_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    merchant_transaction_reference = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    merchant_account_balance = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    transaction_charges = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )
    pay_status = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "payment_disparment"


class PayBill(TimeStampedUUIDModel):
    status = models.BooleanField(default=True)
    message = models.CharField(max_length=255, null=True, blank=True)
    checkout_request_id = models.CharField(max_length=255, null=True, blank=True)
    merchant_reference = models.CharField(max_length=255, null=True, blank=True)
    response_code = models.CharField(max_length=255, null=True, blank=True)
    transaction_charges = models.CharField(max_length=255, null=True, blank=True)
    merchant_fees = models.CharField(max_length=255, null=True, blank=True)
    merchant_request_id = models.CharField(max_length=255, null=True, blank=True)
    result_code = models.CharField(max_length=255, null=True, blank=True)
    result_desc = models.CharField(max_length=255, null=True, blank=True)
    merchant_code = models.CharField(max_length=255, null=True, blank=True)
    transaction_amount = models.CharField(max_length=255, null=True, blank=True)
    transaction_charge = models.CharField(max_length=255, null=True, blank=True)
    merchant_account_balance = models.CharField(max_length=255, null=True, blank=True)
    merchant_transaction_reference = models.CharField(
        max_length=255, null=True, blank=True
    )
    transaction_date = models.CharField(max_length=255, null=True, blank=True)
    recipient_account_number = models.CharField(max_length=255, null=True, blank=True)
    destination_channel = models.CharField(max_length=255, null=True, blank=True)
    source_channel = models.CharField(max_length=255, null=True, blank=True)
    sasapay_transaction_id = models.CharField(max_length=255, null=True, blank=True)
    recipient_name = models.CharField(max_length=255, null=True, blank=True)
    sender_account_number = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=255, null=True, blank=True)
    reference_number = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "pay_bill"


class InstantPaymentNotification(TimeStampedUUIDModel):
    """
    Instant payment notification from SasaPay
    """

    merchant_code = models.CharField(max_length=255, null=True, blank=True)
    business_short_code = models.CharField(max_length=255, null=True, blank=True)
    invoice_number = models.CharField(max_length=255, null=True, blank=True)
    payment_method = models.CharField(max_length=255, null=True, blank=True)
    trans_id = models.CharField(max_length=255, null=True, blank=True)
    third_party_trans_id = models.CharField(max_length=255, null=True, blank=True)
    full_name = models.CharField(max_length=255, null=True, blank=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    middle_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    transaction_type = models.CharField(max_length=255, null=True, blank=True)
    msisdn = models.CharField(max_length=255, null=True, blank=True)
    org_account_balance = models.CharField(max_length=255, null=True, blank=True)
    trans_amount = models.CharField(max_length=255, null=True, blank=True)
    trans_time = models.CharField(max_length=255, null=True, blank=True)
    bill_ref_number = models.CharField(max_length=255, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_notifications_verified_by",
    )
    verified_for = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_notifications_verified_for",
    )
    verified_for_invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_instant_payment_notifications",
    )

    class Meta:
        db_table = "instant_payment_notification"
        indexes = [
            models.Index(fields=["invoice_number"]),
            models.Index(fields=["trans_id"]),
            models.Index(fields=["bill_ref_number"]),
        ]

    def __str__(self):
        return self.invoice_number


class TaskConfiguration(TimeStampedUUIDModel):
    """
    Configuration model for managing automated Celery tasks.
    Stores settings for invoice generation and reminder tasks.
    """

    TASK_TYPE_CHOICES = [
        ("invoice_generation", "Invoice Generation"),
        ("invoice_reminders", "Invoice Reminders"),
    ]

    FREQUENCY_CHOICES = [
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]

    DAY_OF_WEEK_CHOICES = [
        ("monday", "Monday"),
        ("tuesday", "Tuesday"),
        ("wednesday", "Wednesday"),
        ("thursday", "Thursday"),
        ("friday", "Friday"),
        ("saturday", "Saturday"),
        ("sunday", "Sunday"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("error", "Error"),
    ]

    task_type = models.CharField(
        max_length=50,
        choices=TASK_TYPE_CHOICES,
        unique=True,
        db_index=True,
        help_text="Type of automated task",
    )

    enabled = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this task is enabled",
    )

    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default="daily",
        help_text="How often the task should run",
    )

    time = models.TimeField(
        help_text="Time of day when the task should run",
    )

    execution_frequency = models.CharField(
        max_length=20,
        choices=[
            ("every_minute", "Every Minute"),
            ("every_hour", "Every Hour"),
            ("every_4_hours", "Every 4 Hours"),
            ("every_6_hours", "Every 6 Hours"),
            ("once_daily", "Once Daily"),
        ],
        default="once_daily",
        help_text="How frequently the task should execute within the selected day",
    )

    day_of_week = models.CharField(
        max_length=20,
        choices=DAY_OF_WEEK_CHOICES,
        null=True,
        blank=True,
        help_text="Day of week for weekly frequency",
    )

    day_of_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Day of month for monthly frequency (1-31)",
    )

    # Reminder-specific fields
    before_due_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Days before due date to send reminder (for invoice reminders)",
    )

    after_due_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Days after due date to send reminder (for invoice reminders)",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        db_index=True,
        help_text="Current status of the task",
    )

    last_run = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time the task was executed",
    )

    last_run_status = models.CharField(
        max_length=20,
        choices=[
            ("success", "Success"),
            ("error", "Error"),
            ("skipped", "Skipped"),
        ],
        null=True,
        blank=True,
        help_text="Status of the last execution",
    )

    execution_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of successful executions",
    )

    error_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of failed executions",
    )

    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the task configuration",
    )

    created_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_task_configurations",
        help_text="User who created this configuration",
    )

    updated_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_task_configurations",
        help_text="User who last updated this configuration",
    )

    class Meta:
        db_table = "task_configuration"
        verbose_name = "Task Configuration"
        verbose_name_plural = "Task Configurations"
        indexes = [
            models.Index(fields=["task_type"]),
            models.Index(fields=["enabled", "status"]),
            models.Index(fields=["frequency"]),
            models.Index(fields=["last_run"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_task_type_display()} - {self.get_frequency_display()}"

    def save(self, *args, **kwargs):
        # Validate day_of_month for monthly frequency
        if self.frequency == "monthly" and self.day_of_month:
            if not (1 <= self.day_of_month <= 31):
                raise ValueError("day_of_month must be between 1 and 31")

        # Validate day_of_week for weekly frequency
        if self.frequency == "weekly" and not self.day_of_week:
            raise ValueError("day_of_week is required for weekly frequency")

        # Validate reminder-specific fields
        if self.task_type == "invoice_reminders":
            if not self.before_due_days and not self.after_due_days:
                raise ValueError(
                    "At least one of before_due_days or after_due_days is required for invoice reminders"
                )

        # Ensure only one configuration per task type
        existing = TaskConfiguration.objects.filter(task_type=self.task_type)
        if self.pk:
            existing = existing.exclude(pk=self.pk)

        if existing.exists():
            raise ValueError(f"TaskConfiguration for '{self.task_type}' already exists")

        super().save(*args, **kwargs)

    @property
    def is_weekly(self):
        return self.frequency == "weekly"

    @property
    def is_monthly(self):
        return self.frequency == "monthly"

    @property
    def is_daily(self):
        return self.frequency == "daily"

    def get_cron_expression(self):
        """Generate cron expression for Celery Beat scheduling"""
        if self.frequency == "daily":
            return f"{self.time.minute} {self.time.hour} * * *"
        elif self.frequency == "weekly":
            day_map = {
                "monday": 1,
                "tuesday": 2,
                "wednesday": 3,
                "thursday": 4,
                "friday": 5,
                "saturday": 6,
                "sunday": 0,
            }
            day_num = day_map.get(self.day_of_week, 1)
            return f"{self.time.minute} {self.time.hour} * * {day_num}"
        elif self.frequency == "monthly":
            return f"{self.time.minute} {self.time.hour} {self.day_of_month} * *"
        return None

    def update_execution_stats(self, success=True):
        """Update execution statistics"""
        self.last_run = timezone.now()
        self.last_run_status = "success" if success else "error"
        if success:
            self.execution_count += 1
        else:
            self.error_count += 1
        self.save(
            update_fields=[
                "last_run",
                "last_run_status",
                "execution_count",
                "error_count",
            ]
        )
