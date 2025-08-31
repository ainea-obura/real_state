import uuid

from django.db import models

from accounts.models import City, Users


class TimeStampedUUIDModel(models.Model):
    """
    Abstract base: UUID primary key + created_at / updated_at timestamps.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Company(TimeStampedUUIDModel):
    STATUS_PENDING = "pending"
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("pending", "Pending"),
    ]

    name = models.CharField(max_length=250, unique=True)
    phone = models.CharField(max_length=250)
    email = models.EmailField(unique=True)
    status = models.CharField(
        max_length=100,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current operational status",
    )
    website = models.URLField(blank=True, null=True)
    address = models.TextField(blank=True)
    city = models.ForeignKey(
        City,
        on_delete=models.CASCADE,
        related_name="company_locations",
        null=True,
        blank=True,
    )
    postal_code = models.CharField(max_length=100, blank=True, null=True)
    logo = models.ImageField(
        upload_to="logos/companies/",
        blank=True,
        null=True,
        help_text="Optional logo; stored in MEDIA_ROOT/logos/companies/",
    )

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Branch(TimeStampedUUIDModel):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="branches"
    )
    name = models.CharField(max_length=255)
    email = models.EmailField()
    address = models.TextField(blank=True)
    city = models.ForeignKey(
        City, on_delete=models.CASCADE, related_name="branches", null=True, blank=True
    )
    postal_code = models.CharField(max_length=100)

    class Meta:
        verbose_name = "Branch"
        verbose_name_plural = "Branches"
        unique_together = [("company", "name")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class Owner(TimeStampedUUIDModel):
    """
    Associates a user with a company that they own.
    """

    user = models.ForeignKey(
        Users, on_delete=models.CASCADE, related_name="owned_companies"
    )
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="owners"
    )

    class Meta:
        verbose_name = "Owner"
        verbose_name_plural = "Owners"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} → {self.company.name}"


class BussinessSubmission(TimeStampedUUIDModel):
    requestId = models.UUIDField(default=uuid.uuid4, editable=False)
    status = models.BooleanField(default=False)
    responseCode = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    merchantCode = models.CharField(max_length=255, blank=True, null=True)
    otp = models.CharField(max_length=255, blank=True, null=True)
    requestId = models.UUIDField(default=uuid.uuid4, editable=False)
    merchantCode = models.CharField(max_length=255, blank=True, null=True)
    accountNumber = models.CharField(max_length=255, blank=True, null=True)
    displayName = models.CharField(max_length=255, blank=True, null=True)
    accountStatus = models.CharField(max_length=255, blank=True, null=True)
    accountBalance = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )

    class Meta:
        verbose_name = "Bussiness Submission"
        verbose_name_plural = "Bussiness Submissions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.requestId}"


class BusinessOnboarding(TimeStampedUUIDModel):
    """
    Model for storing business onboarding data for SasaPay integration.
    """

    # Status choices
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_AWAITING_KYC = "awaiting_kyc"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_AWAITING_KYC, "Awaiting KYC Upload"),
    ]

    # Relationships
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="business_onboardings"
    )
    user = models.ForeignKey(
        Users, on_delete=models.CASCADE, related_name="business_onboardings"
    )

    # API Response fields
    status = models.BooleanField(
        default=False,
        help_text="API response status (true/false)",
        blank=True,
        null=True,
    )
    responseCode = models.CharField(
        max_length=255, blank=True, null=True, help_text="API response code"
    )
    message = models.TextField(blank=True, null=True, help_text="API response message")

    # Business Account Information
    requestId = models.UUIDField(
        default=uuid.uuid4, editable=False, unique=True, help_text="Unique request ID"
    )
    merchantCode = models.CharField(
        max_length=255, blank=True, null=True, help_text="Merchant code from API"
    )
    accountNumber = models.CharField(
        max_length=255, blank=True, null=True, help_text="Account number from API"
    )
    displayName = models.CharField(
        max_length=255, blank=True, null=True, help_text="Display name from API"
    )
    accountStatus = models.CharField(
        max_length=100, blank=True, null=True, help_text="Account status from API"
    )
    accountBalance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.0,
        help_text="Account balance from API",
        blank=True,
        null=True,
    )

    # OTP for verification
    otp = models.CharField(
        max_length=255, blank=True, null=True, help_text="OTP for verification"
    )

    # Basic Information
    businessName = models.CharField(max_length=255, blank=True, null=True)
    billNumber = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # Business Details
    productType = models.IntegerField(blank=True, null=True)
    countryId = models.CharField(max_length=10, blank=True, null=True)
    subregionId = models.CharField(max_length=10, blank=True, null=True)
    industryId = models.CharField(max_length=10, blank=True, null=True)
    subIndustryId = models.CharField(max_length=10, blank=True, null=True)

    # Banking Information (Optional)
    bankId = models.CharField(max_length=10, blank=True, null=True)
    bankAccountNumber = models.CharField(max_length=50, blank=True, null=True)

    # Contact Information
    mobileNumber = models.CharField(max_length=20, blank=True, null=True)
    businessTypeId = models.CharField(max_length=10, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Registration Information
    registrationNumber = models.CharField(max_length=50, blank=True, null=True)
    kraPin = models.CharField(max_length=50, blank=True, null=True)
    referralCode = models.CharField(max_length=20, blank=True, null=True)
    dealerNumber = models.CharField(max_length=50, blank=True, null=True)

    # Business Details
    purpose = models.CharField(max_length=100, blank=True, null=True)
    natureOfBusiness = models.CharField(max_length=255, blank=True, null=True)
    physicalAddress = models.TextField(blank=True, null=True)

    # Transaction Estimates
    estimatedMonthlyTransactionAmount = models.DecimalField(
        max_digits=15, decimal_places=2, blank=True, null=True
    )
    estimatedMonthlyTransactionCount = models.IntegerField(blank=True, null=True)

    # Callback URL
    callbackUrl = models.URLField(blank=True, null=True)

    # Directors (stored as JSON)
    directors = models.JSONField(blank=True, null=True)

    class Meta:
        verbose_name = "Business Onboarding"
        verbose_name_plural = "Business Onboardings"
        ordering = ["-created_at"]
        unique_together = [("company", "user")]

    def __str__(self):
        return (
            f"{self.businessName} - {self.company.name} ({self.get_status_display()})"
        )

    def update_from_api_response(self, api_response):
        """
        Update model fields from API response
        """
        if api_response.get("status") is not None:
            self.status = api_response["status"]

        if api_response.get("responseCode"):
            self.responseCode = api_response["responseCode"]

        if api_response.get("message"):
            self.message = api_response["message"]

        # Handle first-time submission response (no nested data field)
        if api_response.get("requestId"):
            try:
                # Convert string to UUID if needed
                if isinstance(api_response["requestId"], str):
                    import uuid

                    self.requestId = uuid.UUID(api_response["requestId"])
                else:
                    self.requestId = api_response["requestId"]
            except (ValueError, TypeError):
                # If conversion fails, skip updating requestId
                pass

        if api_response.get("merchantCode"):
            self.merchantCode = api_response["merchantCode"]

        # Handle nested data field if it exists (for subsequent responses)
        if api_response.get("data"):
            data = api_response["data"]
            if data.get("requestId"):
                try:
                    # Convert string to UUID if needed
                    if isinstance(data["requestId"], str):
                        import uuid

                        self.requestId = uuid.UUID(data["requestId"])
                    else:
                        self.requestId = data["requestId"]
                except (ValueError, TypeError):
                    # If conversion fails, skip updating requestId
                    pass
            if data.get("merchantCode"):
                self.merchantCode = data["merchantCode"]
            if data.get("accountNumber"):
                self.accountNumber = data["accountNumber"]
            if data.get("displayName"):
                self.displayName = data["displayName"]
            if data.get("accountStatus"):
                self.accountStatus = data["accountStatus"]
            if data.get("accountBalance") is not None:
                self.accountBalance = data["accountBalance"]

        self.save()
