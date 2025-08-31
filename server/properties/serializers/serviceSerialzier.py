from rest_framework import serializers
from decimal import Decimal
from properties.models import Service


class ServiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Service model with conditional validation
    """

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "pricing_type",
            "base_price",
            "percentage_rate",
            "frequency",
            "billed_to",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_active"]

    def validate(self, data):
        """
        Custom validation for conditional pricing fields
        """
        pricing_type = data.get("pricing_type")

        if pricing_type == "FIXED":
            base_price = data.get("base_price")
            if not base_price or float(base_price) <= 0:
                raise serializers.ValidationError(
                    {
                        "base_price": "Base price is required and must be greater than 0 for fixed pricing."
                    }
                )

        elif pricing_type == "PERCENTAGE":
            percentage_rate = data.get("percentage_rate")
            if not percentage_rate or float(percentage_rate) <= 0:
                raise serializers.ValidationError(
                    {
                        "percentage_rate": "Percentage rate is required and must be greater than 0 for percentage pricing."
                    }
                )
            if float(percentage_rate) > 100:
                raise serializers.ValidationError(
                    {"percentage_rate": "Percentage rate cannot exceed 100%."}
                )

        # VARIABLE pricing doesn't require any price fields
        elif pricing_type == "VARIABLE":
            # Clear any price fields for variable services
            data.pop("base_price", None)
            data.pop("percentage_rate", None)

        return data

    def to_representation(self, instance):
        """
        Custom representation to handle decimal fields properly
        """
        data = super().to_representation(instance)

        # Convert Decimal to string for JSON serialization
        if instance.base_price:
            data["base_price"] = str(instance.base_price)
        if instance.percentage_rate:
            data["percentage_rate"] = str(instance.percentage_rate)

        return data


class ServiceCreateSerializer(ServiceSerializer):
    """
    Serializer for creating new services
    """

    class Meta(ServiceSerializer.Meta):
        fields = [
            "id",
            "name",
            "description",
            "pricing_type",
            "base_price",
            "percentage_rate",
            "frequency",
            "billed_to",
            "currency",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        """
        Create service with proper field handling
        """
        # Convert string values to Decimal for price fields
        if "base_price" in validated_data and validated_data["base_price"]:
            validated_data["base_price"] = Decimal(str(validated_data["base_price"]))

        if "percentage_rate" in validated_data and validated_data["percentage_rate"]:
            validated_data["percentage_rate"] = Decimal(
                str(validated_data["percentage_rate"])
            )

        return super().create(validated_data)


class ServiceUpdateSerializer(ServiceSerializer):
    """
    Serializer for updating existing services
    """

    class Meta(ServiceSerializer.Meta):
        fields = [
            "id",
            "name",
            "description",
            "pricing_type",
            "base_price",
            "percentage_rate",
            "frequency",
            "billed_to",
            "currency",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        data = super().validate(data)
        pricing_type = data.get("pricing_type")
        currency = data.get("currency")
        # Currency is required for all except VARIABLE
        if pricing_type != "VARIABLE" and not currency:
            raise serializers.ValidationError({"currency": "Currency is required for this pricing type."})
        # If VARIABLE, currency is optional (do nothing)
        return data

    def update(self, instance, validated_data):
        """
        Update service with proper field handling
        """
        # Convert string values to Decimal for price fields
        if "base_price" in validated_data and validated_data["base_price"]:
            validated_data["base_price"] = Decimal(str(validated_data["base_price"]))

        if "percentage_rate" in validated_data and validated_data["percentage_rate"]:
            validated_data["percentage_rate"] = Decimal(
                str(validated_data["percentage_rate"])
            )

        return super().update(instance, validated_data)


class ServiceListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing services with only required fields
    """

    # Calculate total properties using this service
    total_properties = serializers.SerializerMethodField()

    code = serializers.SerializerMethodField()
    symbol = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "pricing_type",
            "base_price",
            "percentage_rate",
            "frequency",
            "billed_to",
            "currency",
            "code",
            "symbol",
            "is_active",
            "created_at",
            "total_properties",
        ]
        read_only_fields = ["id", "created_at", "total_properties"]

    def get_code(self, obj):
        return obj.currency.code if obj.currency else ""

    def get_symbol(self, obj):
        return obj.currency.symbol if obj.currency else ""

    def get_currency(self, obj):
        return str(obj.currency.id) if obj.currency else ""

    def get_total_properties(self, obj):
        """Count total properties using this service"""
        from properties.models import PropertyService

        return PropertyService.objects.filter(
            service=obj, status="ACTIVE", is_deleted=False
        ).count()

    def to_representation(self, instance):
        """
        Custom representation to handle decimal fields properly
        """
        data = super().to_representation(instance)

        # Convert Decimal to string for JSON serialization
        if instance.base_price:
            data["base_price"] = str(instance.base_price)
        if instance.percentage_rate:
            data["percentage_rate"] = str(instance.percentage_rate)

        return data
