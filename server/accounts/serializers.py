from django.core.exceptions import ValidationError
from rest_framework import serializers

from company.models import Branch, Company, Owner
from utils.image_validator import validate_image
from utils.validate import validate_email

from .models import Country, City
from accounts.models import Users, Account
from utils.format import RobustDateTimeField


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class TokenRefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=True)


class SignupSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


# Geo Serializers
class CountryListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing countries with only id and name.
    """

    class Meta:
        model = Country
        fields = ["id", "name"]


class CityListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing cities with id, name, and country_id.
    """

    country_id = serializers.UUIDField(source="country.id", read_only=True)

    class Meta:
        model = City
        fields = ["id", "name", "country_id"]


class AccountSerializer(serializers.ModelSerializer):
    """
    Serializer for Account model - used for listing accounts
    """
    created_at = RobustDateTimeField()
    updated_at = RobustDateTimeField()

    class Meta:
        model = Account
        fields = [
            "id",
            "user",
            "account_name",
            "account_code",
            "account_number",
            "account_type",
            "bank_name",
            "is_default",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AccountCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new accounts
    """
    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Account
        fields = [
            "user_id",
            "account_name",
            "account_code",
            "account_number",
            "account_type",
            "bank_name",
            "is_default",
            "is_active",
        ]

    def validate(self, attrs):
        # Check for duplicate accounts for the same user
        user_id = attrs.get('user_id')
        account_number = attrs.get('account_number')
        account_type = attrs.get('account_type')
        bank_name = attrs.get('bank_name')

        if Account.objects.filter(
            user_id=user_id,
            account_number=account_number,
            account_type=account_type,
            bank_name=bank_name,
            is_active=True
        ).exists():
            raise serializers.ValidationError(
                "An account with this number and provider already exists for this user."
            )

        return attrs


class AccountUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing accounts
    """
    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Account
        fields = [
            "user_id",
            "account_name",
            "account_code",
            "account_number",
            "account_type",
            "bank_name",
            "is_default",
            "is_active",
        ]

    def validate(self, attrs):
        # Check for duplicate accounts for the same user (excluding current instance)
        user_id = attrs.get('user_id')
        account_number = attrs.get('account_number')
        account_type = attrs.get('account_type')
        bank_name = attrs.get('bank_name')
        instance = self.instance

        if Account.objects.filter(
            user_id=user_id,
            account_number=account_number,
            account_type=account_type,
            bank_name=bank_name,
            is_active=True
        ).exclude(id=instance.id if instance else None).exists():
            raise serializers.ValidationError(
                "An account with this number and provider already exists for this user."
            )

        return attrs
