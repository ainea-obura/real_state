from dateutil.relativedelta import relativedelta
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from accounts.models import Users
from company.models import TimeStampedUUIDModel
from properties.models import LocationNode


class PaymentPlanTemplate(TimeStampedUUIDModel):
    """
    Reusable payment plan templates for quick setup.
    Enhanced to support the wizard template selection flow.
    """

    TEMPLATE_CATEGORY_CHOICES = [
        ("standard", "Standard"),
        ("extended", "Extended"),
        ("quarterly", "Quarterly"),
        ("semi_annual", "Semi-Annual"),
        ("annual", "Annual"),
        ("flexible", "Flexible"),
        ("custom", "Custom"),
    ]

    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("advanced", "Advanced"),
    ]

    name = models.CharField(
        max_length=255,
        help_text="Name of the payment plan template (e.g., 'Standard 20% Down')",
    )

    description = models.TextField(
        blank=True, help_text="Detailed description of the template"
    )

    # Template Configuration
    category = models.CharField(
        max_length=20,
        choices=TEMPLATE_CATEGORY_CHOICES,
        default="standard",
        help_text="Category of the template for grouping",
    )

    periods = models.PositiveIntegerField(
        help_text="Number of payment periods (installments)"
    )

    frequency = models.CharField(
        max_length=20,
        choices=[
            ("monthly", "Monthly"),
            ("quarterly", "Quarterly"),
            ("semi-annual", "Semi-Annual"),
            ("annual", "Annual"),
        ],
        help_text="Frequency of payments",
    )

    deposit_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Down payment percentage"
    )

    # Template Properties
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="medium",
        help_text="Complexity level of the payment plan",
    )

    is_featured = models.BooleanField(
        default=False, help_text="Whether this template is featured/popular"
    )

    sort_order = models.PositiveIntegerField(
        default=0, help_text="Order for displaying templates in the wizard"
    )

    # Usage Tracking
    usage_count = models.PositiveIntegerField(
        default=0, help_text="Number of times this template has been used"
    )

    last_used = models.DateTimeField(
        null=True, blank=True, help_text="When this template was last used"
    )

    is_active = models.BooleanField(
        default=True, help_text="Whether this template is available for use"
    )

    # Template Validation
    min_property_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum property value this template applies to",
    )

    max_property_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum property value this template applies to",
    )

    class Meta:
        db_table = "payment_plan_template"
        verbose_name = "Payment Plan Template"
        verbose_name_plural = "Payment Plan Templates"
        ordering = ["sort_order", "category", "name"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["frequency", "is_active"]),
            models.Index(fields=["deposit_percentage"]),
            models.Index(fields=["is_featured", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.periods} {self.frequency} payments, {self.deposit_percentage}% down)"

    def clean(self):
        super().clean()

        # Validate deposit percentage
        if self.deposit_percentage < 0 or self.deposit_percentage > 100:
            raise ValidationError("Deposit percentage must be between 0 and 100")

        # Validate periods based on frequency
        if self.frequency == "monthly" and self.periods > 120:
            raise ValidationError("Monthly installments cannot exceed 120 periods")
        elif self.frequency == "quarterly" and self.periods > 40:
            raise ValidationError("Quarterly installments cannot exceed 40 periods")
        elif self.frequency == "semi-annual" and self.periods > 20:
            raise ValidationError("Semi-annual installments cannot exceed 20 periods")
        elif self.frequency == "annual" and self.periods > 10:
            raise ValidationError("Annual installments cannot exceed 10 periods")

    def get_total_duration_months(self):
        """Calculate total duration in months for this template."""
        if self.frequency == "monthly":
            return self.periods
        elif self.frequency == "quarterly":
            return self.periods * 3
        elif self.frequency == "semi-annual":
            return self.periods * 6
        elif self.frequency == "annual":
            return self.periods * 12
        return 0

    def get_installment_amount(self, property_price):
        """Calculate installment amount for a given property price."""
        if self.deposit_percentage >= 100:
            return 0

        down_payment = (property_price * self.deposit_percentage) / 100
        remaining_amount = property_price - down_payment

        if self.periods > 0:
            return remaining_amount / self.periods
        return 0

    def increment_usage(self):
        """Increment usage count and update last used timestamp."""
        from django.utils import timezone

        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=["usage_count", "last_used"])

    @classmethod
    def get_templates_for_wizard(cls, property_price=None, category=None):
        """Get active templates suitable for the wizard, optionally filtered by property price and category."""
        queryset = cls.objects.filter(is_active=True)

        if category:
            queryset = queryset.filter(category=category)

        if property_price:
            # Filter by property value range if specified
            queryset = queryset.filter(
                models.Q(min_property_value__isnull=True)
                | models.Q(min_property_value__lte=property_price),
                models.Q(max_property_value__isnull=True)
                | models.Q(max_property_value__gte=property_price),
            )

        return queryset.order_by("sort_order", "category", "name")

    @classmethod
    def get_featured_templates(cls):
        """Get featured templates for the wizard."""
        return cls.objects.filter(is_active=True, is_featured=True).order_by(
            "sort_order"
        )

    def matches_values(self, periods, frequency, deposit_percentage):
        """Check if the given values match this template exactly."""
        return (
            self.periods == periods
            and self.frequency == frequency
            and self.deposit_percentage == deposit_percentage
        )

    @classmethod
    def find_matching_template(cls, periods, frequency, deposit_percentage):
        """Find a template that matches the given values exactly."""
        try:
            return cls.objects.get(
                periods=periods,
                frequency=frequency,
                deposit_percentage=deposit_percentage,
                is_active=True,
            )
        except cls.DoesNotExist:
            return None


