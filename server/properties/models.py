import uuid

from datetime import datetime

from dateutil.relativedelta import relativedelta
from django.contrib.gis.db import models as gis_models
from django.core.exceptions import ValidationError
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey

from accounts.models import City, Users
from company.models import Branch, Company
from django.conf import settings


def media_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    date_str = datetime.now().strftime("%Y-%m-%d")
    unique_name = f"{uuid.uuid4()}.{ext}"

    # Try to find the PROJECT ancestor for the node
    project_node = (
        instance.location_node.get_ancestors(include_self=True)
        .filter(node_type="PROJECT")
        .first()
    )
    if project_node:
        base_folder = f"property/{project_node.id}"
    else:
        # Fallback: use the current node's id (for PROJECT, HOUSE, etc.)
        base_folder = f"property/{instance.location_node.id}"

    if hasattr(instance, "property_tenant") and instance.property_tenant:
        tenant_name = instance.property_tenant.tenant_user.get_full_name().replace(
            " ", "_"
        )
        folder = f"{base_folder}/document/{tenant_name}/{date_str}"
    else:
        folder = f"{base_folder}/{instance.file_type.lower()}/{date_str}"

    return f"media/{folder}/{unique_name}"


class Currencies(models.Model):
    """
    Model for storing currency information.

    Fields:
    - id: UUID primary key
    - name: Full name of the currency (e.g. "US Dollar")
    - code: ISO 4217 currency code (e.g. "USD")
    - symbol: Currency symbol (e.g. "$")
    - decimal_places: Number of decimal places used for this currency
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the currency",
    )
    name = models.CharField(
        max_length=255, help_text="Full name of the currency (e.g. US Dollar)"
    )
    code = models.CharField(
        max_length=10, help_text="ISO 4217 currency code (e.g. USD)"
    )
    symbol = models.CharField(max_length=10, help_text="Currency symbol (e.g. $)")
    decimal_places = models.IntegerField(
        help_text="Number of decimal places used for this currency"
    )
    default = models.BooleanField(
        default=False, help_text="Whether this is the default currency"
    )

    class Meta:
        db_table = "currencies"
        verbose_name = "Currency"
        verbose_name_plural = "Currencies"
        ordering = ["name"]


class TimeStampedUUIDModel(models.Model):
    """
    Abstract base model: UUID PK, timestamps, and soft delete flag.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_deleted", "created_at"])]


class LocationNode(TimeStampedUUIDModel, MPTTModel):
    """
    Generic tree node for dynamic hierarchy: Project, Property, Block, Floor, Unit, Room.
    """

    NODE_TYPES = [
        ("PROJECT", "Project"),
        ("BLOCK", "Block"),
        ("HOUSE", "HOUSE"),
        ("FLOOR", "Floor"),
        ("UNIT", "Unit"),
        ("ROOM", "Room"),
        ("BASEMENT", "Basement"),
        ("SLOT", "Slot"),
    ]
    PROPERTY_TYPES = [
        # Residential
        ("APT", "Apartment"),
        ("VILLA", "Villa"),
        ("CONDO", "Condominium"),
        # Commercial
        ("OFFICE", "Office Building"),
        ("RETAIL", "Retail Store"),
        ("RESTAURANT", "Restaurant"),
        ("MALL", "Mall"),
        # Industrial
        ("WAREHOUSE", "Warehouse"),
        ("COLD", "Cold Storage"),
        # Emerging & Other
        ("OTHER", "Other"),
    ]

    name = models.CharField(max_length=255, db_index=True)
    node_type = models.CharField(max_length=20, choices=NODE_TYPES, db_index=True)
    parent = TreeForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="children",
        on_delete=models.CASCADE,
        db_index=True,
    )
    property_type = models.CharField(
        max_length=20,
        choices=PROPERTY_TYPES,
        null=True,
        blank=True,
        help_text='Relevant only when node_type="PROPERTY"',
        db_index=True,
    )

    class MPTTMeta:
        order_insertion_by = ["name"]

    class Meta:
        db_table = "location_node"
        verbose_name = "Location Node"
        verbose_name_plural = "Location Nodes"
        indexes = [
            models.Index(fields=["node_type", "property_type"]),
            models.Index(fields=["parent"]),
        ]
        unique_together = [("parent", "name", "node_type")]

    def clean(self):
        nt = self.node_type
        parent = self.parent.node_type if self.parent else None

        # PROJECT: root only
        if nt == "PROJECT" and parent is not None:
            raise ValidationError("PROJECT nodes must be root.")

        # PROPERTY: directly under PROJECT
        if nt == "BLOCK":
            if parent != "PROJECT":
                raise ValidationError("Block must be under PROJECT.")

        if nt == "HOUSE":
            if parent != "PROJECT":
                raise ValidationError("HOUSE must be under PROJECT.")

        # FLOOR: under PROPERTY or BLOCK
        if nt == "FLOOR" and parent not in ("BLOCK", "HOUSE"):
            raise ValidationError("FLOOR must be under BLOCK or HOUSE.")

        # UNIT: under FLOOR or PROPERTY
        if nt == "UNIT" and parent not in ("FLOOR"):
            raise ValidationError("APARTMENT must be under FLOOR.")

        # ROOM: under UNIT only
        if nt == "ROOM" and parent not in ("UNIT", "FLOOR"):
            raise ValidationError("ROOM must be under UNIT or FLOOR")

    def __str__(self):
        return f"{self.name} ({self.node_type})"


