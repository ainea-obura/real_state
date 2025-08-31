# Environment Variables Setup Guide

## 📋 Overview

This guide provides comprehensive environment variable configuration for the HoyHub Real Estate Management System. Each platform (Frontend, Backend, Mobile) requires specific environment variables to function properly.

## 🔐 Frontend Environment (.env.local)

**File Location**: `.env.local`

```bash
# =============================================================================
# HOYHUB FRONTEND ENVIRONMENT VARIABLES
# =============================================================================

# Site Configuration
NEXT_PUBLIC_SITE_NAME=HoyHub
NEXT_PUBLIC_SITE_DESCRIPTION=Real Estate Management Platform
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_API_VERSION=v1

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-here-minimum-32-chars
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_JWT_SECRET=your-jwt-secret-key-here

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.example
NEXT_PUBLIC_TINYMCE_API_KEY=your-tinymce-api-key-here
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_MAPS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Development
NODE_ENV=development
NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
```

### **Frontend Variables Explanation**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SITE_NAME` | Application name displayed in UI | ✅ | `HoyHub` |
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | ✅ | `http://localhost:8000/api/v1` |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | ✅ | `your-secret-key-here` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox maps integration | ❌ | `pk.eyJ1...` |
| `NEXT_PUBLIC_TINYMCE_API_KEY` | Rich text editor API key | ❌ | `your-tinymce-key` |

## 🗄️ Backend Environment (.env)

**File Location**: `server/.env`

```bash
# =============================================================================
# HOYHUB BACKEND ENVIRONMENT VARIABLES
# =============================================================================

# Django Configuration
DEBUG=True
SECRET_KEY=your-django-secret-key-here-minimum-50-chars
DJANGO_SETTINGS_MODULE=src.settings
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/hoyhub_db
DB_NAME=hoyhub_db
DB_USER=hoyhub_user
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# MinIO/S3 Storage Configuration
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET_NAME=hoyhub-storage
MINIO_ENDPOINT=localhost:9000
MINIO_USE_SSL=False
MINIO_REGION=us-east-1

# Email Configuration (SendGrid)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@hoyhub.com

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ACCESS_TOKEN_LIFETIME=5
JWT_REFRESH_TOKEN_LIFETIME=1
JWT_ALGORITHM=HS256

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CELERY_ACCEPT_CONTENT=json
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
CELERY_TIMEZONE=UTC

# Security Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# Monitoring & Analytics
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development

# Payment Gateway Configuration
PAYMENT_GATEWAY_API_KEY=your-payment-gateway-key
PAYMENT_GATEWAY_SECRET=your-payment-gateway-secret
PAYMENT_GATEWAY_WEBHOOK_SECRET=your-webhook-secret

# File Upload Configuration
MAX_UPLOAD_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,gif
```

### **Backend Variables Explanation**

#### **Core Django Variables**
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DEBUG` | Enable debug mode | ✅ | `True` (dev) |
| `SECRET_KEY` | Django secret key | ✅ | - |
| `ALLOWED_HOSTS` | Allowed hostnames | ✅ | `localhost,127.0.0.1` |

#### **Database Variables**
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Full database connection string | ✅ | `postgresql://user:pass@host:port/db` |
| `DB_NAME` | Database name | ✅ | `hoyhub_db` |
| `DB_USER` | Database username | ✅ | `hoyhub_user` |
| `DB_PASSWORD` | Database password | ✅ | `your-secure-password` |

#### **Redis Variables**
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REDIS_URL` | Redis connection string | ✅ | `redis://localhost:6379/0` |
| `REDIS_HOST` | Redis host | ✅ | `localhost` |
| `REDIS_PORT` | Redis port | ✅ | `6379` |

#### **MinIO/S3 Variables**
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MINIO_ACCESS_KEY` | MinIO access key | ✅ | `your-access-key` |
| `MINIO_SECRET_KEY` | MinIO secret key | ✅ | `your-secret-key` |
| `MINIO_BUCKET_NAME` | Storage bucket name | ✅ | `hoyhub-storage` |

## 📱 Mobile Environment (.env)

**File Location**: `mobile/.env`

```bash
# =============================================================================
# HOYHUB MOBILE ENVIRONMENT VARIABLES
# =============================================================================

# API Configuration
API_BASE_URL=http://localhost:8000/api/v1
API_TIMEOUT=30000
API_VERSION=v1

