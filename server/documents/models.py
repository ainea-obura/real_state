# models.py
from django.db import models
from accounts.models import Users
from django.core.exceptions import ValidationError
from company.models import TimeStampedUUIDModel, Company
from properties.models import PropertyTenant
import os


def kyc_document_upload_path(instance, filename):
    """Generate upload path for KYC documents organized by company"""
    # Get company name and sanitize it for file path
    company_name = instance.company.name if instance.company else "unknown"
    # Remove special characters and replace spaces with underscores
    safe_company_name = "".join(
        c for c in company_name if c.isalnum() or c in (" ", "-", "_")
    ).rstrip()
    safe_company_name = safe_company_name.replace(" ", "_")

    # Create path: kyc_documents/company_name/document_type/filename
    return os.path.join(
        "kyc_documents", safe_company_name, instance.document_type, filename
    )


def agreement_upload_path(instance, filename):
    """Generate upload path for agreements organized by company"""
    # Get company name from the property tenant's node's project's owners
    company_name = "unknown"

    try:
        # Get the PropertyTenant's node
        property_tenant = instance.property_tenant
        node = property_tenant.node

        # Find the project node (root of the tree)
        project_node = node.get_root()

        # Get the project detail
        project_detail = project_node.project_detail

        # Find property owners for this project node
        from properties.models import PropertyOwner

        property_owners = PropertyOwner.objects.filter(
            node=project_node, is_deleted=False
        ).select_related("owner_company")

        # Get the first company owner
        for owner in property_owners:
            if owner.owner_company:
                company_name = owner.owner_company.name
                break
    except Exception:
        # If any step fails, use "unknown"
        company_name = "unknown"

    # Remove special characters and replace spaces with underscores
    safe_company_name = "".join(
        c for c in company_name if c.isalnum() or c in (" ", "-", "_")
    ).rstrip()
    safe_company_name = safe_company_name.replace(" ", "_")

    # Create path: agreements/company_name/tenant_agreements/filename
    return os.path.join("agreements", safe_company_name, "tenant_agreements", filename)


class ContractTemplate(TimeStampedUUIDModel):
    TEMPLATE_TYPES = [
        ("rent", "Rent Agreement"),
        ("offer_letter", "Offer Letter"),
        ("sales_agreement", "Sales Agreement"),
    ]

    template_title = models.CharField(max_length=200)
    template_description = models.TextField(blank=True, null=True)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES)
    template_content = models.TextField()  # HTML content with {{variables}}

    # Store which variables are used in this template
    available_variables = models.JSONField(default=dict, blank=True)

    # Template settings
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    # Versioning
    version_number = models.CharField(max_length=20, default="1.0")

    # Tracking fields
    created_by = models.ForeignKey(Users, on_delete=models.CASCADE)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contract Template"
        verbose_name_plural = "Contract Templates"

    def __str__(self):
        return f"{self.template_title} ({self.get_template_type_display()})"

    def clean(self):
        """Ensure only one default template per type"""
        if self.is_default:
            existing_default = ContractTemplate.objects.filter(
                template_type=self.template_type, is_default=True
            ).exclude(pk=self.pk)
            if existing_default.exists():
                raise ValidationError(
                    f"A default template for {self.get_template_type_display()} already exists."
                )

    # ADD THIS METHOD for auto-versioning
    def save(self, *args, **kwargs):
        """Auto-increment version on content changes"""
        if self.pk:  # Only for updates
            try:
                original = ContractTemplate.objects.get(pk=self.pk)
                if original.template_content != self.template_content:
                    # Increment version number
                    current_version = float(self.version_number)
                    self.version_number = f"{current_version + 0.1:.1f}"
            except ContractTemplate.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class TemplateVariable(TimeStampedUUIDModel):
    """Predefined variables that can be used in templates"""

    CATEGORIES = [
        ("tenant_info", "Tenant Information"),
        ("landlord_info", "Landlord Information"),
        ("property_info", "Property Information"),
        ("dates", "Dates"),
        ("financial", "Financial"),
        ("legal", "Legal"),
        ("other", "Other"),
    ]

    DATA_TYPES = [
        ("text", "Text"),
        ("number", "Number"),
        ("date", "Date"),
        ("currency", "Currency"),
        ("email", "Email"),
        ("phone", "Phone"),
        ("address", "Address"),
    ]

    variable_name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=CATEGORIES)
    data_type = models.CharField(max_length=20, choices=DATA_TYPES)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=False)

    # New fields for better functionality
    placeholder_text = models.CharField(max_length=200, blank=True)
    default_value = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    is_for_offer = models.BooleanField(
        default=False, help_text="True if this variable is for offer letters"
    )
    is_for_sale = models.BooleanField(
        default=False, help_text="True if this variable is for sales agreements"
    )

    class Meta:
        ordering = ["category", "display_name"]

    def __str__(self):
        return f"{self.display_name} ({{{{self.variable_name}}}})"

    @property
    def is_rental_variable(self):
        """Check if this variable is for rental documents (default when neither offer nor sale)"""
        return not self.is_for_offer and not self.is_for_sale

    @property
    def is_offer_variable(self):
        """Check if this variable is for offer documents"""
        return self.is_for_offer

    @property
    def is_sales_variable(self):
        """Check if this variable is for sales documents"""
        return self.is_for_sale

    @classmethod
    def get_rent_variables(cls):
        """Get all variables that are for rent agreements (default when neither offer nor sale)"""
        return cls.objects.filter(is_for_offer=False, is_for_sale=False, is_active=True)

    @classmethod
    def get_offer_variables(cls):
        """Get all variables that are for offer letters"""
        return cls.objects.filter(is_for_offer=True, is_active=True)

    @classmethod
    def get_sales_variables(cls):
        """Get all variables that are for sales agreements"""
        return cls.objects.filter(is_for_sale=True, is_active=True)


