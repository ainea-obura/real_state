"""
Production Debug Management Commands

Django management commands for testing and managing production debug features.
"""

from django.core.management.base import BaseCommand
from django.http import HttpRequest
from utils.debug_email_service import test_debug_email_service, send_production_error_email


class Command(BaseCommand):
    help = 'Test production debug email service'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test',
            action='store_true',
            help='Send a test debug email',
        )
        parser.add_argument(
            '--priority',
            type=str,
            default='low',
            choices=['low', 'medium', 'high', 'critical'],
            help='Priority level for test email',
        )

    def handle(self, *args, **options):
        if options['test']:
            self.stdout.write("🧪 Testing production debug email service...")
            
            # Create a mock request for testing
            mock_request = HttpRequest()
            mock_request.method = 'GET'
            mock_request.path = '/api/v1/sales/commissions/'
            mock_request.META = {
                'HTTP_USER_AGENT': 'Mozilla/5.0 (Test Browser)',
                'HTTP_X_FORWARDED_FOR': '192.168.1.100',
                'HTTP_REFERER': 'https://hoyhub.com/dashboard',
            }
            
            # Create a test exception similar to your production error
            test_exception = Exception("Failed to fetch commissions: 401 - User not found")
            
            # Send test email
            success = send_production_error_email(
                exception=test_exception,
                request=mock_request,
                additional_data={
                    "test_mode": True,
                    "component": "Sales Dashboard",
                    "endpoint": "/api/v1/sales/commissions/",
                    "error_type": "Authentication Error",
                    "user_action": "Viewing commissions dashboard"
                },
                priority=options['priority']
            )
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS("✅ Test debug email sent successfully!")
                )
                self.stdout.write("📧 Check your email: aobura@proton.me")
            else:
                self.stdout.write(
                    self.style.ERROR("❌ Failed to send test debug email")
                )
        else:
            self.stdout.write("Usage: python manage.py debug_email --test")
            self.stdout.write("Options:")
            self.stdout.write("  --test        Send a test debug email")
            self.stdout.write("  --priority    Set priority (low, medium, high, critical)")