class SalesPerson(TimeStampedUUIDModel):
    """
    Sales person responsible for collecting payments and following up on installments.
    Can be assigned to multiple sales and handles payment collection for owners.
    """

    # Link to user (staff or owner type)
    user = models.OneToOneField(
        Users,
        on_delete=models.CASCADE,
        related_name="sales_person_profile",
        help_text="The user who is a sales person (must be staff or owner type)",
        limit_choices_to={"type__in": ["staff", "owner"]},
    )

    # Sales Person Details
    employee_id = models.CharField(
        max_length=50, unique=True, help_text="Unique employee/sales person ID"
    )

    # Performance Tracking
    total_sales = models.PositiveIntegerField(
        default=0, help_text="Total number of sales closed by this person"
    )

    total_collection_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Overall collection rate percentage (0-100)",
    )

    # Commission Tracking
    total_commission_earned = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Total commission earned from sales",
    )

    commission_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Total commission paid to date",
    )

    commission_pending = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        help_text="Pending commission amount",
    )

    # Commission Configuration for Property Sales
    commission_type = models.CharField(
        max_length=20,
        choices=[("percentage", "Percentage"), ("fixed", "Fixed Amount")],
        null=True,
        blank=True,
        help_text="Type of commission for property sales",
    )

    commission_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Commission rate (percentage: 0-100%, fixed: amount)",
    )

    commission_payment_setting = models.CharField(
        max_length=25,
        choices=[
            ("per_payment", "Per Payment"),
            ("per_project_completion", "Per Project Completion"),
        ],
        null=True,
        blank=True,
        help_text="When commission is paid: per payment or per project completion",
    )

    commission_property_sale = models.ForeignKey(
        "PropertySale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_person_commissions",
        help_text="Property sale this commission applies to",
    )

    # Payment Schedule Metrics

    # Status
    is_active = models.BooleanField(
        default=True, help_text="Whether this sales person is active"
    )

    is_available = models.BooleanField(
        default=True,
        help_text="Whether this sales person is available for new assignments",
    )

    # Notes
    notes = models.TextField(
        blank=True, help_text="Additional notes about the sales person"
    )

    is_default = models.BooleanField(
        default=False,
        help_text="Whether this sales person is the default sales person",
    )

    class Meta:
        db_table = "sales_person"
        verbose_name = "Sales Person"
        verbose_name_plural = "Sales People"
        ordering = ["user__first_name", "user__last_name"]
        indexes = [
            models.Index(fields=["is_active", "is_available"]),
            models.Index(fields=["commission_type", "commission_property_sale"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"

    def clean(self):
        super().clean()

        # Validate user type
        if self.user.type not in ["staff", "owner"]:
            raise ValidationError("Sales person must be a staff member or owner")

    def get_full_name(self):
        """Get the sales person's full name."""
        return self.user.get_full_name()

    def get_email(self):
        """Get the sales person's email."""
        return self.user.email

    def get_phone(self):
        """Get the sales person's phone number."""
        return self.user.phone

    def update_performance_metrics(self):
        """Update basic performance metrics based on assigned sales."""
        from django.db.models import Count

        # Get all sales assigned to this person
        assigned_sales = PropertySale.objects.filter(assigned_sales_person=self)

        # Update total sales count
        self.total_sales = assigned_sales.count()

        # Get payment schedules for all assigned sales
        payment_schedules = PaymentSchedule.objects.filter(
            payment_plan__sale_item__sale__assigned_sales_person=self
        )

        if payment_schedules.exists():
            # Collection rate calculation
            total_payments = payment_schedules.count()
            paid_payments = payment_schedules.filter(status="paid").count()

            if total_payments > 0:
                self.total_collection_rate = (paid_payments / total_payments) * 100
            else:
                self.total_collection_rate = 0.00
        else:
            self.total_collection_rate = 0.00

        # Save updated metrics
        self.save(update_fields=["total_sales", "total_collection_rate"])

    def get_assigned_sales(self):
        """Get all sales assigned to this sales person."""
        return PropertySale.objects.filter(assigned_sales_person=self)

    def get_overdue_payments(self):
        """Get overdue payments for sales assigned to this person."""
        from django.utils import timezone

        return PaymentSchedule.objects.filter(
            payment_plan__sale_item__sale__assigned_sales_person=self,
            status="pending",
            due_date__lt=timezone.now().date(),
        )


class PropertySale(TimeStampedUUIDModel):
    """
    Main model for property sales transactions.
    Now supports multiple properties and multiple buyers.
    """

    SALE_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("defaulted", "Defaulted"),
    ]

    sale_date = models.DateField(
        default=timezone.now, help_text="Date when the sale was finalized"
    )

    status = models.CharField(
        max_length=20, choices=SALE_STATUS_CHOICES, default="pending", db_index=True
    )

    # Agent Details
    agent = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="property_sales",
        null=True,
        blank=True,
        help_text="The agent who facilitated the sale",
    )

    # Sales Person Assignment
    assigned_sales_person = models.ForeignKey(
        SalesPerson,
        on_delete=models.SET_NULL,
        related_name="assigned_sales",
        null=True,
        blank=True,
        help_text="The sales person responsible for payment collection and follow-up",
    )

    # Notes
    notes = models.TextField(blank=True, help_text="Additional notes about the sale")

    class Meta:
        db_table = "property_sale"
        verbose_name = "Property Sale"
        verbose_name_plural = "Property Sales"
        indexes = [
            models.Index(fields=["status", "sale_date"]),
            models.Index(fields=["agent", "status"]),
            models.Index(fields=["assigned_sales_person", "status"]),
        ]

    def __str__(self):
        sales_person = (
            f" - {self.assigned_sales_person.get_full_name()}"
            if self.assigned_sales_person
            else ""
        )
        return f"Sale {self.id}{sales_person}"

    def get_total_sale_value(self):
        """Calculate total sale value from all sale items."""
        return sum(item.sale_price for item in self.sale_items.all())

    def get_total_down_payment(self):
        """Calculate total down payment from all sale items."""
        return sum(item.down_payment for item in self.sale_items.all())

    def get_overdue_payments(self):
        """Get all overdue payments for this sale."""
        from django.utils import timezone

        overdue_payments = []
        for item in self.sale_items.all():
            if hasattr(item, "payment_plan") and item.payment_plan:
                overdue = item.payment_plan.payment_schedule.filter(
                    status="pending", due_date__lt=timezone.now().date()
                )
                overdue_payments.extend(overdue)

        return overdue_payments

    def get_upcoming_payments(self, days=7):
        """Get upcoming payments due within specified days for this sale."""
        from django.utils import timezone
        from datetime import timedelta

        future_date = timezone.now().date() + timedelta(days=days)
        upcoming_payments = []

        for item in self.sale_items.all():
            if hasattr(item, "payment_plan") and item.payment_plan:
                upcoming = item.payment_plan.payment_schedule.filter(
                    status="pending",
                    due_date__lte=future_date,
                    due_date__gte=timezone.now().date(),
                )
                upcoming_payments.extend(upcoming)

        return upcoming_payments


class PropertySaleItem(TimeStampedUUIDModel):
    """
    Individual property sale items within a sale transaction.
    Handles the relationship between properties and buyers.
    """

    # Links
    sale = models.ForeignKey(
        PropertySale,
        on_delete=models.CASCADE,
        related_name="sale_items",
        help_text="The sale this item belongs to",
    )

    property_node = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="sale_items",
        help_text="The property being sold (UNIT or HOUSE)",
    )

    buyer = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="property_purchase_items",
        help_text="The buyer/owner of this specific property",
    )

    # Financial Details
    sale_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Sale price of this specific property",
    )

    down_payment = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Down payment amount for this property",
    )

    down_payment_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Down payment as percentage of sale price",
    )

    # Co-ownership
    ownership_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        help_text="Buyer's ownership percentage for this property (for co-ownership)",
    )

    # Dates
    possession_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when buyer takes possession of this property",
    )

    class Meta:
        db_table = "property_sale_item"
        verbose_name = "Property Sale Item"
        verbose_name_plural = "Property Sale Items"
        unique_together = [("sale", "property_node", "buyer")]
        indexes = [
            models.Index(fields=["sale", "property_node"]),
            models.Index(fields=["buyer"]),
        ]

    def __str__(self):
        return f"{self.property_node.name} to {self.buyer.get_full_name()} in Sale {self.sale.id}"

    def clean(self):
        super().clean()

        # Validate down payment percentage
        if self.down_payment and self.sale_price:
            calculated_percentage = (self.down_payment / self.sale_price) * 100
            if abs(calculated_percentage - self.down_payment_percentage) > 0.01:
                raise ValidationError(
                    "Down payment percentage must match the calculated value"
                )

        # Validate ownership percentage
        if self.ownership_percentage < 0 or self.ownership_percentage > 100:
            raise ValidationError("Ownership percentage must be between 0 and 100")

    def save(self, *args, **kwargs):
        # Auto-calculate down payment percentage if not set
        if self.down_payment and self.sale_price and not self.down_payment_percentage:
            self.down_payment_percentage = (self.down_payment / self.sale_price) * 100

        super().save(*args, **kwargs)


