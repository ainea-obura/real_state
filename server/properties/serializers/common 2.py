import re

from rest_framework import serializers

from properties.models import LocationNode, RoomDetail, UnitDetail
from properties.models import VillaDetail
from utils.format import format_money_with_currency


class ServiceChargeField(serializers.ReadOnlyField):
    def to_representation(self, value):
        if value is None:
            return None
        return format_money_with_currency(value)


class LocationNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "parent",
            "property_type",
            "created_at",
            "updated_at",
            "is_deleted",
        ]


class BlockCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1)
    floors = serializers.IntegerField(min_value=0, max_value=100)


class BasementCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1)
    slots = serializers.IntegerField(min_value=0, max_value=100)


def natural_keys(text):
    # Helper for natural sorting (e.g., Block 2 < Block 10)
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r"(\d+)", text)]


class LocationNodeTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    apartment_details = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    villa_detail = serializers.SerializerMethodField()
    room_details = serializers.SerializerMethodField()

    class Meta:
        model = LocationNode
        fields = [
            "id",
            "name",
            "node_type",
            "parent",
            "children",
            "apartment_details",
            "villa_detail",
            "room_details",
        ]

    def get_children(self, obj):
        children = list(obj.children.all())
        children.sort(key=lambda x: natural_keys(x.name))
        return LocationNodeTreeSerializer(children, many=True).data

    def get_apartment_details(self, obj):
        """Include ApartmentDetail information when node_type is UNIT"""
        if obj.node_type == "UNIT":
            try:
                unit_detail = obj.unit_detail
                return ApartmentDetailSerializer(unit_detail).data
            except UnitDetail.DoesNotExist:
                return None
        return None

    def get_villa_detail(self, obj):
        """Include VillaDetail information when node_type is HOUSE"""
        if obj.node_type == "HOUSE":
            try:
                villa_detail = obj.villa_detail
                return VillaDetailSerializer(villa_detail).data
            except VillaDetail.DoesNotExist:
                return None
        return None

    def get_room_details(self, obj):
        """Include RoomDetail information when node_type is ROOM"""
        if obj.node_type == "ROOM":
            try:
                room_detail = obj.room_detail
                return RoomDetailSerializer(room_detail).data
            except RoomDetail.DoesNotExist:
                return None
        return None

    def get_name(self, obj):
        """Return 'Ground Floor' for 'Floor 0', otherwise return the original name"""
        if obj.node_type == "FLOOR" and obj.name == "Floor 0":
            return "Ground Floor"
        return obj.name


class HouseCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1)
    floors = serializers.IntegerField(min_value=0, max_value=100)
    management_mode = serializers.ChoiceField(
        choices=[
            ("FULL_MANAGEMENT", "Full Management"),
            ("SERVICE_ONLY", "Service Only"),
        ]
    )
    service_charge = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )


class ApartmentDetailSerializer(serializers.ModelSerializer):
    UNIT_TYPE_CHOICES = [
        ("1 Bedroom", "1 Bedroom"),
        ("2 Bedroom", "2 Bedroom"),
        ("3 Bedroom", "3 Bedroom"),
        ("4 Bedroom", "4 Bedroom"),
        ("5 Bedroom", "5 Bedroom"),
        ("6 Bedroom", "6 Bedroom"),
    ]

    unit_type = serializers.ChoiceField(
        choices=UNIT_TYPE_CHOICES, required=False, allow_null=True
    )
    service_charge = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    custom_service_charge = serializers.SerializerMethodField()

    class Meta:
        model = UnitDetail
        fields = [
            "management_mode",
            "status",
            "identifier",
            "size",
            "sale_price",
            "rental_price",
            "description",
            "management_status",
            "currency",
            "unit_type",
            "service_charge",
            "custom_service_charge",
        ]

    currency = serializers.PrimaryKeyRelatedField(
        queryset=UnitDetail._meta.get_field("currency").related_model.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, data):
        """
        Custom validation to make currency and unit_type required only for FULL_MANAGEMENT mode
        """
        management_mode = data.get("management_mode")
        currency = data.get("currency")
        unit_type = data.get("unit_type")

        errors = {}
        if management_mode == "FULL_MANAGEMENT":
            if not currency:
                errors["currency"] = (
                    "Currency is required when management mode is FULL_MANAGEMENT"
                )
            if not unit_type:
                errors["unit_type"] = (
                    "Unit type is required when management mode is FULL_MANAGEMENT"
                )
        if errors:
            raise serializers.ValidationError(errors)

        return data

    def get_custom_service_charge(self, obj):
        return format_money_with_currency(obj.service_charge)


class ApartmentCreateSerializer(serializers.Serializer):
    block = serializers.UUIDField()
    floor = serializers.UUIDField()
    apartment = ApartmentDetailSerializer(source="unit")


class RoomDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomDetail
        fields = [
            "room_type",
            "size",
            "description",
        ]


class RoomCreateSerializer(serializers.Serializer):
    # Common fields
    floor = serializers.UUIDField()
    room = RoomDetailSerializer()

    # Apartment-specific fields (optional)
    block = serializers.UUIDField(required=False, allow_null=True)
    apartment = serializers.UUIDField(required=False, allow_null=True)

    # House-specific fields (optional)
    house = serializers.UUIDField(required=False, allow_null=True)


class BlockEditSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1)
    floors = serializers.IntegerField(min_value=0, max_value=100)


class VillaEditSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1)
    floors = serializers.IntegerField(min_value=0, max_value=100)
    management_mode = serializers.ChoiceField(
        choices=[
            ("SERVICE_ONLY", "Service Only"),
            ("FULL_MANAGEMENT", "Full Management"),
        ],
        required=False,
    )
    service_charge = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    custom_service_charge = serializers.SerializerMethodField()

    def get_custom_service_charge(self, obj):
        return format_money_with_currency(obj.service_charge)


class ApartmentEditSerializer(serializers.Serializer):
    block = serializers.UUIDField()
    floor = serializers.UUIDField()
    apartment = ApartmentDetailSerializer()


class RoomEditSerializer(serializers.Serializer):
    floor = serializers.UUIDField()
    room = RoomDetailSerializer()
    # Apartment-specific fields (optional)
    block = serializers.UUIDField(required=False, allow_null=True)
    apartment = serializers.UUIDField(required=False, allow_null=True)
    # House-specific fields (optional)
    house = serializers.UUIDField(required=False, allow_null=True)


class NodeDeleteSerializer(serializers.Serializer):
    node_type = serializers.CharField()
    id = serializers.UUIDField()


class VillaDetailSerializer(serializers.ModelSerializer):
    custom_service_charge = serializers.SerializerMethodField()

    class Meta:
        model = VillaDetail
        fields = [
            "management_mode",
            "name",
            "service_charge",
            "custom_service_charge"
        ]

    def get_custom_service_charge(self, obj):
        return format_money_with_currency(obj.service_charge)
