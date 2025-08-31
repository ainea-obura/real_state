from django.contrib.auth.hashers import check_password
from rest_framework import serializers

from accounts.models import Users


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing user password.
    Validates current password and ensures new password meets requirements.
    """

    current_password = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Current password to verify user identity",
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        help_text="New password (minimum 8 characters)",
    )
    confirm_password = serializers.CharField(
        required=True, write_only=True, help_text="Confirm new password"
    )

    def validate_current_password(self, value):
        """
        Validate that the current password is correct.
        """
        user = self.context.get("user")
        if not user:
            raise serializers.ValidationError("User context is required.")

        if not check_password(value, user.password):
            raise serializers.ValidationError("Current password is incorrect.")

        return value

    def validate_new_password(self, value):
        """
        Validate new password requirements.
        """
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters long."
            )

        # Check for at least one uppercase letter
        if not any(char.isupper() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )

        # Check for at least one lowercase letter
        if not any(char.islower() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )

        # Check for at least one digit
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        # Check for at least one special character
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(char in special_chars for char in value):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )

        return value

    def validate(self, attrs):
        """
        Validate that new password and confirm password match.
        """
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": "New password and confirm password do not match."}
            )

        # Check that new password is different from current password
        current_password = attrs.get("current_password")
        if new_password == current_password:
            raise serializers.ValidationError(
                {
                    "new_password": "New password must be different from current password."
                }
            )

        return attrs


class PasswordChangeResponseSerializer(serializers.Serializer):
    """
    Serializer for password change response.
    """

    message = serializers.CharField()
    user_id = serializers.UUIDField()
    email = serializers.EmailField()
    changed_at = serializers.DateTimeField()