class PaymentPlan(TimeStampedUUIDModel):
    """
    Payment plan configuration for individual property ownership.
    Each owner has their own payment plan for their property share.
    """

    PAYMENT_TYPE_CHOICES = [
        ("full", "Full Payment"),
        ("installments", "Installments"),
    ]

    FREQUENCY_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("semi-annual", "Semi-Annual"),
        ("annual", "Annual"),
    ]

    # Link to sale item (specific owner-property combination)
    sale_item = models.OneToOneField(
        PropertySaleItem,
        on_delete=models.CASCADE,
        related_name="payment_plan",
        help_text="The sale item this payment plan belongs to",
        null=True,
        blank=True,
    )

    # Payment Type
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default="installments",
        help_text="Type of payment plan",
    )

    # Installment Details (only for installments)
    installment_count = models.PositiveIntegerField(
        null=True, blank=True, help_text="Number of installments"
    )

    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        null=True,
        blank=True,
        help_text="Frequency of installments",
    )

    # Dates
    start_date = models.DateField(
        null=True, blank=True, help_text="Start date for installments"
    )

    end_date = models.DateField(
        null=True, blank=True, help_text="Calculated end date for installments"
    )

    # Template Reference
    template = models.ForeignKey(
        PaymentPlanTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_plans",
        help_text="Reference to payment plan template used",
    )

    is_custom = models.BooleanField(
        default=False,
        help_text="Whether this plan has been customized from the original template",
    )

    # Notes
    notes = models.TextField(
        blank=True, help_text="Additional notes about the payment plan"
    )

    class Meta:
        db_table = "payment_plan"
        verbose_name = "Payment Plan"
        verbose_name_plural = "Payment Plans"
        indexes = [
            models.Index(fields=["payment_type", "frequency"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self):
        return f"Payment Plan for {self.sale_item.buyer.get_full_name()} - {self.sale_item.property_node.name}"

    def clean(self):
        super().clean()

        # Validate installment fields for installment type
        if self.payment_type == "installments":
            if not self.installment_count:
                raise ValidationError(
                    "Installment count is required for installment plans"
                )
            if not self.frequency:
                raise ValidationError("Frequency is required for installment plans")
            if not self.start_date:
                raise ValidationError("Start date is required for installment plans")

    def save(self, *args, **kwargs):
        # Auto-calculate end date for installments
        if (
            self.payment_type == "installments"
            and self.start_date
            and self.installment_count
            and self.frequency
        ):

            self.end_date = self._calculate_end_date()

        # Check if template values still match
        self._check_template_match()

        super().save(*args, **kwargs)

    def _check_template_match(self):
        """Check if current values still match the selected template."""
        if self.template and self.payment_type == "installments":
            # Check if values match the template
            if not self.template.matches_values(
                self.installment_count or 0,
                self.frequency or "",
                self.sale_item.down_payment_percentage,
            ):
                # Values don't match template anymore, mark as custom
                self.is_custom = True
            else:
                # Values still match template
                self.is_custom = False

    def set_template(self, template):
        """Set a template and update all related fields."""
        if template:
            self.template = template
            self.installment_count = template.periods
            self.frequency = template.frequency
            self.is_custom = False

    def mark_as_custom(self):
        """Mark this plan as custom (no longer following a template)."""
        self.is_custom = True
        self.template = None

    def _calculate_end_date(self):
        """Calculate the end date based on start date, frequency, and installment count."""
        if not all([self.start_date, self.installment_count, self.frequency]):
            return None

        start = self.start_date
        months_to_add = 0

        if self.frequency == "monthly":
            months_to_add = self.installment_count
        elif self.frequency == "quarterly":
            months_to_add = self.installment_count * 3
        elif self.frequency == "semi-annual":
            months_to_add = self.installment_count * 6
        elif self.frequency == "annual":
            months_to_add = self.installment_count * 12

        end_date = start + relativedelta(months=months_to_add)
        return end_date

    def get_installment_amount(self):
        """Calculate installment amount for this owner's share."""
        if self.payment_type == "full":
            return 0

        if self.sale_item and self.installment_count:
            remaining_amount = self.sale_item.sale_price - self.sale_item.down_payment
            return remaining_amount / self.installment_count

        return 0


class PaymentSchedule(TimeStampedUUIDModel):
    """
    Individual payment schedule entries for installments.
    Each entry represents one payment due date and amount for a specific owner.
    """

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    ]

    # Link to payment plan (which is linked to sale item)
    payment_plan = models.ForeignKey(
        PaymentPlan,
        on_delete=models.CASCADE,
        related_name="payment_schedule",
        help_text="The payment plan this schedule belongs to",
    )

    # Payment Details
    payment_number = models.PositiveIntegerField(
        help_text="Sequential number of this payment"
    )

    due_date = models.DateField(help_text="Date when this payment is due")

    amount = models.DecimalField(
        max_digits=15, decimal_places=2, help_text="Amount due for this payment"
    )

    # Status
    status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending", db_index=True
    )

    # Payment Tracking
    paid_date = models.DateField(
        null=True, blank=True, help_text="Date when payment was received"
    )

    paid_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Actual amount paid",
    )

    # Late Fees
    late_fee = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Late fee applied if payment is overdue",
    )

    # Notes
    notes = models.TextField(
        blank=True, help_text="Additional notes about this payment"
    )

    class Meta:
        db_table = "payment_schedule"
        verbose_name = "Payment Schedule"
        verbose_name_plural = "Payment Schedules"
        ordering = ["payment_number"]
        indexes = [
            models.Index(fields=["status", "due_date"]),
            models.Index(fields=["payment_plan", "payment_number"]),
        ]
        unique_together = [("payment_plan", "payment_number")]

    def __str__(self):
        return f"Payment {self.payment_number} for {self.payment_plan.sale_item.buyer.get_full_name()} - {self.payment_plan.sale_item.property_node.name}"

    def clean(self):
        super().clean()

        # Validate payment number is positive
        if self.payment_number <= 0:
            raise ValidationError("Payment number must be positive")

        # Validate amount is positive
        if self.amount <= 0:
            raise ValidationError("Payment amount must be positive")

    @property
    def is_overdue(self):
        """Check if payment is overdue."""
        if self.status == "paid":
            return False
        return timezone.now().date() > self.due_date

    @property
    def days_overdue(self):
        """Calculate days overdue."""
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.due_date).days

    @property
    def owner_name(self):
        """Get the owner's name for this payment."""
        return self.payment_plan.sale_item.buyer.get_full_name()

    @property
    def property_name(self):
        """Get the property name for this payment."""
        return self.payment_plan.sale_item.property_node.name