class ProjectDetail(TimeStampedUUIDModel):
    """
    Detailed fields for PROJECT nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="project_detail",
        limit_choices_to={"node_type": "PROJECT"},
    )
    city = models.ForeignKey(
        City,
        on_delete=models.CASCADE,
        related_name="project_locations",
        null=True,
        blank=True,
    )
    area = models.CharField(max_length=255, blank=True, null=True)
    project_code = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("ongoing", "Ongoing"),
            ("completed", "Completed"),
            ("planned", "Planned"),
            ("on-hold", "On Hold"),
        ],
        default="ongoing",
        db_index=True,
    )
    description = models.TextField(blank=True)
    project_type = models.CharField(
        max_length=20,
        choices=[
            ("residential", "Residential"),
            ("commercial", "Commercial"),
            ("mixed-use", "Mixed-Use"),
        ],
        db_index=True,
    )
    management_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Management fee for this project",
    )
    geo_location = gis_models.PointField(
        srid=4326, geography=True, null=True, blank=True, spatial_index=True
    )

    class Meta:
        db_table = "project_detail"
        verbose_name = "Project Detail"
        verbose_name_plural = "Project Details"
        indexes = [models.Index(fields=["status", "project_type"])]

    def __str__(self):
        return f"ProjectDetail for {self.node.name}"


class VillaDetail(TimeStampedUUIDModel):
    """
    Detailed fields for VILLA nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="villa_detail",
        limit_choices_to={"node_type": "VILLA"},
    )
    management_mode = models.CharField(
        max_length=20,
        choices=[
            ("SERVICE_ONLY", "Service Only"),
            ("FULL_MANAGEMENT", "Full Management"),
        ],
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    service_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Service charge for this villa",
    )

    class Meta:
        db_table = "villa_detail"
        verbose_name = "Villa Detail"
        verbose_name_plural = "Villa Details"
        unique_together = [("node", "name")]
        indexes = [models.Index(fields=["name"])]

    def __str__(self):
        return f"HouseDetail {self.name} ({self.node.name})"