class TenantAgreement(TimeStampedUUIDModel):
    """Generated agreements for specific tenants"""

    template = models.ForeignKey(ContractTemplate, on_delete=models.CASCADE)
    tenant_name = models.ForeignKey(
        Users, on_delete=models.CASCADE, related_name="tenant_agreements"
    )
    property_tenant = models.ForeignKey(
        PropertyTenant, on_delete=models.CASCADE, related_name="tenant_agreements"
    )

    # Store the actual values for variables
    variable_values = models.JSONField(default=dict)

    # DUPLICATE template content at time of creation
    original_template_content = (
        models.TextField()
    )  # Original template with {{variables}}
    generated_content = models.TextField(
        blank=True
    )  # HTML with replaced variables - ADD blank=True

    # Template metadata at time of creation
    template_title_snapshot = models.CharField(max_length=200)
    template_version = models.CharField(max_length=50, default="1.0")

    # Generated document
    document_file = models.FileField(
        upload_to=agreement_upload_path, blank=True, null=True
    )

    # Status tracking
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending Signature"),
        ("signed", "Signed"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("terminated", "Terminated"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Tracking
    created_by = models.ForeignKey(Users, on_delete=models.CASCADE)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Tenant Agreement"
        verbose_name_plural = "Tenant Agreements"  # ADD THIS

    def __str__(self):
        return f"{self.tenant_name} - {self.template_title_snapshot}"

    def save(self, *args, **kwargs):
        """Auto-populate template snapshot on creation"""
        if not self.pk:  # Only on creation
            self.original_template_content = self.template.template_content
            self.template_title_snapshot = self.template.template_title
            # Auto-generate version based on template updates
            self.template_version = (
                self.template.version_number
            )  # USE template's version instead
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Delete the file when the agreement is deleted"""
        if self.document_file:
            try:
                self.document_file.delete(save=False)
            except Exception as e:
                # Log the error but continue with deletion
                print(f"Error deleting file: {e}")
                super().delete(*args, **kwargs)


class KYCDocument(TimeStampedUUIDModel):
    """KYC Documents for company verification"""

    DOCUMENT_TYPES = [
        ("cr12", "C-R 12"),
        ("proof_of_address", "Proof of Address"),
        ("board_resolution", "Board Resolution"),
        ("kra_pin", "KRA PIN"),
        ("certificate_of_incorporation", "Certificate of Incorporation"),
        ("bank_confirmation_letter", "Bank Confirmation Letter"),
        ("tax_compliance_certificate", "Tax Compliance Certificate"),
        # Director KYC documents - dynamic format for up to 5 directors
        ("director_1_id_card_front", "Director 1 ID Card Front"),
        ("director_1_id_card_back", "Director 1 ID Card Back"),
        ("director_1_kra_pin", "Director 1 KRA PIN Certificate"),
        ("director_2_id_card_front", "Director 2 ID Card Front"),
        ("director_2_id_card_back", "Director 2 ID Card Back"),
        ("director_2_kra_pin", "Director 2 KRA PIN Certificate"),
        ("director_3_id_card_front", "Director 3 ID Card Front"),
        ("director_3_id_card_back", "Director 3 ID Card Back"),
        ("director_3_kra_pin", "Director 3 KRA PIN Certificate"),
        ("director_4_id_card_front", "Director 4 ID Card Front"),
        ("director_4_id_card_back", "Director 4 ID Card Back"),
        ("director_4_kra_pin", "Director 4 KRA PIN Certificate"),
        ("director_5_id_card_front", "Director 5 ID Card Front"),
        ("director_5_id_card_back", "Director 5 ID Card Back"),
        ("director_5_kra_pin", "Director 5 KRA PIN Certificate"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("resubmitted", "Resubmitted"),
    ]

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="kyc_documents"
    )
    kyc_submission = models.ForeignKey(
        "KYCSubmission",
        on_delete=models.CASCADE,
        related_name="kyc_documents",
        null=True,
        blank=True,
    )

    # Document details
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    document_file = models.FileField(upload_to=kyc_document_upload_path)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.PositiveIntegerField(
        help_text="File size in bytes", null=True, blank=True
    )
    file_type = models.CharField(
        max_length=50, help_text="MIME type of the file", blank=True, null=True
    )

    # Director tracking
    director_number = models.PositiveIntegerField(
        null=True, blank=True, help_text="Director number (1-5) for director documents"
    )

    # Status and verification
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_kyc_documents",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)

    # Rejection details
    rejection_reason = models.TextField(blank=True, null=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_kyc_documents",
    )

    # Resubmission tracking
    resubmitted_at = models.DateTimeField(null=True, blank=True)
    previous_version = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="new_versions",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "KYC Document"
        verbose_name_plural = "KYC Documents"
        unique_together = ["company", "document_type"]

    def __str__(self):
        return f"{self.company.name} - {self.get_document_type_display()} ({self.get_status_display()})"

    def clean(self):
        """Validate file size (1MB limit)"""
        if self.document_file and self.document_file.size > 1024 * 1024:  # 1MB
            raise ValidationError("File size must be less than 1MB")

    def save(self, *args, **kwargs):
        """Auto-populate file details and director number if not already set"""
        if self.document_file and not self.file_name:
            # Only populate if not already set (fallback)
            self.file_name = self.document_file.name.split("/")[-1]
            self.file_size = self.document_file.size
            # Get content type from file extension
            import mimetypes

            file_extension = self.document_file.name.split(".")[-1].lower()
            self.file_type = (
                mimetypes.guess_type(f"file.{file_extension}")[0]
                or "application/octet-stream"
            )

        # Auto-populate director number for director documents
        if not self.director_number and self.document_type.startswith("director_"):
            try:
                # Extract director number from document_type (e.g., "director_1_id_card_front" -> 1)
                parts = self.document_type.split("_")
                if len(parts) >= 2:
                    self.director_number = int(parts[1])
            except (ValueError, IndexError):
                pass

        super().save(*args, **kwargs)

    def approve(self, user, notes=None):
        """Approve the document"""
        from django.utils import timezone

        self.status = "approved"
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()

    def reject(self, user, reason):
        """Reject the document"""
        from django.utils import timezone

        self.status = "rejected"
        self.rejected_by = user
        self.rejected_at = timezone.now()
        self.rejection_reason = reason
        self.save()

    def mark_under_review(self, user):
        """Mark document as under review"""
        from django.utils import timezone

        self.status = "under_review"
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save()

    def resubmit(self):
        """Mark document as resubmitted"""
        from django.utils import timezone

        self.status = "resubmitted"
        self.resubmitted_at = timezone.now()
        self.save()

    def delete(self, *args, **kwargs):
        """Delete the file when the document is deleted"""
        if self.document_file:
            try:
                self.document_file.delete(save=False)
            except Exception as e:
                # Log the error but continue with deletion
                print(f"Error deleting file: {e}")
        super().delete(*args, **kwargs)


class KYCSubmission(TimeStampedUUIDModel):
    """KYC Submission for a company - groups all KYC documents together"""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("under_review", "Under Review"),
        ("partially_approved", "Partially Approved"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    company = models.OneToOneField(
        Company, on_delete=models.CASCADE, related_name="kyc_submission"
    )

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Review details
    reviewed_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_kyc_submissions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)

    # Rejection details
    rejection_reason = models.TextField(blank=True, null=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "KYC Submission"
        verbose_name_plural = "KYC Submissions"

    def __str__(self):
        return f"{self.company.name} - KYC Submission ({self.get_status_display()})"

    @property
    def is_complete(self):
        """Check if all required documents are uploaded"""
        required_documents = [choice[0] for choice in KYCDocument.DOCUMENT_TYPES]
        uploaded_documents = self.kyc_documents.values_list("document_type", flat=True)
        return all(doc_type in uploaded_documents for doc_type in required_documents)

    @property
    def documents_count(self):
        """Get count of uploaded documents"""
        return self.kyc_documents.count()

    @property
    def required_documents_count(self):
        """Get count of required documents"""
        return len(KYCDocument.DOCUMENT_TYPES)

    @property
    def approved_documents_count(self):
        """Get count of approved documents"""
        return self.kyc_documents.filter(status="approved").count()

    @property
    def rejected_documents_count(self):
        """Get count of rejected documents"""
        return self.kyc_documents.filter(status="rejected").count()

    @property
    def pending_documents_count(self):
        """Get count of pending documents"""
        return self.kyc_documents.filter(status="pending").count()

    @property
    def under_review_documents_count(self):
        """Get count of documents under review"""
        return self.kyc_documents.filter(status="under_review").count()

    def update_overall_status(self):
        """Update the overall submission status based on individual document statuses"""
        total_docs = self.documents_count
        approved_docs = self.approved_documents_count
        rejected_docs = self.rejected_documents_count
        pending_docs = self.pending_documents_count

        if approved_docs == total_docs:
            self.status = "approved"
        elif rejected_docs > 0:
            self.status = "rejected"
        elif approved_docs > 0 and approved_docs < total_docs:
            self.status = "partially_approved"
        elif pending_docs > 0:
            self.status = "under_review"
        else:
            self.status = "submitted"

        self.save()
