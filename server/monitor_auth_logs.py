"""
Real-time log monitoring for production debugging
"""

import os
import subprocess
import time
from datetime import datetime


def monitor_logs_realtime():
    """Monitor logs in real-time for authentication issues"""
    print("🔍 Real-time Log Monitoring")
    print("Press Ctrl+C to stop monitoring")
    print("=" * 50)
    
    # Common log files to monitor
    log_files = [
        "/var/log/nginx/error.log",
        "/var/log/nginx/access.log",
        "/var/log/django/django.log",
        "./logs/django.log",
        "./logs/error.log"
    ]
    
    # Find existing log files
    active_logs = []
    for log_file in log_files:
        if os.path.exists(log_file):
            active_logs.append(log_file)
            print(f"📁 Monitoring: {log_file}")
    
    if not active_logs:
        print("❌ No log files found to monitor")
        return
    
    print(f"\n🔄 Starting real-time monitoring...")
    print("Looking for authentication-related entries...")
    print("=" * 50)
    
    try:
        # Use tail -f to follow logs
        processes = []
        
        for log_file in active_logs:
            try:
                # Start tail process
                process = subprocess.Popen(
                    ["tail", "-f", log_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                processes.append((process, log_file))
            except Exception as e:
                print(f"❌ Error starting tail for {log_file}: {e}")
        
        # Monitor output
        while True:
            for process, log_file in processes:
                try:
                    # Read available output
                    line = process.stdout.readline()
                    if line:
                        line = line.strip()
                        
                        # Check for authentication-related keywords
                        auth_keywords = [
                            "login", "auth", "401", "403", "unauthorized",
                            "access denied", "authentication", "token",
                            "blocked", "failed", "error"
                        ]
                        
                        if any(keyword.lower() in line.lower() for keyword in auth_keywords):
                            timestamp = datetime.now().strftime("%H:%M:%S")
                            print(f"[{timestamp}] 🔐 {os.path.basename(log_file)}: {line}")
                            
                except Exception as e:
                    print(f"❌ Error reading from {log_file}: {e}")
            
            time.sleep(0.1)  # Small delay to prevent high CPU usage
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping log monitoring...")
        
        # Clean up processes
        for process, log_file in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
        
        print("✅ Monitoring stopped")


def check_specific_auth_issues():
    """Check for specific authentication issues"""
    print("🔐 Checking Specific Authentication Issues...")
    
    # Check for common production auth problems
    issues = []
    
    # 1. Check environment variables
    print("\n1️⃣ Environment Variables:")
    required_env_vars = [
        "SECRET_KEY", "DATABASE_URL", "ALLOWED_HOSTS",
        "DEBUG", "SECURE_SSL_REDIRECT", "SESSION_COOKIE_SECURE"
    ]
    
    for var in required_env_vars:
        value = os.environ.get(var)
        if value:
            if var == "SECRET_KEY":
                print(f"  ✅ {var}: {'*' * 20}...")
            else:
                print(f"  ✅ {var}: {value}")
        else:
            print(f"  ❌ {var}: Not set")
            issues.append(f"Missing environment variable: {var}")
    
    # 2. Check database connectivity
    print("\n2️⃣ Database Connectivity:")
    try:
        import django
        from django.conf import settings
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("  ✅ Database connection successful")
    except Exception as e:
        print(f"  ❌ Database connection failed: {e}")
        issues.append(f"Database connection issue: {e}")
    
    # 3. Check SSL/HTTPS settings
    print("\n3️⃣ SSL/HTTPS Configuration:")
    try:
        from django.conf import settings
        
        ssl_settings = {
            "SECURE_SSL_REDIRECT": getattr(settings, 'SECURE_SSL_REDIRECT', None),
            "SESSION_COOKIE_SECURE": getattr(settings, 'SESSION_COOKIE_SECURE', None),
            "CSRF_COOKIE_SECURE": getattr(settings, 'CSRF_COOKIE_SECURE', None),
            "SECURE_PROXY_SSL_HEADER": getattr(settings, 'SECURE_PROXY_SSL_HEADER', None),
        }
        
        for setting, value in ssl_settings.items():
            if value is not None:
                print(f"  ✅ {setting}: {value}")
            else:
                print(f"  ⚠️  {setting}: Not configured")
                
    except Exception as e:
        print(f"  ❌ Error checking SSL settings: {e}")
        issues.append(f"SSL configuration issue: {e}")
    
    # 4. Check CORS settings
    print("\n4️⃣ CORS Configuration:")
    try:
        from django.conf import settings
        
        cors_settings = {
            "CORS_ALLOWED_ORIGINS": getattr(settings, 'CORS_ALLOWED_ORIGINS', None),
            "CORS_ALLOW_CREDENTIALS": getattr(settings, 'CORS_ALLOW_CREDENTIALS', None),
        }
        
        for setting, value in cors_settings.items():
            if value is not None:
                print(f"  ✅ {setting}: {value}")
            else:
                print(f"  ⚠️  {setting}: Not configured")
                
    except Exception as e:
        print(f"  ❌ Error checking CORS settings: {e}")
        issues.append(f"CORS configuration issue: {e}")
    
    # Summary
    print("\n📋 Summary:")
    if issues:
        print("  ❌ Issues found:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("  ✅ No obvious configuration issues found")
    
    return issues


if __name__ == "__main__":
    print("🔍 Production Authentication Debugger")
    print("=" * 50)
    
    # Check specific issues first
    issues = check_specific_auth_issues()
    
    print("\n" + "=" * 50)
    print("💡 Common Production Login Issues:")
    print("  1. Environment variables not set correctly")
    print("  2. Database connection problems")
    print("  3. SSL/HTTPS configuration issues")
    print("  4. CORS/CSRF token problems")
    print("  5. User account status (inactive/unverified)")
    print("  6. IP blocking due to failed attempts")
    print("  7. Token expiration issues")
    print("  8. Session cookie security settings")
    
    print("\n🔄 Starting real-time monitoring...")
    print("Try logging in now to see real-time errors")
    print("=" * 50)
    
    # Start real-time monitoring
    monitor_logs_realtime()
