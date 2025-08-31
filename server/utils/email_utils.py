"""
Email utilities for sending HTML emails using SendGrid.

This module provides a clean, modular interface for sending various types of emails
using HTML templates and SendGrid API.
"""

import os

from pathlib import Path
from typing import Any, Dict, Optional

from django.conf import settings
from django.template import Context, Template
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = "no-reply@hoyhub.net"  # Use your verified sender
TEMPLATES_DIR = Path(__file__).parent / "email_templates"


class EmailService:
    """Service class for handling email operations."""

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None):
        self.api_key = api_key or SENDGRID_API_KEY

        # Fix: Properly set the from_email with multiple fallbacks
        if from_email:
            self.from_email = from_email
        elif hasattr(settings, "DEFAULT_FROM_EMAIL") and settings.DEFAULT_FROM_EMAIL:
            self.from_email = settings.DEFAULT_FROM_EMAIL
        else:
            self.from_email = DEFAULT_FROM_EMAIL

        # Debug: Print what from_email is being used
        print(f"DEBUG: EmailService initialized with from_email: {self.from_email}")

    def _load_template(self, template_name: str) -> str:
        """Load HTML template from file."""
        template_path = TEMPLATES_DIR / template_name

        if not template_path.exists():
            raise FileNotFoundError(
                f"Template {template_name} not found in {TEMPLATES_DIR}"
            )

        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()

    def _render_template(self, template_content: str, context: Dict[str, Any]) -> str:
        """Render template with context using Django template engine."""
        template = Template(template_content)
        context_obj = Context(context)
        return template.render(context_obj)

    def _send_email(
        self,
        recipient_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
    ) -> bool:
        """Send email using SendGrid API."""
        if not self.api_key:
            print("ERROR: SENDGRID_API_KEY not found in environment variables")
            return False

        # Fix: Ensure from_email is never None
        final_from_email = from_email or self.from_email or DEFAULT_FROM_EMAIL

        if not final_from_email:
            print("ERROR: No from_email address available")
            return False

        try:
            # Debug information
            print(f"DEBUG: Sending email from {final_from_email} to {recipient_email}")
            print(f"DEBUG: Subject: {subject}")
            print(f"DEBUG: HTML content length: {len(html_content)} characters")
            print(f"DEBUG: API key length: {len(self.api_key) if self.api_key else 0}")

            message = Mail(
                from_email=final_from_email,
                to_emails=recipient_email,
                subject=subject,
                html_content=html_content,
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            print(f"DEBUG: Response status code: {response.status_code}")
            print(f"DEBUG: Response body: {response.body}")

            if response.status_code in [200, 201, 202]:
                print(f"SUCCESS: Email sent successfully to {recipient_email}")
                return True
            else:
                print(f"SendGrid API error: {response.status_code} - {response.body}")
                return False

        except Exception as e:
            print(f"Error sending email via SendGrid: {str(e)}")
            print(f"Error type: {type(e).__name__}")

            # Handle specific SendGrid errors
            if hasattr(e, "body"):
                print(f"SendGrid error body: {e.body}")
            if hasattr(e, "status_code"):
                print(f"SendGrid error status code: {e.status_code}")
            if hasattr(e, "headers"):
                print(f"SendGrid error headers: {e.headers}")

            if "nodename nor servname provided" in str(e) or "URLError" in str(
                type(e).__name__
            ):
                print("Network connectivity issue with SendGrid. Please check:")
                print("1. Internet connection")
                print("2. SendGrid API key is valid")
                print("3. SendGrid service is accessible")
            elif "400" in str(e) or "Bad Request" in str(e):
                print("SendGrid 400 Bad Request - Common causes:")
                print("1. Invalid sender email (not verified in SendGrid)")
                print("2. Invalid recipient email format")
                print("3. Missing or invalid API key")
                print("4. Sender domain not authenticated")
                print("5. Account suspended or rate limited")
                print(f"6. from_email is None or empty (current: {final_from_email})")

            return False

    def send_template_email(
        self,
        recipient_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any] = None,
        from_email: Optional[str] = None,
    ) -> bool:
        """
        Send an email using a specific HTML template.

        Args:
            recipient_email: Target email address
            subject: Email subject
            template_name: Name of the template file (e.g., 'welcome.html')
            context: Context variables for template rendering
            from_email: Sender email address (optional)

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            context = context or {}

            # Load and render template
            template_content = self._load_template(template_name)
            html_content = self._render_template(template_content, context)

            # Send email
            return self._send_email(recipient_email, subject, html_content, from_email)

        except Exception as e:
            print(f"Error sending template email: {str(e)}")
            return False


# Global email service instance - initialize with explicit from_email
email_service = EmailService(from_email=DEFAULT_FROM_EMAIL)



def send_password_reset_otp_email(
    recipient_email: str, user_name: str, otp_code: str, expiry_minutes: int = 5
) -> bool:
    """Send password reset OTP email using the password_reset.html template (forgot password)."""
    context = {
        "user_name": user_name,
        "otp_code": otp_code,
        "expiry_minutes": expiry_minutes,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Reset Your Password (OTP) - HoyHub",
        template_name="password_reset.html",
        context=context,
    )

# Convenience functions for specific email types
def send_welcome_email(
    recipient_email: str,
    user_name: str,
    verification_url: str = None,
    user_email: str = None,
    user_password: str = None,
) -> bool:
    """
    Send welcome email using the welcome.html template.

    Args:
        recipient_email: Target email address
        user_name: User's name
        verification_url: Email verification URL (optional)
        user_email: User's email (optional, defaults to recipient_email)
        user_password: User's password (optional, shows security reminder if provided)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    context = {
        "user_name": user_name,
        "verification_url": verification_url or "#",
        "recipient_email": recipient_email,
        "user_email": user_email or recipient_email,
        "user_password": user_password,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Welcome to HoyHub - Your Real Estate Management Platform",
        template_name="welcome.html",
        context=context,
    )


