from rest_framework import serializers

from payments.models import Vendor
from properties.models import LocationNode, MaintenanceRequest
from utils.format import RobustDateTimeField


class VendorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50)


class MaintenanceRequestSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True)
    status = serializers.ChoiceField(
        choices=[
            ("open", "Open"),
            ("in_progress", "In Progress"),
            ("resolved", "Resolved"),
            ("closed", "Closed"),
        ]
    )
    priority = serializers.ChoiceField(
        choices=[
            ("urgent", "Urgent"),
            ("high", "High"),
            ("medium", "Medium"),
            ("low", "Low"),
        ]
    )
    vendor = VendorSerializer()
    created_by = serializers.CharField(max_length=255)
    created_at = RobustDateTimeField(read_only=True)
    project = serializers.SerializerMethodField()
    node = serializers.SerializerMethodField()  # Always show the node name (unit/block/house/basement)

    def get_project(self, obj):
        # Always show the project name (mandatory)
        if obj.node:
            project_node = (
                obj.node.get_ancestors(include_self=True)
                .filter(node_type="PROJECT")
                .first()
            )
            return str(project_node.name) if project_node else None
        return None

    def get_node(self, obj):
        # Show the node name (unit/block/house/basement/etc.)
        if obj.node:
            return obj.node.name
        return None


class MaintenanceRequestCreateSerializer(serializers.ModelSerializer):
    vendor_id = serializers.UUIDField(write_only=True)
    node_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = ["title", "description", "status", "priority", "vendor_id", "node_id"]

    def create(self, validated_data):
        vendor_id = validated_data.pop("vendor_id")
        node_id = validated_data.pop("node_id")
        vendor = Vendor.objects.get(id=vendor_id)
        node = LocationNode.objects.get(id=node_id)
        return MaintenanceRequest.objects.create(
            vendor=vendor, node=node, **validated_data
        )