class BlockDetail(TimeStampedUUIDModel):
    """
    Detailed fields for BLOCK nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="block_detail",
        limit_choices_to={"node_type": "BLOCK"},
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "block_detail"
        verbose_name = "Block Detail"
        verbose_name_plural = "Block Details"
        unique_together = [("node", "name")]
        indexes = [models.Index(fields=["name"])]

    def __str__(self):
        return f"BlockDetail {self.name} ({self.node.name})"


class FloorDetail(TimeStampedUUIDModel):
    """
    Detailed fields for FLOOR nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="floor_detail",
        limit_choices_to={"node_type": "FLOOR"},
    )
    number = models.IntegerField(db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "floor_detail"
        verbose_name = "Floor Detail"
        verbose_name_plural = "Floor Details"
        unique_together = [("node", "number")]
        indexes = [models.Index(fields=["number"])]

    def __str__(self):
        return f"FloorDetail #{self.number} ({self.node.name})"


class UnitDetail(TimeStampedUUIDModel):
    """
    Detailed fields for UNIT nodes.
    """

    UNIT_TYPE_CHOICES = [
        ("1 Bedroom", "1 Bedroom"),
        ("2 Bedroom", "2 Bedroom"),
        ("3 Bedroom", "3 Bedroom"),
        ("4 Bedroom", "4 Bedroom"),
        ("5 Bedroom", "5 Bedroom"),
        ("6 Bedroom", "6 Bedroom"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="unit_detail",
        limit_choices_to={"node_type": "UNIT"},
    )
    management_mode = models.CharField(
        max_length=20,
        choices=[
            ("SERVICE_ONLY", "Service Only"),
            ("FULL_MANAGEMENT", "Full Management"),
        ],
        default="SERVICE_ONLY",
        help_text="Whether we only bill for specific services or manage end-to-end.",
    )
    management_status = models.CharField(
        max_length=20,
        choices=[("for_rent", "For Rent"), ("for_sale", "For Sale")],
        db_index=True,
    )
    identifier = models.CharField(max_length=50, db_index=True)
    size = models.CharField(max_length=255)
    sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Sale price if unit is sold",
        null=True,
        blank=True,
    )
    rental_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Default monthly rent if unit is rented",
    )
    deposit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Deposit required for renting",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("available", "Available"),
            ("rented", "Rented"),
            ("sold", "Sold"),
            ("accupied_by_owner", "Accupied By the owner"),
        ],
        db_index=True,
    )
    description = models.TextField(blank=True)
    currency = models.ForeignKey(
        Currencies,
        on_delete=models.CASCADE,
        related_name="unit_details",
        null=True,
        blank=True,
    )

    unit_type = models.CharField(
        max_length=20,
        choices=UNIT_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Type of unit (e.g., 1 Bedroom, 2 Bedroom, etc.)",
    )
    service_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Service charge for this unit",
    )

    class Meta:
        db_table = "unit_detail"
        verbose_name = "Unit Detail"
        verbose_name_plural = "Unit Details"
        unique_together = [("node", "identifier")]
        indexes = [models.Index(fields=["identifier", "status"])]

    def __str__(self):
        return f"UnitDetail {self.identifier} ({self.node.name})"


class RoomDetail(TimeStampedUUIDModel):
    """
    Detailed fields for ROOM nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="room_detail",
        limit_choices_to={"node_type": "ROOM"},
    )
    room_type = models.CharField(
        max_length=20,
        choices=[
            ("bedroom", "Bedroom"),
            ("kitchen", "Kitchen"),
            ("bathroom", "Bathroom"),
            ("living_room", "Living Room"),
            ("wc", "WC"),
        ],
        db_index=True,
    )
    size = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "room_detail"
        verbose_name = "Room Detail"
        verbose_name_plural = "Room Details"
        indexes = [models.Index(fields=["room_type"])]

    def __str__(self):
        return f"RoomDetail {self.room_type} ({self.node.name})"


class BasementDetail(TimeStampedUUIDModel):
    """
    Detailed fields for BASEMENT nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="basement_detail",
        limit_choices_to={"node_type": "BASEMENT"},
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "basement_detail"
        verbose_name = "Basement Detail"
        verbose_name_plural = "Basement Details"
        unique_together = [("node", "name")]
        indexes = [models.Index(fields=["name"])]

    def __str__(self):
        return f"BasementDetail {self.name} ({self.node.name})"