class SaleCommission(TimeStampedUUIDModel):
    """
    Track agent commissions for property sales.
    """

    COMMISSION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("paid", "Paid"),
        ("cancelled", "Cancelled"),
    ]

    # Links
    sale = models.ForeignKey(
        PropertySale,
        on_delete=models.CASCADE,
        related_name="commissions",
        help_text="The sale this commission is for",
    )

    agent = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="sale_commissions",
        help_text="The agent earning the commission",
    )

    # Commission Details
    commission_amount = models.DecimalField(
        max_digits=15, decimal_places=2, help_text="Commission amount"
    )

    commission_type = models.CharField(
        max_length=10,
        choices=[("%", "Percentage"), ("fixed", "Fixed Amount")],
        help_text="Type of commission",
    )

    commission_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Commission rate (percentage: 0-100%, fixed: leave empty)",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=COMMISSION_STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    # Payment Details
    paid_date = models.DateField(
        null=True, blank=True, help_text="Date when commission was paid"
    )

    paid_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Actual amount paid",
    )

    # Notes
    notes = models.TextField(
        blank=True, help_text="Additional notes about the commission"
    )

    class Meta:
        db_table = "sale_commission"
        verbose_name = "Sale Commission"
        verbose_name_plural = "Sale Commissions"
        indexes = [
            models.Index(fields=["status", "paid_date"]),
            models.Index(fields=["agent", "status"]),
        ]
        unique_together = [("sale", "agent")]

    def __str__(self):
        return f"Commission for {self.sale} - {self.agent.get_full_name()}"

    def clean(self):
        super().clean()

        # Validate commission logic based on type
        if self.commission_type == "%":
            # Percentage commission: rate is required, amount is auto-calculated
            if not self.commission_rate:
                raise ValidationError("Commission rate is required for percentage type")
            if self.commission_rate < 0 or self.commission_rate > 100:
                raise ValidationError("Commission rate must be between 0% and 100%")
        elif self.commission_type == "fixed":
            # Fixed commission: rate should be empty, amount is manual
            if self.commission_rate:
                raise ValidationError("Commission rate should be empty for fixed type")
            if not self.commission_amount:
                raise ValidationError("Commission amount is required for fixed type")

    def calculate_commission_amount(self, total_property_price):
        """Calculate commission amount based on type and rate."""
        if self.commission_type == "%" and self.commission_rate:
            # Percentage: calculate from total property price
            self.commission_amount = (total_property_price * self.commission_rate) / 100
        elif self.commission_type == "fixed":
            # Fixed: amount is already set, no calculation needed
            pass
        else:
            raise ValidationError("Invalid commission configuration")

        return self.commission_amount


