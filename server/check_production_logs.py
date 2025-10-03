"""
Production Log Checker - Check authentication and error logs
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'src.settings')
django.setup()

from accounts.models import ErrorLogs, AuditTrials, BlockedIP
from Users.models import Users


def check_production_logs():
    """Check production logs for authentication issues"""
    print("🔍 Checking Production Logs...")
    
    # Check recent error logs
    print("\n📋 Recent Error Logs (Last 24 hours):")
    recent_errors = ErrorLogs.objects.filter(
        date_recorded__gte=datetime.now() - timedelta(hours=24)
    ).order_by('-date_recorded')[:10]
    
    if recent_errors.exists():
        for error in recent_errors:
            print(f"  🚨 {error.date_recorded.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"     Path: {error.path}")
            print(f"     Error: {error.expected_error}")
            print(f"     IP: {error.ip_address}")
            print(f"     Browser: {error.browser}")
            print(f"     User ID: {error.user_id}")
            print("     ---")
    else:
        print("  ✅ No recent errors found")
    
    # Check blocked IPs
    print("\n🚫 Blocked IPs:")
    blocked_ips = BlockedIP.objects.all().order_by('-created_at')[:5]
    if blocked_ips.exists():
        for ip in blocked_ips:
            print(f"  🚫 {ip.blocked_ip} - {ip.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print("  ✅ No blocked IPs")
    
    # Check recent audit trails
    print("\n📊 Recent Audit Trails (Last 24 hours):")
    recent_audits = AuditTrials.objects.filter(
        date_of_action__gte=datetime.now() - timedelta(hours=24)
    ).order_by('-date_of_action')[:10]
    
    if recent_audits.exists():
        for audit in recent_audits:
            print(f"  📝 {audit.date_of_action.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"     User: {audit.user_id}")
            print(f"     Action: {audit.action} {audit.model_name}")
            print(f"     Path: {audit.path}")
            print("     ---")
    else:
        print("  ✅ No recent audit trails")
    
    # Check user status
    print("\n👤 User Status Check:")
    try:
        # Get a sample user to check status
        sample_user = Users.objects.first()
        if sample_user:
            print(f"  Sample User: {sample_user.email}")
            print(f"  Active: {sample_user.is_active}")
            print(f"  Verified: {sample_user.is_verified}")
            print(f"  Type: {sample_user.type}")
            print(f"  Last Login: {sample_user.last_login}")
        else:
            print("  ❌ No users found")
    except Exception as e:
        print(f"  ❌ Error checking user status: {str(e)}")


def check_authentication_issues():
    """Check for common authentication issues"""
    print("\n🔐 Authentication Issues Check:")
    
    # Check for inactive users
    inactive_users = Users.objects.filter(is_active=False)
    print(f"  Inactive Users: {inactive_users.count()}")
    
    # Check for unverified users
    unverified_users = Users.objects.filter(is_verified=False)
    print(f"  Unverified Users: {unverified_users.count()}")
    
    # Check for users with recent login attempts
    recent_users = Users.objects.filter(
        last_login__gte=datetime.now() - timedelta(hours=24)
    )
    print(f"  Users logged in last 24h: {recent_users.count()}")
    
    # Check for authentication-related errors
    auth_errors = ErrorLogs.objects.filter(
        path__icontains='auth',
        date_recorded__gte=datetime.now() - timedelta(hours=24)
    )
    print(f"  Auth-related errors (24h): {auth_errors.count()}")
    
    if auth_errors.exists():
        print("  Recent auth errors:")
        for error in auth_errors[:3]:
            print(f"    - {error.expected_error} at {error.path}")


def check_environment_config():
    """Check environment configuration"""
    print("\n⚙️ Environment Configuration:")
    
    from django.conf import settings
    
    # Check critical settings
    print(f"  DEBUG: {settings.DEBUG}")
    print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"  SECURE_SSL_REDIRECT: {getattr(settings, 'SECURE_SSL_REDIRECT', 'Not set')}")
    print(f"  SESSION_COOKIE_SECURE: {getattr(settings, 'SESSION_COOKIE_SECURE', 'Not set')}")
    print(f"  CSRF_COOKIE_SECURE: {getattr(settings, 'CSRF_COOKIE_SECURE', 'Not set')}")
    
    # Check database
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("  Database: ✅ Connected")
    except Exception as e:
        print(f"  Database: ❌ Error - {str(e)}")


if __name__ == "__main__":
    check_production_logs()
    check_authentication_issues()
    check_environment_config()
    
    print("\n💡 Common Production Login Issues:")
    print("  1. Environment variables not set correctly")
    print("  2. Database connection issues")
    print("  3. SSL/HTTPS configuration problems")
    print("  4. CORS/CSRF settings")
    print("  5. User account status (inactive/unverified)")
    print("  6. IP blocking due to failed attempts")
    print("  7. Token expiration issues")
