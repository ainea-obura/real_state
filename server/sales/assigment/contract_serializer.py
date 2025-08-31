from rest_framework import serializers
from sales.models import AssignedDocument
from accounts.models import Users
from properties.models import LocationNode
from documents.models import ContractTemplate


class ContractCreateRequestSerializer(serializers.Serializer):
    """Serializer for creating contracts from offer letters"""

    # Required fields
    offer_letter_id = serializers.UUIDField(
        help_text="ID of the offer letter to convert to contract"
    )
    template_id = serializers.UUIDField(help_text="ID of the contract template to use")

    # Optional fields
    notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Additional notes for the contract",
    )

    # Variable values for template generation
    variable_values = serializers.JSONField(
        required=False, default=dict, help_text="Values for template variables"
    )

    def validate_offer_letter_id(self, value):
        """Validate that the offer letter exists and automatically update status"""
        try:
            offer_letter = AssignedDocument.objects.get(
                id=value, document_type="offer_letter"
            )

            # For contract creation, automatically convert any valid offer letter to accepted
            if offer_letter.status in ["active", "pending", "draft"]:
                offer_letter.status = "accepted"
                offer_letter.save(update_fields=["status"])
            elif offer_letter.status not in ["accepted", "signed"]:
                # Only reject if status is clearly invalid (rejected, withdrawn, etc.)
                raise serializers.ValidationError(
                    f"Offer letter with status '{offer_letter.status}' cannot be converted to contract"
                )

            return value
        except AssignedDocument.DoesNotExist:
            raise serializers.ValidationError("Offer letter not found")

    def validate_template_id(self, value):
        """Validate that the contract template exists"""
        try:
            template = ContractTemplate.objects.get(id=value)
            return value
        except ContractTemplate.DoesNotExist:
            raise serializers.ValidationError("Contract template not found")


class ContractCreateResponseSerializer(serializers.ModelSerializer):
    """Serializer for contract creation response"""

    buyer_name = serializers.CharField(source="buyer.get_full_name", read_only=True)
    property_name = serializers.CharField(source="property_node.name", read_only=True)
    project_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)

    # Financial details from offer letter
    price_formatted = serializers.SerializerMethodField()
    down_payment_formatted = serializers.SerializerMethodField()
    due_date_formatted = serializers.SerializerMethodField()

    # Related offer letter info
    related_offer_letter = serializers.SerializerMethodField()

    class Meta:
        model = AssignedDocument
        fields = [
            "id",
            "document_title",
            "buyer_name",
            "property_name",
            "project_name",
            "template_name",
            "price_formatted",
            "down_payment_formatted",
            "due_date_formatted",
            "related_offer_letter",
            "status",
            "created_at",
            "notes",
        ]
        read_only_fields = fields

    def get_project_name(self, obj):
        """Get project name by traversing up the tree to find PROJECT ancestor"""
        try:
            if not obj.property_node:
                return "Property not specified"

            # Find the PROJECT ancestor by traversing up the tree
            project_ancestor = (
                obj.property_node.get_ancestors(include_self=True)
                .filter(node_type="PROJECT")
                .first()
            )

            if project_ancestor:
                return project_ancestor.name
            return "Project not specified"
        except Exception:
            return "Project not specified"

    def get_price_formatted(self, obj):
        """Format price with currency"""
        if obj.price:
            return f"KES {obj.price:,.2f}"
        return "Not set"

    def get_down_payment_formatted(self, obj):
        """Format down payment with currency"""
        if obj.down_payment:
            return f"KES {obj.down_payment:,.2f}"
        return "Not set"

    def get_due_date_formatted(self, obj):
        """Format due date"""
        if obj.due_date:
            return obj.due_date.strftime("%B %d, %Y")
        return "Not set"

    def get_related_offer_letter(self, obj):
        """Get info about the related offer letter"""
        if obj.related_document:
            return {
                "id": obj.related_document.id,
                "document_title": obj.related_document.document_title,
                "status": obj.related_document.status,
            }
        return None
