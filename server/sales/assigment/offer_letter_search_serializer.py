from rest_framework import serializers
from sales.models import AssignedDocument


class OfferLetterSearchRequestSerializer(serializers.Serializer):
    """Serializer for offer letter search request"""

    owner_ids = serializers.ListField(
        child=serializers.UUIDField(), help_text="List of owner/buyer IDs to search for"
    )

    property_ids = serializers.ListField(
        child=serializers.UUIDField(), help_text="List of property IDs to search for"
    )


class OfferLetterSearchResponseSerializer(serializers.ModelSerializer):
    """Serializer for offer letter search response"""

    buyer_name = serializers.CharField(source="buyer.get_full_name", read_only=True)
    property_name = serializers.CharField(source="property_node.name", read_only=True)
    project_name = serializers.SerializerMethodField()

    def get_project_name(self, obj):
        """Get project name by traversing up the tree to find PROJECT ancestor"""
        try:
            # Check if property_node exists
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
        except Exception as e:
            # Log the error for debugging but return a safe fallback
            print(f"Error getting project name: {e}")
            return "Project not specified"

    # Format financial values
    price_formatted = serializers.SerializerMethodField()
    down_payment_formatted = serializers.SerializerMethodField()

    # Format dates
    due_date_formatted = serializers.SerializerMethodField()

    class Meta:
        model = AssignedDocument
        fields = [
            "id",
            "document_title",
            "buyer_name",
            "property_name",
            "project_name",
            "price_formatted",
            "down_payment_formatted",
            "due_date_formatted",
        ]
        read_only_fields = fields

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