class SlotDetail(TimeStampedUUIDModel):
    """
    Detailed fields for SLOT nodes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="slot_detail",
        limit_choices_to={"node_type": "SLOT"},
    )
    number = models.IntegerField(db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "slot_detail"
        verbose_name = "Slot Detail"
        verbose_name_plural = "Slot Details"
        unique_together = [("node", "number")]
        indexes = [models.Index(fields=["number"])]

    def __str__(self):
        return f"SlotDetail #{self.number} ({self.node.name})"


class SlotAssignment(TimeStampedUUIDModel):
    """
    Assigns a UNIT to a SLOT node under a basement.
    """

    slot = models.ForeignKey(
        LocationNode, on_delete=models.CASCADE, related_name="slot_assignments"
    )
    unit = models.ForeignKey(
        LocationNode, on_delete=models.CASCADE, related_name="unit_assignments"
    )

    class Meta:
        db_table = "slot_assignment"
        verbose_name = "Slot Assignment"
        verbose_name_plural = "Slot Assignments"

    def __str__(self):
        return f"Slot {self.slot.name} assigned to Unit {self.unit.name}"


class Media(TimeStampedUUIDModel):
    """
    Media files associated with location nodes (projects, properties, floors, units, rooms).
    Supports images, and documents videos with organized storage structure.
    """

    FILE_TYPE_CHOICES = [
        ("image", "Image"),
        ("document", "Document"),
        ("video", "Video"),
    ]

    MEDIA_CATEGORY_CHOICES = [
        ("main", "Main Photo"),
        ("floor_plan", "Floor Plan"),
        ("interior", "Interior"),
        ("exterior", "Exterior"),
        ("document", "Document"),
        ("thumbnail", "Thumbnail"),
        ("other", "Other"),
    ]

    location_node = models.ForeignKey(
        LocationNode, on_delete=models.CASCADE, related_name="media", db_index=True
    )
    property_tenant = models.ForeignKey(
        "PropertyTenant",
        on_delete=models.CASCADE,
        related_name="media_items",
        db_index=True,
        null=True,
        blank=True,
    )
    file_type = models.CharField(
        max_length=20, choices=FILE_TYPE_CHOICES, db_index=True
    )
    category = models.CharField(
        max_length=20, choices=MEDIA_CATEGORY_CHOICES, default="other", db_index=True
    )
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    media = models.FileField(upload_to=media_upload_path, max_length=255)
    is_featured = models.BooleanField(default=False, db_index=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "location_media"
        verbose_name = "Media"
        verbose_name_plural = "Media"
        ordering = ["order", "-created_at"]
        indexes = [
            models.Index(fields=["file_type", "category"]),
            models.Index(fields=["is_featured", "order"]),
            models.Index(fields=["property_tenant"]),
        ]

    def __str__(self):
        return f"{self.get_file_type_display()} for {self.location_node.name}"

    def save(self, *args, **kwargs):
        # Only one main photo per node
        if self.category == "main" and not self.id:
            Media.objects.filter(
                location_node=self.location_node, category="main"
            ).update(category="other")
        super().save(*args, **kwargs)


class PropertyOwner(TimeStampedUUIDModel):
    """
    Assigns ownership of a PROPERTY or UNIT node to a user or company.
    """

    node = models.OneToOneField(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="owners",
        limit_choices_to={"node_type__in": ["PROPERTY", "UNIT"]},
    )
    owner_user = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="owned_nodes",
    )
    owner_company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="owned_nodes",
    )

    class Meta:
        db_table = "property_owner"
        verbose_name = "Property Owner"
        verbose_name_plural = "Property Owners"
        indexes = [models.Index(fields=["node"])]

    def clean(self):
        if not (self.owner_user or self.owner_company):
            raise models.ValidationError(
                "Either owner_user or owner_company must be set."
            )

    def __str__(self):
        owner = self.owner_user or self.owner_company
        return f"Owner of {self.node.name}: {owner}"


class PropertyTenant(TimeStampedUUIDModel):
    """
    Tenant assignment for PROPERTY or UNIT nodes.
    """

    node = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="tenants",
        # limit_choices_to={"node_type__in": ["PROPERTY", "UNIT"]},
        db_index=True,
    )
    tenant_user = models.ForeignKey(
        Users, on_delete=models.CASCADE, related_name="rented_nodes", db_index=True
    )
    agent = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="agency_tenants",
        db_index=True,
        null=True,
        blank=True,
    )
    contract_start = models.DateField(db_index=True)
    contract_end = models.DateField(null=True, blank=True)
    rent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Actual rent amount for this tenant",
    )
    currency = models.ForeignKey(
        Currencies,
        on_delete=models.CASCADE,
        related_name="property_tenants",
    )
    deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Deposit amount for this tenant",
    )
    commission = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Agent commission for this tenant (first month)",
    )

    class Meta:
        db_table = "property_tenant"
        verbose_name = "Property Tenant"
        verbose_name_plural = "Property Tenants"
        indexes = [models.Index(fields=["node", "tenant_user"])]
        constraints = [
            models.UniqueConstraint(
                fields=["node"],
                condition=models.Q(is_deleted=False),
                name="unique_active_tenant_per_node",
            )
        ]

    def __str__(self):
        return (
            f"Tenant of {self.node.name}: {self.tenant_user} (Rent: {self.rent_amount})"
        )


class Service(TimeStampedUUIDModel):
    """
    Services provided by the management company to properties.
    Supports fixed, percentage, and variable pricing models.
    """

    PRICING_TYPE_CHOICES = [
        ("FIXED", "Fixed Price"),
        ("VARIABLE", "Variable Price"),
        ("PERCENTAGE", "Percentage Based"),
    ]

    FREQUENCY_CHOICES = [
        ("ONE_TIME", "One Time"),
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly"),
        ("YEARLY", "Yearly"),
    ]

    BILLED_TO_CHOICES = [
        ("TENANT", "Tenant"),
        ("OWNER", "Owner"),
        ("MANAGEMENT", "Management"),
    ]

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    pricing_type = models.CharField(
        max_length=20, choices=PRICING_TYPE_CHOICES, default="FIXED", db_index=True
    )
    base_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Base price for FIXED or per-unit rate for VARIABLE",
    )
    percentage_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage rate for PERCENTAGE pricing",
    )
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default="ONE_TIME", db_index=True
    )
    billed_to = models.CharField(
        max_length=20, choices=BILLED_TO_CHOICES, default="TENANT", db_index=True
    )
    requires_approval = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    currency = models.ForeignKey(
        Currencies,
        on_delete=models.CASCADE,
        related_name="services",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "service"
        indexes = [
            models.Index(fields=["pricing_type", "frequency"]),
            models.Index(fields=["is_active", "requires_approval"]),
        ]

    def clean(self):
        super().clean()
        if self.pricing_type == "FIXED" and self.base_price is None:
            raise ValidationError("Fixed services must define a base_price.")
        if self.pricing_type == "PERCENTAGE" and self.percentage_rate is None:
            raise ValidationError("Percentage services must define a percentage_rate.")

    def __str__(self):
        return f"{self.name} ({self.get_pricing_type_display()})"


class Meter(TimeStampedUUIDModel):
    """
    Optional meter for VARIABLE services.
    """

    property_service = models.OneToOneField(
        "PropertyService",
        on_delete=models.CASCADE,
        related_name="meter_details",
        limit_choices_to={"service__pricing_type": "VARIABLE"},
    )
    meter_identifier = models.CharField(max_length=100, unique=True, db_index=True)

    class Meta:
        db_table = "meter"
        indexes = [
            models.Index(fields=["property_service"]),
        ]

    def __str__(self):
        return f"Meter {self.meter_identifier} for {self.property_service}"


class MeterReading(TimeStampedUUIDModel):
    """
    Cumulative meter reading entries.
    """

    meter = models.ForeignKey(
        Meter, on_delete=models.CASCADE, related_name="readings", db_index=True
    )
    reading_date = models.DateField(db_index=True)
    reading_value = models.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        db_table = "meter_reading"
        ordering = ["-reading_date"]
        unique_together = [("meter", "reading_date")]
        indexes = [
            models.Index(fields=["meter", "reading_date"]),
        ]

    def __str__(self):
        return f"{self.meter.meter_identifier} = {self.reading_value} on {self.reading_date}"


class PropertyService(TimeStampedUUIDModel):
    """
    Subscription of a Service to a property, supporting
    fixed, percentage, and variable (metered/unmetered) billing.
    """

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("PAUSED", "Paused"),
        ("CANCELLED", "Cancelled"),
    ]

    property_node = models.ForeignKey(
        LocationNode,
        on_delete=models.CASCADE,
        related_name="services",
        limit_choices_to={"node_type__in": ["UNIT"]},
        db_index=True,
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="property_services",
        db_index=True,
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="ACTIVE", db_index=True
    )
    currency = models.ForeignKey(
        Currencies,
        on_delete=models.CASCADE,
        related_name="property_services",
        null=True,
        blank=True,
    )
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(null=True, blank=True)
    is_metered = models.BooleanField(
        default=False, help_text="When true, VARIABLE pricing uses the associated Meter"
    )
    meter = models.OneToOneField(
        Meter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="property_service_link",
        help_text="Attach a Meter if is_metered=True",
    )
    last_billed_reading = models.ForeignKey(
        MeterReading,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="MeterReading used for the previous billing run",
    )
    next_billing_date = models.DateField(null=True, blank=True)
    custom_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override price for VARIABLE unmetered services",
    )

    class Meta:
        db_table = "property_service"
        # unique_together = [("property_node", "service")]
        indexes = [
            models.Index(fields=["status", "start_date"]),
            models.Index(fields=["next_billing_date"]),
            models.Index(fields=["meter"]),
            models.Index(fields=["last_billed_reading"]),
        ]

    def clean(self):
        super().clean()
        if self.is_metered:
            if self.service.pricing_type != "VARIABLE":
                raise ValidationError("Only VARIABLE services can be metered.")
            if not self.meter:
                raise ValidationError("Metered services require an associated Meter.")

    def _frequency_delta(self):
        freq = self.service.frequency
        return {
            "ONE_TIME": None,
            "DAILY": relativedelta(days=1),
            "WEEKLY": relativedelta(weeks=1),
            "MONTHLY": relativedelta(months=1),
            "QUARTERLY": relativedelta(months=3),
            "YEARLY": relativedelta(years=1),
        }.get(freq)

    def get_current_price(self):
        svc = self.service

        # FIXED pricing
        if svc.pricing_type == "FIXED":
            return svc.base_price or 0

        # PERCENTAGE pricing
        if svc.pricing_type == "PERCENTAGE":
            return svc.percentage_rate or 0

        # VARIABLE pricing
        if svc.pricing_type == "VARIABLE":
            # metered: bill consumption since last_billed_reading
            if self.is_metered and self.meter:
                qs = self.meter.readings.order_by("reading_date")
                if self.last_billed_reading:
                    qs = qs.filter(
                        reading_date__gt=self.last_billed_reading.reading_date
                    )
                readings = list(qs)
                if readings:
                    prev = (
                        self.last_billed_reading.reading_value
                        if self.last_billed_reading
                        else readings[0].reading_value
                    )
                    curr = readings[-1].reading_value
                    consumption = curr - prev
                    rate = self.custom_price or svc.base_price or 0
                    return consumption * rate
                return 0

            # unmetered: flat or custom price per period
            return (
                self.custom_price
                if self.custom_price is not None
                else svc.base_price or 0
            )

        return 0

    def __str__(self):
        mflag = "metered" if self.is_metered else "flat"
        return f"{self.service.name} [{mflag}] on {self.property_node.name}"


class MaintenanceRequest(TimeStampedUUIDModel):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]
    node = models.ForeignKey(
        LocationNode,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="maintenance_requests",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="medium"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    vendor = models.ForeignKey(
        "payments.Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_requests",
    )

    class Meta:
        db_table = "maintenance_request"
        verbose_name = "Maintenance Request"
        verbose_name_plural = "Maintenance Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
