"""
Check server logs for authentication issues
"""

import os
import subprocess
from datetime import datetime


def check_server_logs():
    """Check various server log files"""
    print("📁 Checking Server Logs...")
    
    # Common log file locations
    log_paths = [
        "/var/log/nginx/error.log",
        "/var/log/nginx/access.log", 
        "/var/log/apache2/error.log",
        "/var/log/apache2/access.log",
        "/var/log/django/django.log",
        "/var/log/gunicorn/gunicorn.log",
        "/var/log/uwsgi/uwsgi.log",
        "./logs/django.log",
        "./logs/gunicorn.log",
        "./logs/error.log",
        "./logs/access.log"
    ]
    
    print("\n🔍 Checking for log files:")
    found_logs = []
    
    for log_path in log_paths:
        if os.path.exists(log_path):
            found_logs.append(log_path)
            print(f"  ✅ Found: {log_path}")
        else:
            print(f"  ❌ Not found: {log_path}")
    
    # Check recent authentication-related entries
    print("\n🔐 Recent Authentication Logs:")
    for log_path in found_logs:
        try:
            print(f"\n📋 Checking {log_path}:")
            
            # Search for authentication-related entries
            auth_keywords = [
                "login", "auth", "401", "403", "unauthorized", 
                "access denied", "authentication", "token"
            ]
            
            for keyword in auth_keywords:
                try:
                    # Use grep to search for keyword in last 100 lines
                    result = subprocess.run(
                        ["tail", "-100", log_path], 
                        capture_output=True, 
                        text=True, 
                        timeout=5
                    )
                    
                    if result.returncode == 0:
                        lines = result.stdout.split('\n')
                        matching_lines = [line for line in lines if keyword.lower() in line.lower()]
                        
                        if matching_lines:
                            print(f"  🔍 Found '{keyword}' entries:")
                            for line in matching_lines[-3:]:  # Show last 3 matches
                                print(f"    {line}")
                        else:
                            print(f"  ℹ️  No '{keyword}' entries found")
                            
                except subprocess.TimeoutExpired:
                    print(f"  ⏰ Timeout reading {log_path}")
                except Exception as e:
                    print(f"  ❌ Error reading {log_path}: {str(e)}")
                    
        except Exception as e:
            print(f"  ❌ Error accessing {log_path}: {str(e)}")


def check_docker_logs():
    """Check Docker container logs if running in Docker"""
    print("\n🐳 Checking Docker Logs:")
    
    try:
        # Check if Docker is running
        result = subprocess.run(["docker", "ps"], capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✅ Docker is running")
            
            # Get container names
            lines = result.stdout.split('\n')[1:]  # Skip header
            containers = []
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) > 0:
                        containers.append(parts[-1])  # Last column is usually name
            
            # Check logs for each container
            for container in containers:
                if container and container != "NAMES":
                    print(f"\n📋 Container: {container}")
                    try:
                        # Get last 50 lines of logs
                        log_result = subprocess.run(
                            ["docker", "logs", "--tail", "50", container],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        
                        if log_result.returncode == 0:
                            logs = log_result.stdout
                            
                            # Search for auth-related entries
                            auth_lines = []
                            for line in logs.split('\n'):
                                if any(keyword in line.lower() for keyword in 
                                      ["login", "auth", "401", "403", "unauthorized"]):
                                    auth_lines.append(line)
                            
                            if auth_lines:
                                print("  🔐 Recent auth-related logs:")
                                for line in auth_lines[-5:]:  # Show last 5
                                    print(f"    {line}")
                            else:
                                print("  ℹ️  No recent auth-related logs")
                        else:
                            print(f"  ❌ Error getting logs: {log_result.stderr}")
                            
                    except subprocess.TimeoutExpired:
                        print("  ⏰ Timeout getting container logs")
                    except Exception as e:
                        print(f"  ❌ Error: {str(e)}")
        else:
            print("  ❌ Docker is not running or not accessible")
            
    except FileNotFoundError:
        print("  ❌ Docker command not found")
    except Exception as e:
        print(f"  ❌ Error checking Docker: {str(e)}")


def check_system_logs():
    """Check system-level logs"""
    print("\n🖥️ Checking System Logs:")
    
    system_logs = [
        "/var/log/syslog",
        "/var/log/messages", 
        "/var/log/auth.log",
        "/var/log/secure"
    ]
    
    for log_path in system_logs:
        if os.path.exists(log_path):
            print(f"\n📋 Checking {log_path}:")
            try:
                # Search for Django/Python related entries
                result = subprocess.run(
                    ["grep", "-i", "django\\|python\\|gunicorn", log_path, "|", "tail", "-10"],
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0 and result.stdout.strip():
                    print("  Recent Django/Python entries:")
                    for line in result.stdout.split('\n')[-5:]:
                        if line.strip():
                            print(f"    {line}")
                else:
                    print("  ℹ️  No Django/Python entries found")
                    
            except subprocess.TimeoutExpired:
                print("  ⏰ Timeout reading system log")
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")


if __name__ == "__main__":
    check_server_logs()
    check_docker_logs()
    check_system_logs()
    
    print("\n💡 Log Analysis Tips:")
    print("  1. Look for 401/403 HTTP status codes")
    print("  2. Check for 'authentication failed' messages")
    print("  3. Look for IP blocking entries")
    print("  4. Check for SSL/TLS certificate issues")
    print("  5. Look for database connection errors")
    print("  6. Check for CORS/CSRF token issues")
