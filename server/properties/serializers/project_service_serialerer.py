from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Q
from rest_framework import serializers

from properties.models import (
    LocationNode,
    Meter,
    MeterReading,
    ProjectDetail,
    PropertyService,
    Service,
    UnitDetail,
)
from utils.format import format_money_with_currency


def calculate_project_service_statistics(project_detail_id):
    """
    Calculate comprehensive statistics for a project's services
    """
    # Get project detail and node
    try:
        project_detail = ProjectDetail.objects.get(
            id=project_detail_id, is_deleted=False
        )
        project_node = project_detail.node
    except ProjectDetail.DoesNotExist:
        return None

    # Get all descendant nodes
    descendants = project_node.get_descendants(include_self=True)

    # Structure counts - for proportional service charging
    # We count Units and Houses as the main structures that can be charged for services
    total_units = descendants.filter(node_type="UNIT", is_deleted=False).count()
    total_houses = descendants.filter(node_type="HOUSE", is_deleted=False).count()
    total_blocks = descendants.filter(node_type="BLOCK", is_deleted=False).count()
    # Total structures = Units + Houses (for proportional service charging)
    total_structures = total_units + total_houses

    # Get all service assignments for this project
    service_assignments = PropertyService.objects.filter(
        property_node__in=descendants, is_deleted=False
    ).select_related("service", "property_node")

    # Service assignment counts
    total_services = service_assignments.count()
    metered_services = service_assignments.filter(is_metered=True).count()
    unmetered_services = total_services - metered_services

    # Service status counts
    active_services = service_assignments.filter(status="ACTIVE").count()
    paused_services = service_assignments.filter(status="PAUSED").count()
    cancelled_services = service_assignments.filter(status="CANCELLED").count()

    # Billing type counts (from active services only)
    active_assignments = service_assignments.filter(status="ACTIVE")
    fixed_billing = active_assignments.filter(service__pricing_type="FIXED").count()
    variable_billing = active_assignments.filter(
        service__pricing_type="VARIABLE"
    ).count()
    percentage_billing = active_assignments.filter(
        service__pricing_type="PERCENTAGE"
    ).count()

    # Expiring services (within 30 days)
    thirty_days_from_now = datetime.now().date() + timedelta(days=30)
    expiring_soon = active_assignments.filter(
        end_date__lte=thirty_days_from_now, end_date__gte=datetime.now().date()
    ).count()

    # Top service types
    service_counts = (
        active_assignments.values("service__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:4]
    )

    top_service_types = [
        {"name": item["service__name"], "count": item["count"]}
        for item in service_counts
    ]

    return {
        "total_units": total_units,
        "total_houses": total_houses,
        "total_blocks": total_blocks,
        "total_structures": total_structures,
        "total_services": total_services,
        "metered_services": metered_services,
        "unmetered_services": unmetered_services,
        "active_services": active_services,
        "paused_services": paused_services,
        "cancelled_services": cancelled_services,
        "fixed_billing": fixed_billing,
        "variable_billing": variable_billing,
        "percentage_billing": percentage_billing,
        "expiring_soon": expiring_soon,
        "top_service_types": top_service_types,
    }


def get_project_service_overview(project_detail_id):
    """
    Get complete project service overview for ServiceTab
    """
    # Get project detail and node
    try:
        project_detail = ProjectDetail.objects.get(
            id=project_detail_id, is_deleted=False
        )
        project_node = project_detail.node
    except ProjectDetail.DoesNotExist:
        return None

    # Calculate statistics
    statistics = calculate_project_service_statistics(project_detail_id)
    if not statistics:
        return None

    # Get all service assignments for this project
    descendants = project_node.get_descendants(include_self=True)
    service_assignments = (
        PropertyService.objects.filter(property_node__in=descendants, is_deleted=False)
        .select_related("service", "property_node", "meter", "last_billed_reading")
        .prefetch_related("property_node__unit_detail")
    )

    # Serialize service assignments
    # assignment_serializer = ServiceAssignmentSerializer(service_assignments, many=True)

    # Calculate additional metadata
    total_properties_with_services = (
        service_assignments.values("property_node").distinct().count()
    )
    total_active_services = service_assignments.filter(status="ACTIVE").count()

    # Calculate revenue potential
    total_revenue = Decimal("0.00")
    for assignment in service_assignments.filter(status="ACTIVE"):
        price = assignment.get_current_price()
        if price:
            try:
                total_revenue += Decimal(str(price))
            except (ValueError, TypeError):
                pass

    return {
        "project_id": project_detail_id,
        "project_name": project_node.name,
        "project_description": project_detail.description or "",
        "statistics": statistics,
        "service_assignments": list(service_assignments),
        "total_properties_with_services": total_properties_with_services,
        "total_active_services": total_active_services,
        "total_revenue_potential": format_money_with_currency(total_revenue),
    }


class ProjectServiceStatisticsSerializer(serializers.Serializer):
    """Serializer for project service statistics"""

    # Structure counts
    total_units = serializers.IntegerField()
    total_houses = serializers.IntegerField()
    total_blocks = serializers.IntegerField()
    total_structures = serializers.IntegerField()

    # Service assignment counts
    total_services = serializers.IntegerField()
    metered_services = serializers.IntegerField()
    unmetered_services = serializers.IntegerField()

    # Service status counts
    active_services = serializers.IntegerField()
    paused_services = serializers.IntegerField()
    cancelled_services = serializers.IntegerField()

    # Billing type counts
    fixed_billing = serializers.IntegerField()
    variable_billing = serializers.IntegerField()
    percentage_billing = serializers.IntegerField()

    # Expiring services
    expiring_soon = serializers.IntegerField()

    # Top service types
    top_service_types = serializers.ListField(
        child=serializers.DictField(), read_only=True
    )


class ServiceAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for individual service assignments"""

    service_name = serializers.CharField(source="service.name", read_only=True)
    service_description = serializers.CharField(
        source="service.description", read_only=True
    )
    service_pricing_type = serializers.CharField(
        source="service.pricing_type", read_only=True
    )
    service_base_price = serializers.SerializerMethodField()
    service_percentage_rate = serializers.SerializerMethodField()
    service_frequency = serializers.CharField(
        source="service.frequency", read_only=True
    )
    service_billed_to = serializers.CharField(
        source="service.billed_to", read_only=True
    )
    service_requires_approval = serializers.BooleanField(
        source="service.requires_approval", read_only=True
    )
    service_is_active = serializers.BooleanField(
        source="service.is_active", read_only=True
    )

    # Structure information
    structure_type = serializers.SerializerMethodField()
    structure_value = serializers.SerializerMethodField()

    # Meter information
    is_metered = serializers.BooleanField()
    meter_identifier = serializers.SerializerMethodField()
    last_reading = serializers.SerializerMethodField()
    next_billing_date = serializers.DateField()

    # Pricing information
    current_price = serializers.SerializerMethodField()

    # Always return currency as a string (never null)
    currency = serializers.SerializerMethodField()

    class Meta:
        model = PropertyService
        fields = [
            "id",
            "service_name",
            "service_description",
            "service_pricing_type",
            "service_base_price",
            "service_percentage_rate",
            "service_frequency",
            "service_billed_to",
            "service_requires_approval",
            "service_is_active",
            "status",
            "currency",
            "start_date",
            "end_date",
            "is_metered",
            "meter_identifier",
            "last_reading",
            "next_billing_date",
            "current_price",
            "structure_type",
            "structure_value",
        ]

    def get_service_base_price(self, obj):
        """Get service base price as formatted string"""
        if obj.service.base_price is not None:
            return format_money_with_currency(obj.service.base_price)
        return None

    def get_service_percentage_rate(self, obj):
        """Get service percentage rate as string"""
        return (
            str(obj.service.percentage_rate)
            if obj.service.percentage_rate is not None
            else None
        )

    def get_currency(self, obj):
        # Always return a string (never null)
        if obj.currency:
            return str(obj.currency)
        return ""

    def get_structure_type(self, obj):
        """Get the type of structure this service is assigned to"""
        node = obj.property_node

        # Determine structure type based on node hierarchy
        if node.node_type == "UNIT":
            # Check if unit is under a block or house
            parent = node.parent
            if parent and parent.node_type == "FLOOR":
                grandparent = parent.parent
                if grandparent and grandparent.node_type == "BLOCK":
                    return "Block"
                elif grandparent and grandparent.node_type == "HOUSE":
                    return "House"
            return "Unit"
        elif node.node_type == "BLOCK":
            return "Block"
        elif node.node_type == "HOUSE":
            return "House"
        elif node.node_type == "PROJECT":
            return "Project"

        return "Unknown"

    def get_structure_value(self, obj):
        """Get the value/name of the structure this service is assigned to"""
        node = obj.property_node

        if node.node_type == "UNIT":
            try:
                unit_detail = node.unit_detail
                return unit_detail.identifier
            except UnitDetail.DoesNotExist:
                return node.name
        elif node.node_type == "BLOCK":
            return node.name
        elif node.node_type == "HOUSE":
            return node.name
        elif node.node_type == "PROJECT":
            return node.name

        return node.name

    def get_meter_identifier(self, obj):
        """Get meter identifier if metered"""
        return obj.meter.meter_identifier if obj.is_metered and obj.meter else None

    def get_last_reading(self, obj):
        """Get last meter reading if available"""
        if obj.is_metered and obj.last_billed_reading:
            return {
                "reading_date": obj.last_billed_reading.reading_date,
                "reading_value": str(obj.last_billed_reading.reading_value),
            }
        return None

    def get_current_price(self, obj):
        """Get current price for the service as formatted string"""
        price = obj.get_current_price()
        if price is not None:
            return format_money_with_currency(price)
        return None


class ProjectServiceOverviewSerializer(serializers.Serializer):
    """Main serializer for project service overview"""

    # Project information
    project_id = serializers.UUIDField()
    project_name = serializers.CharField()
    project_description = serializers.CharField()

    # Statistics
    statistics = ProjectServiceStatisticsSerializer()

    # Service assignments
    service_assignments = ServiceAssignmentSerializer(many=True)

    # Additional metadata
    total_properties_with_services = serializers.IntegerField()
    total_active_services = serializers.IntegerField()
    total_revenue_potential = serializers.SerializerMethodField()

    def get_total_revenue_potential(self, obj):
        """Calculate total revenue potential from active services"""
        total = Decimal("0.00")
        for assignment in obj.get("service_assignments", []):
            if getattr(assignment, "status", None) == "ACTIVE":
                price = getattr(assignment, "get_current_price", None)
                if price:
                    try:
                        current_price = price()
                        if current_price is not None:
                            total += Decimal(str(current_price))
                    except (ValueError, TypeError):
                        pass
        return format_money_with_currency(total)


class ProjectServiceListSerializer(serializers.Serializer):
    """Serializer for listing project services with pagination"""

    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = ServiceAssignmentSerializer(many=True)


class ProjectServiceCreateSerializer(serializers.Serializer):
    """Serializer for creating new service assignments"""

    service_id = serializers.UUIDField()
    property_node_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        allow_empty=False,
    )
    status = serializers.ChoiceField(
        choices=PropertyService.STATUS_CHOICES, default="ACTIVE"
    )
    currency = serializers.UUIDField(required=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    is_metered = serializers.BooleanField(default=False)
    custom_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class ProjectServiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating service assignments"""

    class Meta:
        model = PropertyService
        fields = [
            "status",
            "currency",
            "start_date",
            "end_date",
            "is_metered",
            "custom_price",
            "next_billing_date",
        ]

    def validate(self, data):
        """Validate update data"""
        instance = self.instance

        # If changing to metered, ensure service supports it
        if (
            data.get("is_metered", False)
            and instance.service.pricing_type != "VARIABLE"
        ):
            raise serializers.ValidationError(
                "Only variable pricing services can be metered"
            )

        return data


class ProjectServiceDeleteSerializer(serializers.Serializer):
    """Serializer for deleting service assignments"""

    service_assignment_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_service_assignment_id(self, value):
        """Validate service assignment exists"""
        try:
            PropertyService.objects.get(id=value, is_deleted=False)
        except PropertyService.DoesNotExist:
            raise serializers.ValidationError("Service assignment not found")

        return value
