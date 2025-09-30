from rest_framework import serializers
from ..models import AssignedDocument
from accounts.models import Users
from properties.models import LocationNode


class BuyerSerializer(serializers.ModelSerializer):
    """Serializer for buyer/owner information"""

    name = serializers.SerializerMethodField()
    phone = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = Users
        fields = ["name", "phone", "email"]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class PropertySerializer(serializers.ModelSerializer):
    """Serializer for property information with project details"""

    project = serializers.SerializerMethodField()
    block = serializers.SerializerMethodField()
    floor = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    houseName = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = ["project", "block", "floor", "unit", "houseName"]

    def get_project(self, obj):
        """Get project name by traversing up the tree"""
        try:
            project_ancestor = (
                obj.get_ancestors(include_self=True).filter(node_type="PROJECT").first()
            )
            return project_ancestor.name if project_ancestor else "Unknown Project"
        except Exception:
            return "Unknown Project"

    def get_block(self, obj):
        """Get block information by traversing up the tree"""
        try:
            if obj.node_type == "UNIT":
                # Find block ancestor for units
                block_ancestor = (
                    obj.get_ancestors(include_self=True)
                    .filter(node_type="BLOCK")
                    .first()
                )
                if block_ancestor and hasattr(block_ancestor, "block_detail"):
                    return block_ancestor.block_detail.name
                return block_ancestor.name if block_ancestor else None
            elif obj.node_type == "BLOCK":
                # If this is already a block, get its name
                if hasattr(obj, "block_detail"):
                    return obj.block_detail.name
                return obj.name
            return None
        except Exception:
            return None

    def get_floor(self, obj):
        """Get floor information by traversing up the tree"""
        try:
            if obj.node_type == "UNIT":
                # Find floor ancestor for units
                floor_ancestor = (
                    obj.get_ancestors(include_self=True)
                    .filter(node_type="FLOOR")
                    .first()
                )
                if floor_ancestor and hasattr(floor_ancestor, "floor_detail"):
                    return floor_ancestor.floor_detail.number
                return floor_ancestor.name if floor_ancestor else None
            elif obj.node_type == "FLOOR":
                # If this is already a floor, get its number
                if hasattr(obj, "floor_detail"):
                    return obj.floor_detail.number
                return obj.name
            return None
        except Exception:
            return None

    def get_unit(self, obj):
        """Get unit number for UNIT nodes"""
        try:
            if obj.node_type == "UNIT" and hasattr(obj, "unit_detail"):
                return obj.unit_detail.identifier
            return None
        except Exception:
            return None

    def get_houseName(self, obj):
        """Get house name for HOUSE nodes"""
        try:
            if obj.node_type == "HOUSE" and hasattr(obj, "villa_detail"):
                return obj.villa_detail.villa_name
            return None
        except Exception:
            return None


class OfferLetterSerializer(serializers.ModelSerializer):
    """Serializer for offer letter information"""

    documentLink = serializers.SerializerMethodField()
    dueDate = serializers.DateField(source="due_date")
    status = serializers.SerializerMethodField()
    documentName = serializers.CharField(source="document_title")

    class Meta:
        model = AssignedDocument
        fields = ["documentLink", "dueDate", "status", "documentName"]

    def _get_value(self, obj, key):
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    def get_documentLink(self, obj):
        """Prefer document_file URL; fallback to legacy document_link"""
        file_val = self._get_value(obj, "document_file")
        if hasattr(file_val, "url"):
            return file_val.url
        link_val = self._get_value(obj, "document_link")
        return link_val or "#"

    def get_status(self, obj):
        """Map offer status to display value (dict or instance)."""
        raw_status = self._get_value(obj, "status") or "active"
        if raw_status in {"accepted", "rejected", "withdrawn"}:
            return raw_status
        # Expired if due_date in past would be computed in model; keep as-is
        if raw_status == "expired":
            return "expired"
        return "active"


class AgreementSerializer(serializers.ModelSerializer):
    """Serializer for agreement/contract information"""

    documentLink = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    documentName = serializers.CharField(source="document_title")

    class Meta:
        model = AssignedDocument
        fields = ["documentLink", "status", "documentName"]

    def _get_value(self, obj, key):
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    def get_documentLink(self, obj):
        """Prefer document_file URL; fallback to legacy document_link"""
        file_val = self._get_value(obj, "document_file")
        if hasattr(file_val, "url"):
            return file_val.url
        link_val = self._get_value(obj, "document_link")
        return link_val or "#"

    def get_status(self, obj):
        """Map agreement status to display value (dict or instance)."""
        raw_status = self._get_value(obj, "status") or "pending"
        if raw_status == "signed":
            return "signed"
        if raw_status in {"draft", "expired"}:
            return "pending"
        return raw_status


class DocumentGroupSerializer(serializers.Serializer):
    """Main serializer for grouped document data"""

    id = serializers.SerializerMethodField()
    buyer = serializers.SerializerMethodField()
    property = serializers.SerializerMethodField()
    offerLetter = OfferLetterSerializer(source="offer_letter", allow_null=True)
    agreement = AgreementSerializer(source="contract", allow_null=True)
    createdAt = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()

    class Meta:
        fields = [
            "id",
            "buyer",
            "property",
            "offerLetter",
            "agreement",
            "createdAt",
            "updatedAt",
        ]

    def get_id(self, obj):
        """Generate unique ID for the group"""
        return f"{obj['property_node_id']}_{obj['buyer_id']}"

    def get_buyer(self, obj):
        """Get buyer information from the buyer_id"""
        try:
            buyer = Users.objects.get(id=obj["buyer_id"])
            return BuyerSerializer(buyer).data
        except Users.DoesNotExist:
            return {"name": "Unknown", "phone": "", "email": ""}

    def get_property(self, obj):
        """Get property information from the property_node_id"""
        try:
            property_node = LocationNode.objects.get(id=obj["property_node_id"])
            return PropertySerializer(property_node).data
        except LocationNode.DoesNotExist:
            return {
                "project": "Unknown",
                "block": None,
                "floor": None,
                "unit": None,
                "houseName": None,
            }

    def _get_nested_timestamp(self, obj, nested_key, ts_key):
        nested = obj.get(nested_key)
        if isinstance(nested, dict):
            return nested.get(ts_key)
        return None

    def get_createdAt(self, obj):
        """Prefer contract.created_at; fallback to offer_letter.created_at"""
        return self._get_nested_timestamp(
            obj, "contract", "created_at"
        ) or self._get_nested_timestamp(obj, "offer_letter", "created_at")

    def get_updatedAt(self, obj):
        """Prefer offer_letter.updated_at; fallback to contract.updated_at"""
        return self._get_nested_timestamp(
            obj, "offer_letter", "updated_at"
        ) or self._get_nested_timestamp(obj, "contract", "updated_at")

    def to_representation(self, instance):
        """Custom representation to handle grouped data"""
        data = super().to_representation(instance)

        # Ensure offerLetter and agreement are properly set
        if not data.get("offerLetter"):
            data["offerLetter"] = None
        if not data.get("agreement"):
            data["agreement"] = None

        return data


class DocumentListSerializer(serializers.Serializer):
    """Serializer for the complete document list response"""

    count = serializers.IntegerField()
    results = DocumentGroupSerializer(many=True)
