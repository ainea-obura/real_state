from rest_framework import serializers

from accounts.models import Position
from utils.format import RobustDateTimeField


class PositionSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Position model.
    Used for listing and basic CRUD operations.
    """

    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    modified_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "name",
            "description",
            "is_deleted",
            "created_at",
            "modified_at",
        ]
        read_only_fields = ["id", "created_at", "modified_at"]


class PositionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new positions.
    """

    created_at = RobustDateTimeField(read_only=True)
    modified_at = RobustDateTimeField(read_only=True)

    class Meta:
        model = Position
        fields = ["name", "description", "created_at", "modified_at"]

    def validate_name(self, value):
        """
        Validate that position name is unique and not empty.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Position name is required.")

        # Check for duplicate names (case-insensitive)
        if Position.objects.filter(
            name__iexact=value.strip(), is_deleted=False
        ).exists():
            raise serializers.ValidationError(
                "A position with this name already exists."
            )

        return value.strip()


class PositionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing positions.
    """

    class Meta:
        model = Position
        fields = ["name", "description"]

    def validate_name(self, value):
        """
        Validate that position name is unique (excluding current instance).
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Position name is required.")

        # Get the current instance
        instance = self.instance
        if instance:
            # Check for duplicate names excluding current instance
            if (
                Position.objects.filter(name__iexact=value.strip(), is_deleted=False)
                .exclude(id=instance.id)
                .exists()
            ):
                raise serializers.ValidationError(
                    "A position with this name already exists."
                )
        else:
            # For new instances, check for any duplicates
            if Position.objects.filter(
                name__iexact=value.strip(), is_deleted=False
            ).exists():
                raise serializers.ValidationError(
                    "A position with this name already exists."
                )

        return value.strip()

    def validate_description(self, value):
        """
        Validate description (optional field).
        """
        if value is None or value == "":
            return ""  # Allow empty description
        return value.strip()


class PositionTableItemSerializer(serializers.ModelSerializer):
    """
    Serializer for position table items.
    Matches the frontend PositionTableItem schema.
    """

    created_at = serializers.SerializerMethodField()
    modified_at = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = [
            "id",
            "name",
            "description",
            "is_deleted",
            "created_at",
            "modified_at",
        ]

    def get_created_at(self, obj):
        """Format created_at as ISO string"""
        return obj.created_at.isoformat() if obj.created_at else None

    def get_modified_at(self, obj):
        """Format modified_at as ISO string"""
        return obj.modified_at.isoformat() if obj.modified_at else None


class PositionStatsSerializer(serializers.Serializer):
    """
    Serializer for position statistics.
    """

    total_positions = serializers.IntegerField()
    active_positions = serializers.IntegerField()
    deleted_positions = serializers.IntegerField()
    positions_with_staff = serializers.IntegerField()


class PositionListResponseSerializer(serializers.Serializer):
    """
    Serializer for position list response.
    """

    count = serializers.IntegerField()
    results = PositionTableItemSerializer(many=True)
