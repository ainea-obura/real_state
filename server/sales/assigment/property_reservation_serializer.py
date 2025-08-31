from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone

from ..models import PropertyReservation
from accounts.models import Users
from properties.models import LocationNode


class PropertyReservationSerializer(serializers.ModelSerializer):
    """Serializer for creating PropertyReservation"""

    # Custom fields for API
    property_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of property IDs to reserve",
        write_only=True,
    )
    owner_id = serializers.UUIDField(
        help_text="ID of the owner making the reservation",
        write_only=True,
    )

    # Strict date-only field; accept only YYYY-MM-DD and return date
    end_date = serializers.DateField(
        help_text="End date of the reservation period",
        format="%Y-%m-%d",
        input_formats=["%Y-%m-%d"],
    )

    class Meta:
        model = PropertyReservation
        fields = [
            "id",
            "status",
            "end_date",
            "deposit_fee",
            "notes",
            "created_at",
            "updated_at",
            "property_ids",
            "owner_id",
        ]
        read_only_fields = [
            "id",
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
                    f"can be reserved."
                )

        # Check if properties are already reserved
        for property_node in valid_properties:
            existing_reservation = PropertyReservation.objects.filter(
                properties=property_node,
                status__in=["pending", "confirmed"],
                is_deleted=False,
            ).first()

            if existing_reservation:
                raise ValidationError(
                    f"Property '{property_node.name}' is already reserved by "
                    f"{existing_reservation.owner.get_full_name()}. "
                    f"Please choose a different property or wait for the "
                    f"current reservation to expire."
                )

        return value

    def validate_owner_id(self, value):
        """Validate that the owner exists and has the correct type"""
        try:
            Users.objects.get(
                id=value,
                type__in=["owner", "company"],
                is_deleted=False,
            )
        except Users.DoesNotExist:
            raise ValidationError(
                f"Owner with ID '{value}' was not found or is not a valid "
                f"owner type. Only users with 'owner' or 'company' type can "
                f"make reservations."
            )
        return value

    def validate_end_date(self, value):
        """Validate that end date is in the future"""
        if value <= timezone.now().date():
            raise ValidationError(
                "End date must be in the future. "
                "Please select a date that is at least tomorrow."
            )
        return value

    def validate_deposit_fee(self, value):
        """Validate deposit fee is positive if provided"""
        if value is not None and value <= 0:
            raise ValidationError(
                "Deposit fee must be greater than 0 if provided. "
                "Leave empty if no deposit fee is required."
            )
        return value

    def validate(self, data):
        """Cross-field validation"""
        # Check if we have the required custom fields
        if "property_ids" not in data:
            raise ValidationError("property_ids is required")

        if "owner_id" not in data:
            raise ValidationError("owner_id is required")

        return data

    def create(self, validated_data):
        """Create a new property reservation"""
        # Extract custom fields
        property_ids = validated_data.pop("property_ids")
        owner_id = validated_data.pop("owner_id")

        # Get the owner
        owner = Users.objects.get(id=owner_id)

        # Create the reservation with owner
        reservation = PropertyReservation.objects.create(
            owner=owner,
            **validated_data,
        )

        # Add properties to the reservation
        properties = LocationNode.objects.filter(id__in=property_ids)
        reservation.properties.set(properties)

        return reservation
