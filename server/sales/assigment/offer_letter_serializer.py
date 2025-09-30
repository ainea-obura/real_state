from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone

from ..models import AssignedDocument
from accounts.models import Users
from properties.models import LocationNode
from documents.models import ContractTemplate


class OfferLetterSerializer(serializers.ModelSerializer):
    """Serializer for creating offer letters"""

    # Custom fields for API
    property_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of property IDs (units/houses) for the offer letter",
        write_only=True,
    )

    buyer_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of buyer IDs for the offer letter",
        write_only=True,
    )

    template_id = serializers.UUIDField(
        help_text="ID of the offer letter template",
        write_only=True,
    )

    offer_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Total offer price for all properties",
        write_only=True,
    )

    down_payment = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Down payment amount",
        write_only=True,
    )

    due_date = serializers.DateField(
        help_text="Due date for accepting the offer",
        format="%Y-%m-%d",
        input_formats=["%Y-%m-%d"],
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Additional notes for the offer letter",
        write_only=True,
    )

    class Meta:
        model = AssignedDocument
        fields = [
            "id",
            "document_type",
            "status",
            "price",
            "down_payment",
            "down_payment_percentage",
            "due_date",
            "notes",
            "created_at",
            "updated_at",
            "property_ids",
            "buyer_ids",
            "template_id",
            "offer_price",
        ]
        read_only_fields = [
            "id",
            "document_type",
            "status",
            "price",
            "down_payment",
            "down_payment_percentage",
            "created_at",
            "updated_at",
        ]

    def validate_property_ids(self, value):
        """Validate that all property IDs exist and are valid property types"""
        if not value:
            raise ValidationError("At least one property must be selected")

        # Check if properties exist and are valid types
        valid_properties = []
        for property_id in value:
            try:
                property_node = LocationNode.objects.get(
                    id=property_id,
                    node_type__in=["UNIT", "HOUSE"],
                    is_deleted=False,
                )
                valid_properties.append(property_node)
            except LocationNode.DoesNotExist:
                raise ValidationError(
                    f"Property with ID '{property_id}' was not found or is "
                    f"not a valid property type. Only UNIT and HOUSE nodes "
                    f"can be used for offer letters."
                )

        return value

    def validate_buyer_ids(self, value):
        """Validate that all buyer IDs exist and have the correct type"""
        if not value:
            raise ValidationError("At least one buyer must be selected")

        # Check if buyers exist and are valid types
        valid_buyers = []
        for buyer_id in value:
            try:
                buyer = Users.objects.get(
                    id=buyer_id,
                    type__in=["buyer", "owner"],
                    is_deleted=False,
                )
                valid_buyers.append(buyer)
            except Users.DoesNotExist:
                raise ValidationError(
                    f"Buyer with ID '{buyer_id}' was not found or is not a valid "
                    f"buyer type. Only users with 'buyer' or 'owner' type can "
                    f"receive offer letters."
                )

        return value

    def validate_template_id(self, value):
        """Validate that the template exists and is an offer letter template"""
        try:
            template = ContractTemplate.objects.get(
                id=value,
                template_type="offer_letter",
                is_active=True,
            )
        except ContractTemplate.DoesNotExist:
            raise ValidationError(
                f"Template with ID '{value}' was not found or is not an active "
                f"offer letter template."
            )
        return value

    def validate_due_date(self, value):
        """Validate that due date is in the future"""
        if value <= timezone.now().date():
            raise ValidationError(
                "Due date must be in the future. "
                "Please select a date that is at least tomorrow."
            )
        return value

    def validate_offer_price(self, value):
        """Validate offer price is positive"""
        if value <= 0:
            raise ValidationError("Offer price must be greater than 0")
        return value

    def validate_down_payment(self, value):
        """Validate down payment is positive and not greater than offer price"""
        if value <= 0:
            raise ValidationError("Down payment must be greater than 0")

        offer_price = self.initial_data.get("offer_price")
        if offer_price and value > offer_price:
            raise ValidationError("Down payment cannot be greater than offer price")

        return value

    def validate(self, data):
        """Cross-field validation"""
        # Check if we have the required custom fields
        required_fields = [
            "property_ids",
            "buyer_ids",
            "template_id",
            "offer_price",
            "down_payment",
            "due_date",
        ]
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"{field} is required")

        return data

    def create(self, validated_data):
        """Create offer letter documents for each buyer-property combination"""
        # Extract custom fields
        property_ids = validated_data.pop("property_ids")
        buyer_ids = validated_data.pop("buyer_ids")
        template_id = validated_data.pop("template_id")
        offer_price = validated_data.pop("offer_price")
        down_payment = validated_data.pop("down_payment")
        notes = validated_data.pop("notes", "")

        # Get the template
        template = ContractTemplate.objects.get(id=template_id)

        # Get properties and buyers
        properties = LocationNode.objects.filter(id__in=property_ids)
        buyers = Users.objects.filter(id__in=buyer_ids)

        # Calculate price per property (divide equally)
        price_per_property = offer_price / len(properties)
        down_payment_per_property = down_payment / len(properties)

        # Create offer letter documents for each buyer-property combination
        created_documents = []

        for buyer in buyers:
            for property_node in properties:
                # Calculate down payment percentage
                down_payment_percentage = (
                    down_payment_per_property / price_per_property
                ) * 100

                # Create document title
                document_title = (
                    f"Offer Letter - {property_node.name} for {buyer.get_full_name()}"
                )

                # Create the offer letter document
                offer_letter = AssignedDocument.objects.create(
                    document_type="offer_letter",
                    template=template,
                    buyer=buyer,
                    property_node=property_node,
                    document_title=document_title,
                    price=price_per_property,
                    down_payment=down_payment_per_property,
                    down_payment_percentage=down_payment_percentage,
                    due_date=validated_data["due_date"],
                    notes=notes,
                    status="draft",
                    created_by=self.context["request"].user,
                )

                created_documents.append(offer_letter)

        # Return the first created document (for API response)
        # In practice, you might want to return all created documents
        return created_documents[0] if created_documents else None