# Authentication
AUTH_ENDPOINT=/auth/
REFRESH_TOKEN_ENDPOINT=/auth/refresh/
VERIFY_TOKEN_ENDPOINT=/auth/verify/

# Storage Configuration
SECURE_STORAGE_KEY=your-secure-storage-key
SHARED_PREFERENCES_KEY=hoyhub_prefs

# Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_ANALYTICS=false
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_OFFLINE_MODE=true

# External Services
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.example
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# App Configuration
APP_NAME=HoyHub
APP_VERSION=1.0.0
BUILD_NUMBER=1
```

### **Mobile Variables Explanation**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `API_BASE_URL` | Backend API endpoint | ✅ | `http://localhost:8000/api/v1` |
| `API_TIMEOUT` | API request timeout (ms) | ❌ | `30000` |
| `SECURE_STORAGE_KEY` | Secure storage encryption key | ✅ | `your-secure-key` |
| `MAPBOX_ACCESS_TOKEN` | Mapbox maps integration | ❌ | `pk.eyJ1...` |

## 🚨 Security Best Practices

### **1. Never Commit .env Files**
```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.staging
```

### **2. Use Strong Secrets**
- **Minimum Length**: 32+ characters for production
- **Complexity**: Mix of letters, numbers, symbols
- **Uniqueness**: Different secrets for each environment

### **3. Environment-Specific Values**
```bash
# Development
DEBUG=True
SECRET_KEY=dev-secret-key

# Production  
DEBUG=False
SECRET_KEY=production-secret-key
```

### **4. Secret Rotation**
- **Regular Updates**: Rotate secrets every 90 days
- **Emergency Rotation**: Immediate rotation if compromised
- **Gradual Rollout**: Update secrets without downtime

### **5. Production Security**
- **Secret Management**: Use AWS Secrets Manager, HashiCorp Vault
- **Environment Isolation**: Separate dev/staging/prod secrets
- **Access Control**: Limit who can access production secrets

## 📁 File Structure

```
real-state/
├── app/
│   ├── .env.local          # Frontend environment (DO NOT COMMIT)
│   └── .env.example        # Frontend template (SAFE TO COMMIT)
├── server/
│   ├── .env                # Backend environment (DO NOT COMMIT)
│   └── .env.example        # Backend template (SAFE TO COMMIT)
├── mobile/
│   ├── .env                # Mobile environment (DO NOT COMMIT)
│   └── .env.example        # Mobile template (SAFE TO COMMIT)
└── .env.example            # Global template (SAFE TO COMMIT)
```

## 🔍 Environment Validation

### **Frontend Validation**
```typescript
// Next.js automatically validates required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required');
}
```

### **Backend Validation**
```python
# Django settings validation
import os
from django.core.exceptions import ImproperlyConfigured

def get_env_var(var_name, default=None):
    value = os.getenv(var_name, default)
    if value is None:
        raise ImproperlyConfigured(f'{var_name} environment variable is required')
    return value

SECRET_KEY = get_env_var('SECRET_KEY')
DATABASE_URL = get_env_var('DATABASE_URL')
```

### **Mobile Validation**
```dart
// Flutter environment checking
class EnvironmentConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8000/api/v1',
  );
  
  static void validate() {
    if (apiBaseUrl.isEmpty) {
      throw Exception('API_BASE_URL is required');
    }
  }
}
```

## 🚀 Quick Setup Commands

### **1. Create Environment Files**
```bash
# Frontend
cp app/.env.example app/.env.local

# Backend
cp server/.env.example server/.env

# Mobile
cp mobile/.env.example mobile/.env
```

### **2. Generate Secure Secrets**
```bash
# Django Secret Key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# JWT Secret
openssl rand -hex 32

# NextAuth Secret
openssl rand -base64 32
```

### **3. Validate Environment**
```bash
# Frontend
cd app && npm run build

# Backend
cd server && python manage.py check

# Mobile
cd mobile && flutter analyze
```

## 📞 Support

If you encounter environment variable issues:

1. **Check Documentation**: Review this guide thoroughly
2. **Validate Syntax**: Ensure no typos in variable names
3. **Check Requirements**: Verify all required variables are set
4. **Contact Team**: Reach out to the development team

---

*Environment Variables Setup Guide - HoyHub Real Estate Platform*  
**Last Updated**: January 2025  
**Version**: 2.0.0