class PropertyReservation(TimeStampedUUIDModel):
    """
    Model for handling property reservations.
    Supports multiple properties per reservation and tracks owner, dates, and fees.
    """

    RESERVATION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]

    status = models.CharField(
        max_length=20,
        choices=RESERVATION_STATUS_CHOICES,
        default="pending",
        db_index=True,
        help_text="Current status of the reservation",
    )

    # Owner Information
    owner = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="property_reservations",
        help_text="The owner making the reservation",
        limit_choices_to={"type__in": ["owner", "company"]},
    )

    # Property Information (Multiple properties can be reserved)
    properties = models.ManyToManyField(
        LocationNode,
        related_name="reservations",
        help_text="Properties being reserved (UNIT or HOUSE nodes)",
        limit_choices_to={"node_type__in": ["UNIT", "HOUSE"]},
    )

    end_date = models.DateField(help_text="End date of the reservation period")

    # Financial Details
    deposit_fee = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Optional deposit fee for the reservation",
    )

    # Additional Information
    notes = models.TextField(
        blank=True, help_text="Additional notes about the reservation"
    )

    class Meta:
        db_table = "property_reservation"
        verbose_name = "Property Reservation"
        verbose_name_plural = "Property Reservations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["end_date"]),
        ]

    def __str__(self):
        property_count = self.properties.count()
        return f"Reservation {self.id} - {self.owner.get_full_name()} ({property_count} propert{'ies' if property_count > 1 else 'y'})"

    def clean(self):
        super().clean()

        # Validate end date is in the future
        if self.end_date and self.end_date <= timezone.now().date():
            raise ValidationError("End date must be in the future")

        # Validate deposit fee is positive if provided
        if self.deposit_fee and self.deposit_fee < 0:
            raise ValidationError("Deposit fee cannot be negative")

    def get_property_names(self):
        """Get a list of property names for this reservation."""
        return [prop.name for prop in self.properties.all()]

    def get_total_property_count(self):
        """Get the total number of properties in this reservation."""
        return self.properties.count()

    def is_expired(self):
        """Check if the reservation has expired."""
        return timezone.now().date() > self.end_date

    def can_convert_to_sale(self):
        """Check if the reservation can be converted to a sale."""
        return self.status in ["pending", "confirmed"] and not self.is_expired()

    def convert_to_sale(self, sale_data):
        """
        Convert this reservation to a property sale.
        Returns the created PropertySale instance.
        """
        if not self.can_convert_to_sale():
            raise ValidationError("Reservation cannot be converted to sale")

        # Create the sale
        sale = PropertySale.objects.create(
            sale_date=timezone.now().date(),
            status="pending",
            notes=f"Converted from reservation {self.id}",
        )

        # Create sale items for each property
        for property_node in self.properties.all():
            PropertySaleItem.objects.create(
                sale=sale,
                property_node=property_node,
                buyer=self.owner,
                sale_price=sale_data.get("sale_price", 0),
                down_payment=sale_data.get("down_payment", 0),
            )

        # Update reservation status
        self.status = "cancelled"
        self.save()

        return sale

    def cancel_reservation(self, reason=None):
        """Cancel the reservation."""
        if self.status in ["expired", "cancelled"]:
            raise ValidationError("Cannot cancel reservation in current status")

        self.status = "cancelled"
        if reason:
            self.notes += f"\n\nCancellation Reason: {reason}"
        self.save()

    def extend_reservation(self, new_end_date):
        """Extend the reservation end date."""
        if self.status not in ["pending", "confirmed"]:
            raise ValidationError("Cannot extend reservation in current status")

        if new_end_date <= self.end_date:
            raise ValidationError("New end date must be after current end date")

        self.end_date = new_end_date
        self.save()

    def get_remaining_days(self):
        """Get the number of days remaining in the reservation."""
        if self.is_expired():
            return 0

        remaining = self.end_date - timezone.now().date()
        return remaining.days

    def get_formatted_properties(self):
        """Get a formatted string of all properties in this reservation."""
        property_names = self.get_property_names()
        if len(property_names) == 1:
            return property_names[0]
        elif len(property_names) == 2:
            return f"{property_names[0]} and {property_names[1]}"
        else:
            return f"{', '.join(property_names[:-1])}, and {property_names[-1]}"


