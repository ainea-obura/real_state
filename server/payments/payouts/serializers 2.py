from rest_framework import serializers
from payments.models import Payout
from accounts.models import Users
from payments.payouts.utils import (
    get_full_management_properties_for_owner,
    get_owner_uncollected_rent,
    get_expected_rent_for_property,
)
from utils.currency import get_serialized_default_currency
import datetime
from utils.format import format_price, format_money_with_currency


class PayoutSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField()
    property_node = serializers.StringRelatedField()
    currency = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_phone = serializers.SerializerMethodField()
    total_properties = serializers.SerializerMethodField()
    uncollected_rent = serializers.SerializerMethodField()
    expected_rent = serializers.SerializerMethodField()
    rent_collected = serializers.SerializerMethodField()
    services_expenses = serializers.SerializerMethodField()
    management_fee = serializers.SerializerMethodField()
    net_amount = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()

    class Meta:
        model = Payout
        fields = [
            "id",
            "owner",
            "property_node",
            "currency",
            "owner_name",
            "total_properties",
            "uncollected_rent",
            "expected_rent",
            "rent_collected",
            "services_expenses",
            "management_fee",
            "net_amount",
            "created_at",
            "updated_at",
            "is_deleted",
            "payout_number",
            "payout_date",
            "month",
            "year",
            "status",
            "notes",
            "approved_by",
            "owner_phone",
            "amount",
        ]

    def get_currency(self, obj):
        if obj.currency:
            return str(obj.currency)
        return get_serialized_default_currency()

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() if obj.owner else None

    def get_owner_phone(self, obj):
        return obj.owner.phone if obj.owner else None

    def get_total_properties(self, obj):
        if obj.owner:
            return len(get_full_management_properties_for_owner(obj.owner))
        return 0

    def get_uncollected_rent(self, obj):
        if obj.owner and obj.month and obj.year:
            return format_money_with_currency(
                get_owner_uncollected_rent(obj.owner, obj.month, obj.year)
            )
        return format_money_with_currency(0)

    def get_expected_rent(self, obj):
        if obj.property_node and obj.month and obj.year:
            period_start = datetime.date(obj.year, obj.month, 1)
            if obj.month == 12:
                period_end = datetime.date(obj.year + 1, 1, 1) - datetime.timedelta(
                    days=1
                )
            else:
                period_end = datetime.date(
                    obj.year, obj.month + 1, 1
                ) - datetime.timedelta(days=1)
            total_expected = get_expected_rent_for_property(
                obj.property_node, period_start, period_end
            )
            return format_money_with_currency(total_expected)
        return format_money_with_currency(0)

    def get_rent_collected(self, obj):
        return format_money_with_currency(getattr(obj, "rent_collected", 0))

    def get_services_expenses(self, obj):
        return format_money_with_currency(getattr(obj, "services_expenses", 0))

    def get_management_fee(self, obj):
        return format_money_with_currency(getattr(obj, "management_fee", 0))

    def get_net_amount(self, obj):
        return format_money_with_currency(getattr(obj, "net_amount", 0))

    def get_amount(self, obj):
        return getattr(obj, "net_amount", 0)

    def get_approved_by(self, obj):
        if obj.approved_by and hasattr(obj.approved_by, "email"):
            return obj.approved_by.email
        return None


class PayoutStatusUpdateSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField(required=False, allow_blank=True)
    account = serializers.CharField(required=False, allow_blank=True)
    tab = serializers.CharField(required=False, allow_blank=True)
    reference = serializers.CharField(required=False, allow_blank=True)
    paybill_number = serializers.CharField(required=False, allow_blank=True)
    paybill_option = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Payout
        fields = [
            "status",
            "payment_method",
            "account",
            "tab",
            "reference",
            "paybill_number",
            "paybill_option",
            "amount",
        ]

    def validate_status(self, value):
        if value != "completed":
            raise serializers.ValidationError("Status can only be set to 'completed'.")
        return value