def send_otp_verification_email(
    recipient_email: str, user_name: str, otp_code: str, expiry_minutes: int = 5
) -> bool:
    """Send OTP verification email using the verify_otp.html template."""
    context = {
        "user_name": user_name,
        "otp_code": otp_code,
        "expiry_minutes": expiry_minutes,
        "verification_url": "#",
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Verify Your OTP",
        template_name="verify_otp.html",
        context=context,
    )


def send_password_reset_email(
    recipient_email: str, user_name: str, reset_url: str
) -> bool:
    """Send password reset email using the password_reset.html template."""
    context = {
        "user_name": user_name,
        "reset_url": reset_url,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Reset Your Password - HoyHub",
        template_name="password_reset.html",
        context=context,
    )





def send_email_verification_email(
    recipient_email: str, user_name: str, verification_url: str
) -> bool:
    """Send email verification using the email_verification.html template."""
    context = {
        "user_name": user_name,
        "verification_url": verification_url,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Verify Your Email Address - HoyHub",
        template_name="email_verification.html",
        context=context,
    )


def send_email_verification_with_otp(
    recipient_email: str, user_name: str, otp_code: str, expiry_minutes: int = 5
) -> bool:
    """
    Send email verification with OTP using the email_verification.html template.

    Args:
        recipient_email: Target email address
        user_name: User's name
        otp_code: OTP verification code
        expiry_minutes: OTP expiry time in minutes (default: 5)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    context = {
        "user_name": user_name,
        "otp_code": otp_code,
        "expiry_minutes": expiry_minutes,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Verify Your Email Address",
        template_name="email_verification.html",
        context=context,
    )


def send_rent_reminder_email(
    recipient_email: str,
    tenant_name: str,
    property_name: str,
    amount: str,
    due_date: str,
) -> bool:
    """Send rent reminder email using the rent_reminder.html template."""
    context = {
        "tenant_name": tenant_name,
        "property_name": property_name,
        "amount": amount,
        "due_date": due_date,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject=f"Rent Reminder - {property_name}",
        template_name="rent_reminder.html",
        context=context,
    )


def send_maintenance_update_email(
    recipient_email: str,
    user_name: str,
    property_name: str,
    maintenance_id: str,
    status: str,
) -> bool:
    """Send maintenance update email using the maintenance_update.html template."""
    context = {
        "user_name": user_name,
        "property_name": property_name,
        "maintenance_id": maintenance_id,
        "status": status,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject=f"Maintenance Update - {property_name}",
        template_name="maintenance_update.html",
        context=context,
    )


def send_invoice_notification_email(
    recipient_email: str,
    recipient_name: str,
    invoice_number: str,
    amount: str,
    due_date: str,
) -> bool:
    """Send invoice notification email using the invoice_notification.html template."""
    context = {
        "recipient_name": recipient_name,
        "invoice_number": invoice_number,
        "amount": amount,
        "due_date": due_date,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject=f"Invoice #{invoice_number} - HoyHub",
        template_name="invoice_notification.html",
        context=context,
    )


def send_company_creation_confirmation(
    recipient_email: str,
    admin_name: str,
    company_name: str,
    registration_date: str = None,
) -> bool:
    """
    Send company creation confirmation email using the company_creation_confirmation.html template.

    Args:
        recipient_email: Target email address
        admin_name: Administrator's name
        company_name: Company name
        company_id: Company ID (optional)
        registration_date: Registration date (optional)
        account_type: Account type (default: "Business")
        dashboard_url: Dashboard URL (optional)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    context = {
        "admin_name": admin_name,
        "company_name": company_name,
        "registration_date": registration_date,
        "recipient_email": recipient_email,
    }
    return email_service.send_template_email(
        recipient_email=recipient_email,
        subject="Company Created Successfully - Welcome to HoyHub",
        template_name="company_creation_confirmation.html",
        context=context,
    )


