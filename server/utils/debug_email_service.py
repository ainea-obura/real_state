"""
Production Debug Email Service

This module provides comprehensive error reporting via email for production debugging.
Sends detailed error reports including stack traces, user data, and system information.
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Any, Dict, Optional

from django.conf import settings
from django.http import HttpRequest
from django.template import Context, Template

from utils.email_utils import EmailService


class DebugEmailService:
    """Service for sending detailed debug information via email."""
    
    def __init__(self):
        self.debug_email = os.getenv("DEBUG_EMAIL", "aobura@proton.me")
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.app_name = os.getenv("APP_NAME", "HoyHub")
        self.email_service = EmailService()
        
    def _get_system_info(self) -> Dict[str, Any]:
        """Get system and environment information."""
        return {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "environment": self.environment,
            "app_name": self.app_name,
            "python_version": sys.version,
            "django_version": getattr(settings, "DJANGO_VERSION", "Unknown"),
            "debug_mode": getattr(settings, "DEBUG", False),
            "allowed_hosts": getattr(settings, "ALLOWED_HOSTS", []),
            "database_engine": getattr(settings, "DATABASES", {}).get("default", {}).get("ENGINE", "Unknown"),
        }
    
    def _get_request_info(self, request: Optional[HttpRequest]) -> Dict[str, Any]:
        """Extract request information for debugging."""
        if not request:
            return {"error": "No request object available"}
            
        return {
            "method": request.method,
            "path": request.path,
            "full_url": request.build_absolute_uri(),
            "user_agent": request.META.get("HTTP_USER_AGENT", "Unknown"),
            "ip_address": self._get_client_ip(request),
            "referer": request.META.get("HTTP_REFERER", "Direct"),
            "content_type": request.content_type,
            "is_ajax": request.headers.get("X-Requested-With") == "XMLHttpRequest",
            "query_params": dict(request.GET),
            "post_data": dict(request.POST) if request.method == "POST" else {},
        }
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip or "Unknown"
    
    def _get_user_info(self, request: Optional[HttpRequest]) -> Dict[str, Any]:
        """Extract user information for debugging."""
        if not request or not hasattr(request, "user"):
            return {"error": "No user information available"}
            
        user = request.user
        if not user.is_authenticated:
            return {"status": "Anonymous user"}
            
        return {
            "id": str(user.id) if hasattr(user, "id") else "Unknown",
            "email": getattr(user, "email", "No email"),
            "username": getattr(user, "username", "No username"),
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "is_active": getattr(user, "is_active", False),
            "is_staff": getattr(user, "is_staff", False),
            "is_superuser": getattr(user, "is_superuser", False),
            "last_login": str(getattr(user, "last_login", "Never")),
            "date_joined": str(getattr(user, "date_joined", "Unknown")),
        }
    
    def _format_traceback(self, exc_type, exc_value, exc_traceback) -> str:
        """Format exception traceback for email."""
        if exc_traceback:
            tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
            return "".join(tb_lines)
        return f"{exc_type.__name__}: {exc_value}"
    
    def _create_error_context(self, 
                            exception: Exception, 
                            request: Optional[HttpRequest] = None,
                            additional_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create comprehensive error context for email template."""
        exc_type, exc_value, exc_traceback = sys.exc_info()
        
        context = {
            "error": {
                "type": exc_type.__name__ if exc_type else type(exception).__name__,
                "message": str(exception),
                "traceback": self._format_traceback(exc_type, exc_value, exc_traceback),
                "line_number": exc_traceback.tb_lineno if exc_traceback else "Unknown",
            },
            "system": self._get_system_info(),
            "request": self._get_request_info(request),
            "user": self._get_user_info(request),
            "additional_data": additional_data or {},
        }
        
        return context
    
    def send_error_report(self, 
                         exception: Exception,
                         request: Optional[HttpRequest] = None,
                         additional_data: Optional[Dict[str, Any]] = None,
                         priority: str = "medium") -> bool:
        """
        Send detailed error report via email.
        
        Args:
            exception: The exception that occurred
            request: Django request object (optional)
            additional_data: Additional debugging data (optional)
            priority: Error priority (low, medium, high, critical)
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            context = self._create_error_context(exception, request, additional_data)
            
            # Create subject based on priority and error type
            error_type = context["error"]["type"]
            timestamp = context["system"]["timestamp"]
            
            priority_emoji = {
                "low": "🔵",
                "medium": "🟡", 
                "high": "🟠",
                "critical": "🔴"
            }
            
            subject = f"{priority_emoji.get(priority, '🟡')} {self.app_name} Error - {error_type} ({priority.upper()})"
            
            # Create HTML content
            html_content = self._create_error_html(context, priority)
            
            # Send email
            success = self.email_service._send_email(
                recipient_email=self.debug_email,
                subject=subject,
                html_content=html_content
            )
            
            if success:
                print(f"✅ Debug email sent successfully to {self.debug_email}")
            else:
                print(f"❌ Failed to send debug email to {self.debug_email}")
                
            return success
            
        except Exception as e:
            print(f"❌ Error sending debug email: {str(e)}")
            return False
    
    def _create_error_html(self, context: Dict[str, Any], priority: str) -> str:
        """Create HTML content for error email."""
        
        # Priority styling
        priority_colors = {
            "low": "#4CAF50",
            "medium": "#FF9800", 
            "high": "#FF5722",
            "critical": "#F44336"
        }
        
        priority_color = priority_colors.get(priority, "#FF9800")
        
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Error Report - {context['system']['app_name']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: {priority_color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ padding: 20px; }}
                .section {{ margin-bottom: 25px; }}
                .section h2 {{ color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
                .error-box {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 10px 0; }}
                .traceback {{ background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; }}
                .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
                .info-item {{ background: #f8f9fa; padding: 10px; border-radius: 4px; }}
                .info-label {{ font-weight: bold; color: #495057; }}
                .info-value {{ color: #6c757d; }}
                .footer {{ background: #f8f9fa; padding: 15px; text-align: center; color: #6c757d; font-size: 12px; border-radius: 0 0 8px 8px; }}
                .code {{ background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 Production Error Report</h1>
                    <p><strong>{context['system']['app_name']}</strong> - {context['system']['timestamp']}</p>
                </div>
                
                <div class="content">
                    <!-- Error Details -->
                    <div class="section">
                        <h2>🔍 Error Details</h2>
                        <div class="error-box">
                            <p><strong>Type:</strong> <span class="code">{context['error']['type']}</span></p>
                            <p><strong>Message:</strong> {context['error']['message']}</p>
                            <p><strong>Line:</strong> {context['error']['line_number']}</p>
                        </div>
                    </div>
                    
                    <!-- System Information -->
                    <div class="section">
                        <h2>🖥️ System Information</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Environment</div>
                                <div class="info-value">{context['system']['environment']}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Debug Mode</div>
                                <div class="info-value">{context['system']['debug_mode']}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Python Version</div>
                                <div class="info-value">{context['system']['python_version'].split()[0]}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Django Version</div>
                                <div class="info-value">{context['system']['django_version']}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- User Information -->
                    <div class="section">
                        <h2>👤 User Information</h2>
                        <div class="info-grid">
                            {"".join([f'''
                            <div class="info-item">
                                <div class="info-label">{key.replace('_', ' ').title()}</div>
                                <div class="info-value">{value}</div>
                            </div>
                            ''' for key, value in context['user'].items()])}
                        </div>
                    </div>
                    
                    <!-- Request Information -->
                    <div class="section">
                        <h2>🌐 Request Information</h2>
                        <div class="info-grid">
                            {"".join([f'''
                            <div class="info-item">
                                <div class="info-label">{key.replace('_', ' ').title()}</div>
                                <div class="info-value">{value}</div>
                            </div>
                            ''' for key, value in context['request'].items() if key != 'query_params' and key != 'post_data'])}
                        </div>
                        
                        {f'''
                        <div class="info-item">
                            <div class="info-label">Query Parameters</div>
                            <div class="info-value"><span class="code">{context['request']['query_params']}</span></div>
                        </div>
                        ''' if context['request'].get('query_params') else ''}
                        
                        {f'''
                        <div class="info-item">
                            <div class="info-label">POST Data</div>
                            <div class="info-value"><span class="code">{context['request']['post_data']}</span></div>
                        </div>
                        ''' if context['request'].get('post_data') else ''}
                    </div>
                    
                    <!-- Stack Trace -->
                    <div class="section">
                        <h2>📋 Stack Trace</h2>
                        <div class="traceback">{context['error']['traceback']}</div>
                    </div>
                    
                    <!-- Additional Data -->
                    {f'''
                    <div class="section">
                        <h2>📊 Additional Data</h2>
                        <div class="info-grid">
                            {"".join([f'''
                            <div class="info-item">
                                <div class="info-label">{key.replace('_', ' ').title()}</div>
                                <div class="info-value">{value}</div>
                            </div>
                            ''' for key, value in context['additional_data'].items()])}
                        </div>
                    </div>
                    ''' if context['additional_data'] else ''}
                </div>
                
                <div class="footer">
                    <p>This is an automated error report from {context['system']['app_name']} production system.</p>
                    <p>Priority: <strong>{priority.upper()}</strong> | Environment: <strong>{context['system']['environment']}</strong></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_template


# Global debug email service instance
debug_email_service = DebugEmailService()


def send_production_error_email(exception: Exception, 
                               request=None, 
                               additional_data=None, 
                               priority="medium") -> bool:
    """
    Convenience function to send production error emails.
    
    Args:
        exception: The exception that occurred
        request: Django request object (optional)
        additional_data: Additional debugging data (optional)
        priority: Error priority (low, medium, high, critical)
        
    Returns:
        bool: True if email sent successfully
    """
    return debug_email_service.send_error_report(exception, request, additional_data, priority)


def test_debug_email_service():
    """Test the debug email service with a sample error."""
    print("🧪 Testing debug email service...")
    
    try:
        # Create a test exception
        test_exception = ValueError("This is a test error for production debugging")
        
        # Send test email
        success = send_production_error_email(
            exception=test_exception,
            additional_data={
                "test_mode": True,
                "component": "Debug Email Service",
                "action": "Testing email functionality"
            },
            priority="low"
        )
        
        if success:
            print("✅ Debug email service test successful")
        else:
            print("❌ Debug email service test failed")
            
        return success
        
    except Exception as e:
        print(f"❌ Debug email service test error: {str(e)}")
        return False
