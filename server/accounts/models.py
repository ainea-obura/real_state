import uuid

from datetime import datetime

from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils import timezone

from utils.validate import validate_media


class Country(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Name of the country")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modified At")

    class Meta:
        db_table = "country"
        verbose_name = "Country"
        verbose_name_plural = "Countries"

    def __str__(self):
        return self.name


class City(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Name of the City")
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, verbose_name="Country"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Modified At")

    class Meta:
        db_table = "City"
        verbose_name = "City"
        verbose_name_plural = "Citys"

    def __str__(self):
        return self.name


def user_avatar_upload_path(instance, filename):
    ext = filename.split(".")[-1].lower()
    user_id = instance.id if instance.id else "new_user"
    date_str = datetime.now().strftime("%Y-%m-%d")
    return f"avatars/users/{date_str}/{user_id}.{ext}"


class Position(models.Model):
    """
    Represents a position/role within the organization.
    Used to categorize staff members and define their responsibilities.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=255, 
        verbose_name="Name of the Position",
        help_text="The title or name of the position (e.g., Property Manager, Accountant)"
    )
    description = models.TextField(
        verbose_name="Description of the Position",
        help_text="Detailed description of responsibilities and requirements",
        null=True,
        blank=True,
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Soft delete flag"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    modified_at = models.DateTimeField(auto_now=True, verbose_name="Modified At")

    class Meta:
        db_table = "position"
        verbose_name = "Position"
        verbose_name_plural = "Positions"

    def __str__(self):
        return self.name

class Users(AbstractUser):
    GENDER_CHOICES = (
        ("Male", "Male"),
        ("Female", "Female"),
    )
    STATUS_CHOICES = (
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("blocked", "Blocked"),
    )
    ACCOUNT_TYPES = (
        ("company", "Company"),
        ("owner", "Owner"),
        ("tenant", "Tenant"),
        ("agent", "Agent"),
        ("staff", "Staff"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    gender = models.CharField(
        max_length=10, choices=GENDER_CHOICES, null=True, blank=True
    )
    avatar = models.FileField(
        upload_to=user_avatar_upload_path,
        validators=[validate_media],
        null=True,
        blank=True,
    )
    is_admin = models.BooleanField(default=False, verbose_name="Is Admin")
    type = models.CharField(max_length=50, choices=ACCOUNT_TYPES, default="Unknown")
    position = models.ForeignKey(
        Position,
        on_delete=models.DO_NOTHING,
        blank=True,
        null=True,
        verbose_name="Position",
    )
    is_verified = models.BooleanField(default=False)
    is_tenant_verified = models.BooleanField(default=False)
    is_owner_verified = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    address = models.CharField(
        max_length=255, blank=True, null=True, verbose_name="Address"
    )
    city = models.ForeignKey(
        City,
        on_delete=models.DO_NOTHING,
        blank=True,
        null=True,
        verbose_name="City",
    )
    postal_code = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    force_password_change = models.BooleanField(default=False)

    # Add related_name to resolve clashes
    groups = models.ManyToManyField(
        Group,
        related_name="custom_user_groups",  # Unique related_name for groups
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="custom_user_permissions",  # Unique related_name for permissions
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        ordering = ("-created_at",)
        verbose_name = "User"
        verbose_name_plural = "Users"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()



class BlockedIP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocked_ip = models.CharField(max_length=255, unique=True)
    blocked_at = models.DateTimeField(auto_now_add=True)
    is_unblocked = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "blocked_ips"
        ordering = ("-blocked_at",)
        verbose_name = "Blocked IP"
        verbose_name_plural = "Blocked IPs"

    def __str__(self):
        return self.blocked_ip


class AuditTrials(models.Model):
    """
    Stores create/update/delete actions performed on any model instance.
    Tracks: who did it, what they did, where they did it, and the exact changes.
    """

    user_id = models.UUIDField(null=True, blank=True, verbose_name="User ID")

    action = models.CharField(
        max_length=50,
        verbose_name="Action",  # e.g., "Created", "Updated", "Deleted"
    )

    module = models.CharField(
        max_length=100,
        verbose_name="Module",  # e.g., "HealthFacility"
    )

    model_name = models.CharField(
        max_length=100,
        verbose_name="Model Name",  # e.g., "health_facility"
    )

    record_id = models.UUIDField(verbose_name="Record ID", null=True, blank=True)

    changes = models.JSONField(
        null=True,
        blank=True,
        # JSON: { created_data: {...} } or { field: {old:..., new:...} }
        verbose_name="Changes",
    )

    path = models.CharField(
        max_length=255,
        verbose_name="API Path",  # e.g., "/api/v1/health-facilities/5/"
        null=True,
        blank=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="IP Address"
    )

    browser = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Browser",  # e.g., "Chrome", "Firefox"
    )

    operating_system = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Operating System",  # e.g., "Windows", "MacOS"
    )

    date_of_action = models.DateTimeField(
        auto_now_add=True, verbose_name="Date of Action"
    )

    class Meta:
        db_table = "audit_trails"
        # app_label = 'audit_trails'
        verbose_name = "Audit Trail"
        verbose_name_plural = "Audit Trails"
        ordering = ["-date_of_action"]

    def __str__(self):
        return f"{self.user} {self.action} {self.model_name} #{self.record_id}"


class ErrorLogs(models.Model):
    """
    Stores error logs for unexpected exceptions during application execution.
    Tracks: who encountered it, what the error was, where it happened, and environment details.
    """

    user_id = models.UUIDField(null=True, blank=True, verbose_name="User ID")

    expected_error = models.TextField(
        verbose_name="Expected Error"  # Short description of the error
    )

    field_error = models.TextField(
        verbose_name="Field Error"  # Field-level error details if applicable
    )

    trace_back = models.TextField(
        verbose_name="Traceback"  # Complete traceback for debugging
    )

    line_number = models.IntegerField(
        verbose_name="Line Number"  # Exact line number where the error occurred
    )

    path = models.CharField(
        max_length=255,
        verbose_name="API Path",  # URL or endpoint where the error occurred
        null=True,
        blank=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="IP Address"
    )

    browser = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Browser",  # e.g., "Chrome", "Firefox"
    )

    operating_system = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Operating System",  # e.g., "Windows", "MacOS"
    )

    date_recorded = models.DateTimeField(
        auto_now_add=True, verbose_name="Date Recorded"
    )

    class Meta:
        db_table = "error_logs"
        verbose_name = "Error Log"
        verbose_name_plural = "Error Logs"
        ordering = ["-date_recorded"]

    def __str__(self):
        return f"{self.user_id} error at line {self.line_number}"

    def reduce_field_error(self):
        return (
            f"{self.field_error[:50]}..."
            if len(self.field_error) > 50
            else self.field_error
        )

    def reduce_trace(self):
        return (
            f"{self.trace_back[:30]}..."
            if len(self.trace_back) > 30
            else self.trace_back
        )


# --- User Verification Upload Path ---
def user_verification_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    date_str = datetime.now().strftime("%Y-%m-%d")
    unique_name = f"{uuid.uuid4()}.{ext}"
    user_id = instance.user.id if instance.user_id else "unknown_user"
    return f"verifications/{user_id}/{date_str}/{unique_name}"


# --- User Verification Model ---
class UserVerification(models.Model):
    """
    Identity verification for any user type (tenant, owner, agent, company, etc.).
    Stores document type, ID number, document image, optional user image, and status.
    """

    CATEGORY_CHOICES = [
        ("passport", "Passport"),
        ("national_id", "National ID Card"),
        ("driver_license", "Driver's License"),
        ("residence_permit", "Residence Permit"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="verifications",
        db_index=True,
    )
    category = models.CharField(
        max_length=32,
        choices=CATEGORY_CHOICES,
        default="passport",
        db_index=True,
        help_text="Type of identity document.",
    )
    id_number = models.CharField(
        max_length=128, db_index=True, help_text="ID or passport number."
    )
    document_image = models.FileField(
        upload_to=user_verification_upload_path,
        validators=[validate_media],
        max_length=255,
        help_text="Scanned image or photo of the document.",
    )
    user_image = models.FileField(
        upload_to=user_verification_upload_path,
        validators=[validate_media],
        max_length=255,
        null=True,
        blank=True,
        help_text="Optional photo/selfie of the user.",
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
        help_text="Verification status.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_verification"
        verbose_name = "User Verification"
        verbose_name_plural = "User Verifications"
        indexes = [
            models.Index(fields=["user", "category", "status"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.category} ({self.status})"

    def approve(self):
        """Approve this verification and mark the user as verified."""
        self.status = "approved"
        self.save(update_fields=["status"])
        self.user.is_tenant_verified = True
        self.user.save(update_fields=["is_tenant_verified"])

    def reject(self):
        """Reject this verification."""
        self.status = "rejected"
        self.save(update_fields=["status"])
        self.user.is_tenant_verified = False
        self.user.save(update_fields=["is_tenant_verified"])


class Account(models.Model):
    """
    Stores account details for users (bank accounts, mobile money, etc.).
    Can be used by tenants, owners, and companies.
    """

    ACCOUNT_TYPE_CHOICES = [
        ("mobile", "Mobile Money"),
        ("bank", "Bank Account"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="accounts",
    )
    account_name = models.CharField(
        max_length=255,
        help_text="User-friendly name for this account (e.g., 'My KCB Account')"
    )
    account_code = models.CharField(
        max_length=10,
        help_text="Bank code from SasaPay (e.g., '03' for Absa Bank)",
        null=True,
        blank=True,
    )
    account_number = models.CharField(
        max_length=50,
        help_text="Mobile number or bank account number"
    )
    account_type = models.CharField(
        max_length=10,
        choices=ACCOUNT_TYPE_CHOICES,
        default="bank",
        help_text="Type of account (mobile money or bank account)"
    )
    bank_name = models.CharField(
        max_length=255,
        help_text="Display name of the bank (e.g., 'Absa Bank Kenya Plc')",
        null=True,
        blank=True,
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Whether this is the default account for the user"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this account is active"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "user_account"
        verbose_name = "User Account"
        verbose_name_plural = "User Accounts"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["account_type"]),
            models.Index(fields=["is_default"]),
            models.Index(fields=["is_active"]),
        ]
        unique_together = [
            ("user", "account_name"),
            ("user", "account_number", "account_type"),
        ]

    def __str__(self):
        return f"{self.account_name} - {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        # Ensure only one default account per user
        if self.is_default:
            Account.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)
