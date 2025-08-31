"""
OTP generation and email sending utilities.

This module provides functions for generating OTP codes and sending them via email
using the email utilities.
"""

from rest_framework import status
from rest_framework.response import Response

from otp.models import AdvancedOTPDevice
from utils.email_utils import (
    send_email_verification_with_otp,
    send_otp_verification_email,
    send_password_reset_otp_email,
)


class OTPService:
    """Service class for handling OTP operations."""

    def __init__(self, device_name: str = "sms_otp_device"):
        self.device_name = device_name

    def _get_or_create_device(self, user):
        """Get or create OTP device for user."""
        return AdvancedOTPDevice.objects.get_or_create(user=user, name=self.device_name)

    def _handle_otp_error(self, result, user, page_name: str):
        """Handle OTP generation errors."""
        resp = {
            "error": True,
            "message": result["message"],
            "page": page_name,
            "email": user.email,
        }
        if "retry_after" in result:
            resp["retry_after"] = result["retry_after"]
        if "remaining" in result:
            resp["remaining"] = result["remaining"]
        return Response(resp, status=result["status_code"])

    def _handle_email_failure(self, user, otp_code, expiry_minutes, page_name: str):
        return {
            "error": True,
            "otp_required": True,
            "message": "OTP generated successfully. Check your email.",
            "email": user.email,
            "debug_otp": otp_code,  # Remove this in production
            "email_service": "SendGrid temporarily unavailable",
        }

    def _handle_email_exception(self, user, otp_code, expiry_minutes, error):
        """Handle email sending exceptions."""
        print(f"❌ Error sending OTP email: {str(error)}")
        print(f"📧 OTP Code for {user.email}: {otp_code}")
        print(f"⏰ Expires in: {expiry_minutes} minutes")
        print(f"🔧 SendGrid service error: {type(error).__name__}")

        return {
            "error": True,
            "otp_required": True,
            "message": "OTP generated successfully. Check your email.",
            "email": user.email,
            "debug_otp": otp_code,  # Remove this in production
            "email_service": "SendGrid error",
        }

    def generate_and_send_otp(
        self, user, expiry_minutes: int = 5, page_name: str = "Verify OTP"
    ):
        """
        Generate OTP and send via email.

        Args:
            user: User object
            expiry_minutes: OTP expiry time in minutes
            page_name: Page name for error responses

        Returns:
            Response: HTTP response with OTP status
        """
        device, _ = self._get_or_create_device(user)

        # Generate OTP
        result = device.generate_token()

        # Handle generation errors
        if result["error"]:
            return self._handle_otp_error(result, user, page_name)

        # OTP generated successfully
        otp_code = result["otp_code"]

        # Send OTP via email
        try:
            # Use different email templates based on page_name
            if page_name == "Verify Email":
                email_sent = send_email_verification_with_otp(
                    recipient_email=user.email,
                    user_name=user.get_full_name() or user.username,
                    otp_code=otp_code,
                    expiry_minutes=expiry_minutes,
                )
            else:
                email_sent = send_otp_verification_email(
                    recipient_email=user.email,
                    user_name=user.get_full_name() or user.username,
                    otp_code=otp_code,
                    expiry_minutes=expiry_minutes,
                )

            if email_sent:
                # Email sent successfully
                return Response(
                    {
                        "error": True,
                        "otp_required": True,
                        "message": "OTP sent successfully to your email.",
                        "email": user.email,
                        "next_request_in": result.get("next_request_in"),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                # Email failed but OTP was generated
                response_data = self._handle_email_failure(
                    user, otp_code, expiry_minutes, page_name
                )
                response_data["next_request_in"] = result.get("next_request_in")
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # Exception occurred during email sending
            response_data = self._handle_email_exception(
                user, otp_code, expiry_minutes, e
            )
            response_data["next_request_in"] = result.get("next_request_in")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)


# Global OTP service instance
otp_service = OTPService()


# Convenience functions for backward compatibility
def otp_generator(user):
    """
    Generate OTP and send via email (legacy function).

    Args:
        user: User object

    Returns:
        Response: HTTP response with OTP status
    """
    return otp_service.generate_and_send_otp(
        user, expiry_minutes=5, page_name="Verify OTP"
    )


def email_otp_generator(user, message="OTP sent successfully to your email."):
    """
    Generate OTP for email verification using send_email_verification_with_otp.

    Args:
        user: User object
        message: Success message

    Returns:
        Response: HTTP response with OTP status
    """
    device, _ = otp_service._get_or_create_device(user)

    # Generate OTP
    result = device.generate_token()

    # Handle generation errors
    if result["error"]:
        return otp_service._handle_otp_error(result, user, "Verify Email")

    # OTP generated successfully
    otp_code = result["otp_code"]
    expiry_minutes = 5  # Use 5 minutes for email verification

    # Send OTP via email using send_email_verification_with_otp
    try:
        email_sent = send_email_verification_with_otp(
            recipient_email=user.email,
            user_name=user.get_full_name() or user.username,
            otp_code=otp_code,
            expiry_minutes=expiry_minutes,
        )

        if email_sent:
            # Email sent successfully
            return Response(
                {
                    "error": True,
                    "otp_required": True,
                    "message": message,
                    "email": user.email,
                    "email_verified": False,
                    "next_request_in": result.get("next_request_in"),
                },
                status=status.HTTP_200_OK,
            )
        else:
            # Email failed but OTP was generated
            response_data = otp_service._handle_email_failure(
                user, otp_code, expiry_minutes, "Verify Email"
            )
            response_data["next_request_in"] = result.get("next_request_in")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        # Exception occurred during email sending
        response_data = otp_service._handle_email_exception(
            user, otp_code, expiry_minutes, e
        )
        response_data["next_request_in"] = result.get("next_request_in")
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)


def password_reset_otp_generator(user):
    """
    Generate OTP for password reset and send via email.

    Args:
        user: User object

    Returns:
        Response: HTTP response with OTP status
    """
    device, _ = otp_service._get_or_create_device(user)

    # Generate OTP
    result = device.generate_token()

    # Handle generation errors
    if result["error"]:
        return otp_service._handle_otp_error(result, user, "Password Reset OTP")

    # OTP generated successfully
    otp_code = result["otp_code"]
    expiry_minutes = 5  # Use 5 minutes for password reset

    try:
        email_sent = send_password_reset_otp_email(
            recipient_email=user.email,
            user_name=user.get_full_name() or user.username,
            otp_code=otp_code,
            expiry_minutes=expiry_minutes,
        )
        if email_sent:
            # Set Redis timer for OTP resend functionality
            from django_redis import get_redis_connection

            redis_client = get_redis_connection("default")
            timer_key = f"password-reset:{user.email}"
            next_request_in = result.get("next_request_in", 60)  # Default to 60 seconds
            redis_client.setex(timer_key, next_request_in, "pending")

            return Response(
                {
                    "error": True,
                    "otp_required": True,
                    "message": "Password reset OTP sent successfully to your email.",
                    "email": user.email,
                    "next_request_in": result.get("next_request_in"),
                },
                status=status.HTTP_200_OK,
            )
        else:
            response_data = otp_service._handle_email_failure(
                user, otp_code, expiry_minutes, "Password Reset OTP"
            )
            response_data["next_request_in"] = result.get("next_request_in")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        response_data = otp_service._handle_email_exception(
            user, otp_code, expiry_minutes, e
        )
        response_data["next_request_in"] = result.get("next_request_in")
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