class AssignedDocument(TimeStampedUUIDModel):
    """
    Unified model for tracking assigned sales documents (offer letters and agreements).
    Links buyers with properties and tracks document status and details.
    Integrates with the existing document template system.
    Supports PDF generation and signed document uploads.
    """

    DOCUMENT_TYPE_CHOICES = [
        ("offer_letter", "Offer Letter"),
        ("sales_agreement", "Sales Agreement"),
    ]

    DOCUMENT_STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending"),
        ("active", "Active"),
        ("accepted", "Accepted"),
        ("signed", "Signed"),
        ("expired", "Expired"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
        ("cancelled", "Cancelled"),
    ]

    # Document Type and Template
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        help_text="Type of document being assigned",
    )

    template = models.ForeignKey(
        "documents.ContractTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_documents",
        help_text="Document template used for this assignment",
    )

    # Buyer Information
    buyer = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="assigned_documents",
        help_text="The buyer receiving this document",
        limit_choices_to={"type__in": ["buyer", "owner"]},
    )

    # Property Information
    property_node = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="assigned_documents",
        help_text="The property covered by this document (UNIT or HOUSE)",
        limit_choices_to={"node_type__in": ["UNIT", "HOUSE"]},
    )

    # Document Details
    document_title = models.CharField(
        max_length=255,
        help_text="Title of the document",
    )

    # File Management - Single file field that gets replaced
    document_file = models.FileField(
        upload_to="documents/sales/",
        null=True,
        blank=True,
        help_text="Document file (generated template or signed version)",
    )

    # Track if document has been signed
    is_signed = models.BooleanField(
        default=False,
        help_text="Whether the document has been signed by the buyer",
    )

    # Legacy field for backward compatibility
    document_link = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Legacy field - use document_file instead",
    )

    # Financial Details (common for both types)
    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price (offer price for offer letters, sale price for agreements)",
    )

    down_payment = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Down payment amount",
    )

    down_payment_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Down payment as percentage of price",
    )

    # Dates
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Due date for signing/accepting the document",
    )

    # Single Status Field
    status = models.CharField(
        max_length=20,
        choices=DOCUMENT_STATUS_CHOICES,
        default="draft",
        db_index=True,
        help_text="Current status of the document",
    )

    # Assignment Details
    created_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_documents_created",
        help_text="User who created this document",
        limit_choices_to={"type__in": ["staff", "owner", "agent"]},
    )

    # Related Documents
    related_document = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_documents",
        help_text="Related document (e.g., agreement based on offer letter)",
    )

    # Variable Values (for template generation)
    variable_values = models.JSONField(
        default=dict,
        blank=True,
        help_text="Values for template variables",
    )

    # Generated Content
    generated_content = models.TextField(
        blank=True,
        help_text="Final generated document content with variables replaced",
    )

    # Notes
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the document",
    )

    class Meta:
        db_table = "assigned_document"
        verbose_name = "Assigned Document"
        verbose_name_plural = "Assigned Documents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document_type", "created_at"]),
            models.Index(fields=["buyer", "created_at"]),
            models.Index(fields=["property_node", "created_at"]),
            models.Index(fields=["due_date", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.buyer.get_full_name()} - {self.property_node.name}"

    def clean(self):
        super().clean()

        # Validate financial fields based on document type
        if self.document_type == "offer_letter":
            if not self.price:
                raise ValidationError("Offer price is required for offer letters")
            if not self.down_payment:
                raise ValidationError("Down payment is required for offer letters")
        elif self.document_type == "sales_agreement":
            if not self.price:
                raise ValidationError("Sale price is required for sales agreements")
            if not self.down_payment:
                raise ValidationError("Down payment is required for sales agreements")

        # Validate due date is in the future for active/pending documents
        if self.due_date:
            if self.due_date <= timezone.now().date():
                raise ValidationError("Due date must be in the future")

    def save(self, *args, **kwargs):
        # Auto-calculate down payment percentage if not set
        if self.price and self.down_payment and not self.down_payment_percentage:
            self.down_payment_percentage = (self.down_payment / self.price) * 100

        super().save(*args, **kwargs)

    def is_expired(self):
        """Check if the document has expired."""
        if self.due_date:
            return timezone.now().date() > self.due_date
        return False

    def can_accept(self):
        """Check if the offer can be accepted."""
        return (
            self.document_type == "offer_letter"
            and self.status == "active"
            and not self.is_expired()
        )

    def can_sign(self):
        """Check if the agreement can be signed."""
        return self.status in ["draft", "pending"] and (
            not self.due_date or timezone.now().date() <= self.due_date
        )

    def sign_agreement(self):
        """Sign the agreement."""
        if not self.can_sign():
            raise ValidationError("Agreement cannot be signed in current status")

        self.status = "signed"
        self.save()

    def reject_document(self, reason=None):
        """Reject the document."""
        if self.document_type == "offer_letter":
            if self.status not in ["active", "pending"]:
                raise ValidationError("Offer cannot be rejected in current status")
            self.status = "rejected"
        else:
            if self.status not in ["pending", "draft"]:
                raise ValidationError("Agreement cannot be rejected in current status")
            self.status = "rejected"

        if reason:
            self.notes += f"\n\nRejection Reason: {reason}"
        self.save()

    def withdraw_document(self, reason=None):
        """Withdraw the document."""
        if self.document_type == "offer_letter":
            if self.status not in ["active", "pending"]:
                raise ValidationError("Offer cannot be withdrawn in current status")
            self.status = "withdrawn"
        else:
            if self.status not in ["pending", "draft"]:
                raise ValidationError("Agreement cannot be withdrawn in current status")
            self.status = "withdrawn"

        if reason:
            self.notes += f"\n\nWithdrawal Reason: {reason}"
        self.save()

    def has_pdf(self):
        """Check if the document has a PDF file."""
        return bool(self.document_file and self.document_file.name)