# Legacy function for backward compatibility
def send_template_email(
    recipient_email: str,
    subject: str,
    template_name: str,
    context: Dict[str, Any] = None,
    from_email: Optional[str] = None,
) -> bool:
    """Legacy function - use EmailService.send_template_email instead."""
    return email_service.send_template_email(
        recipient_email, subject, template_name, context, from_email
    )


def test_sendgrid_connection():
    """
    Test SendGrid connection and configuration.

    Returns:
        dict: Test results with status and details
    """
    results = {
        "api_key_exists": bool(SENDGRID_API_KEY),
        "api_key_length": len(SENDGRID_API_KEY) if SENDGRID_API_KEY else 0,
        "from_email": DEFAULT_FROM_EMAIL,
        "email_service_from_email": email_service.from_email,
        "templates_dir_exists": TEMPLATES_DIR.exists(),
        "connection_test": False,
        "error": None,
    }

    if not SENDGRID_API_KEY:
        results["error"] = "SENDGRID_API_KEY not found in environment variables"
        return results

    try:
        # Test basic SendGrid connection
        sg = SendGridAPIClient(SENDGRID_API_KEY)

        # Try to get user profile (simple API call to test connection)
        response = sg.get("/user/profile")

        if response.status_code == 200:
            results["connection_test"] = True
            print("✅ SendGrid connection test successful")
        else:
            results["error"] = f"SendGrid API returned status {response.status_code}"
            print(f"❌ SendGrid connection test failed: {response.status_code}")

    except Exception as e:
        results["error"] = str(e)
        print(f"❌ SendGrid connection test failed: {str(e)}")

    return results


def test_email_sending(test_email: str = "test@example.com"):
    """
    Test email sending with a simple test email.

    Args:
        test_email: Email address to send test to

    Returns:
        bool: True if test email sent successfully
    """
    print("🧪 Testing email sending...")

    # Test connection first
    connection_test = test_sendgrid_connection()
    if not connection_test["connection_test"]:
        print(f"❌ Connection test failed: {connection_test['error']}")
        return False

    # Test simple email sending
    try:
        test_html = """
        <html>
            <body>
                <h1>Test Email</h1>
                <p>This is a test email from HoyHub to verify SendGrid configuration.</p>
                <p>If you receive this, your SendGrid setup is working correctly!</p>
            </body>
        </html>
        """

        success = email_service._send_email(
            recipient_email=test_email,
            subject="HoyHub SendGrid Test",
            html_content=test_html,
            from_email=DEFAULT_FROM_EMAIL,
        )

        if success:
            print(f"✅ Test email sent successfully to {test_email}")
        else:
            print(f"❌ Test email failed to send to {test_email}")

        return success

    except Exception as e:
        print(f"❌ Test email failed: {str(e)}")
        return False
