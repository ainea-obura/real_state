# HoyHub - Real Estate Management System

## 🏗️ **Project Overview**

**HoyHub** is a comprehensive real estate management platform designed for property owners, agents, and tenants. Built with modern technologies, it provides a complete solution for real estate operations including property management, financial tracking, client management, and sales operations.

### **Project Transfer Documentation**
This documentation is specifically designed for **developer-to-developer project transfer**. It provides comprehensive technical details to help new developers understand, maintain, and extend the system.

---

## 🏛️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     Mobile      │
│   (Next.js)     │◄──►│   (Django)      │◄──►│   (Flutter)     │
│                 │    │                 │    │                 │
│ • React 19      │    │ • Python 3.13   │    │ • Dart/Flutter  │
│ • TypeScript    │    │ • PostgreSQL    │    │ • GetX State    │
│ • Tailwind CSS  │    │ • Redis         │    │ • JWT Auth      │
│ • JWT Auth      │    │ • Celery        │    │ • Multi-platform│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Three-Tier Architecture**
- **Frontend Layer**: Next.js web application with React 19
- **Backend Layer**: Django REST API with PostgreSQL and Redis
- **Mobile Layer**: Cross-platform Flutter application
- **Integration**: RESTful APIs and WebSocket connections

---

## 🚀 **Technology Stack**

### **🖥️ Frontend (Web Application)**
- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript 5.x
- **State Management**: Jotai (atomic state) + React Query v5
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: NextAuth.js v4 with JWT
- **Data Fetching**: TanStack React Query for server state
- **Forms**: React Hook Form + Zod validation
- **Maps**: Mapbox GL JS + React Map GL
- **Rich Text**: TinyMCE editor
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React, Hugeicons, React Icons

### **🗄️ Backend (API & Services)**
- **Framework**: Django 5.1.5+ with DRF 3.15.2+
- **Language**: Python 3.13
- **Database**: PostgreSQL 15+ with PostGIS (GeoDjango)
- **Cache & Queue**: Redis 7+ + Celery 5.5.3+
- **Authentication**: JWT (Simple JWT) + Two-Factor Auth
- **API Documentation**: OpenAPI/Swagger (DRF Spectacular)
- **WebSockets**: Django Channels with Redis backend
- **File Storage**: MinIO/S3 compatible storage
- **Email**: SendGrid SMTP integration
- **Monitoring**: Sentry error tracking
- **Code Quality**: Ruff, Black, isort

### **📱 Mobile (Cross-Platform)**
- **Framework**: Flutter SDK ^3.8.1
- **Language**: Dart 3.x
- **Platforms**: iOS, Android, Web, Windows, macOS, Linux
- **State Management**: GetX (State + Navigation + DI)
- **Authentication**: JWT with automatic refresh
- **Storage**: Secure storage + local preferences
- **UI**: Material Design + Cupertino components
- **Networking**: HTTP client with connectivity monitoring
- **File Handling**: Image picker, file picker, PDF viewer

---

## 🎯 **Core Business Features**

### **🏢 Real Estate Management**
- **Property Management**: Listing, categorization, location mapping
- **Client Management**: Owner, agent, and tenant profiles
- **Sales Operations**: Contract management, offer letters
- **Financial Tracking**: Payment processing, invoicing, expenses
- **Document System**: File storage, PDF generation, contracts
- **Reporting**: Financial analytics, property performance metrics

### **🔐 Authentication & Security**
- **Multi-Role System**: Owner, Agent, Tenant, Admin roles
- **JWT Authentication**: Secure token-based authentication
- **Two-Factor Auth**: Enhanced security with OTP
- **Role-Based Access**: Granular permission management
- **Menu Permissions**: Dynamic menu system based on user roles

### **💰 Financial Management**
- **Payment Processing**: Multiple gateway support
- **Invoice Generation**: Automated billing system
- **Expense Tracking**: Comprehensive expense management
- **Payout Management**: Agent and service provider payments
- **Financial Reporting**: Real-time analytics and reports

### **📊 Dashboard & Analytics**
- **Real-Time Data**: Live dashboard updates
- **Financial Analytics**: Revenue, expenses, profit tracking
- **Property Metrics**: Performance and occupancy rates
- **User Activity**: Comprehensive user behavior tracking
- **Custom Reports**: Configurable reporting system

---

## 📁 **Project Structure**

```
real-state/
├── app/                    # Next.js frontend application
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   ├── provider/          # Global providers
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/             # Reusable UI components
│   ├── ui/                # shadcn/ui components
│   ├── datatable/         # Data table components
│   ├── navBar/            # Navigation components
│   ├── stats/             # Statistics components
│   └── providers/         # Context providers
├── features/               # Feature-based components
│   ├── auth/              # Authentication features
│   ├── clients/           # Client management
│   ├── dashboard/         # Dashboard features
│   ├── finance/           # Financial management
│   ├── management/        # Property management
│   ├── projects/          # Project management
│   ├── property/          # Property features
│   ├── sales/             # Sales features
│   ├── services/          # Service management
│   └── settings/          # Settings management
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
├── server/                 # Django backend application
│   ├── src/               # Django project configuration
│   ├── accounts/          # User management
│   ├── properties/        # Property management
│   ├── payments/          # Financial services
│   ├── sales/             # Sales management
│   ├── documents/         # Document management
│   ├── dashboard/         # Dashboard data
│   ├── notifications/     # Notification system
│   └── [other modules]    # Additional features
├── mobile/                 # Flutter mobile application
│   ├── lib/               # Dart source code
│   ├── core/              # Core application layer
│   └── features/          # Feature modules
├── documentation/          # Docusaurus documentation
└── docs/                   # Project documentation (this folder)
```

---

## 🚀 **Quick Start Guide**

### **1. Frontend Development**
```bash
cd app
npm install
npm run dev
```
**Access**: http://localhost:3000

### **2. Backend Development**
```bash
cd server
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install pdm
pdm install
python manage.py runserver
```
**Access**: http://localhost:8000

### **3. Mobile Development**
```bash
cd mobile
flutter pub get
flutter run
```

### **4. Documentation**
```bash
cd documentation
npm install
npm run start
```
**Access**: http://localhost:3000

---

## ⚙️ **Environment Variables Setup**

> 📖 **Complete Guide**: [Environment Variables Setup Guide](./environment-setup.md)

### **📋 Overview**
Environment variables are crucial for configuring the HoyHub system. Each platform has its own `.env` file with specific configuration requirements.

### **🔐 Frontend Environment (.env.local)**

Create `app/.env.local`:

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

### **🗄️ Backend Environment (.env)**

Create `server/.env`:

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

### **📱 Mobile Environment (.env)**

Create `mobile/.env`:

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

### **🔧 Environment Variables Explanation**

#### **Frontend Variables**
- **`NEXT_PUBLIC_*`**: Variables accessible in the browser
- **`NEXTAUTH_*`**: NextAuth.js authentication configuration
- **`NEXT_PUBLIC_API_URL`**: Backend API endpoint
- **`NEXT_PUBLIC_MAPBOX_TOKEN`**: Mapbox maps integration
- **Feature Flags**: Enable/disable specific features

#### **Backend Variables**
- **Database**: PostgreSQL connection and credentials
- **Redis**: Cache and task queue configuration
- **MinIO**: File storage configuration
- **Email**: SendGrid SMTP settings
- **JWT**: Token configuration and security
- **Celery**: Background task processing
- **Security**: CORS, CSRF, and SSL settings

#### **Mobile Variables**
- **API Configuration**: Backend endpoint and timeout
- **Authentication**: JWT token endpoints
- **Storage**: Secure storage and preferences keys
- **Feature Flags**: App functionality control

### **🚨 Security Best Practices**

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** (dev/staging/prod)
5. **Validate all environment variables** on startup
6. **Use secret management services** in production

### **📁 File Structure**
```
real-state/
├── app/
│   └── .env.local          # Frontend environment
├── server/
│   └── .env                # Backend environment
├── mobile/
│   └── .env                # Mobile environment
└── .env.example            # Template files (safe to commit)
```

### **🔍 Environment Validation**

Each platform validates required environment variables on startup:

- **Frontend**: Next.js environment validation
- **Backend**: Django settings validation
- **Mobile**: Flutter environment checking

---

## 🔧 **Development Workflow**

### **1. Feature Development**
- Create feature branches from `main`
- Implement changes across all platforms
- Ensure API consistency between frontend/mobile and backend
- Test on all target platforms before merging

### **2. Testing Strategy**
- **Frontend**: Jest + React Testing Library
- **Backend**: Django test framework + pytest
- **Mobile**: Flutter test framework
- **Integration**: API endpoint testing with Postman/Insomnia

### **3. Code Quality**
- **Frontend**: ESLint + Prettier
- **Backend**: Ruff + Black + isort
- **Mobile**: Dart analysis + lint rules
- **Git Hooks**: Pre-commit hooks for code quality

### **4. Deployment**
- **Frontend**: Vercel/Netlify deployment
- **Backend**: Docker containerization
- **Mobile**: App Store + Play Store releases
- **Database**: Managed PostgreSQL service

---

## 🌐 **API Architecture**

### **RESTful Endpoints**
- **Authentication**: `/api/v1/auth/` - OTP and JWT authentication
- **Properties**: `/api/v1/projects/` - Property and project management
- **Finance**: `/api/v1/finance/` - Payment and financial operations
- **Sales**: `/api/v1/sales/` - Sales and contract management
- **Reports**: `/api/v1/reports/` - Financial and operational reporting
- **Documents**: `/api/v1/documents/` - File management system
- **Dashboard**: `/api/v1/dashboard/` - Analytics and metrics

### **WebSocket Support**
- Real-time notifications
- Live dashboard updates
- Chat functionality
- Real-time property updates

### **API Documentation**
- **Swagger UI**: `/api/schema/swagger-ui/`
- **ReDoc**: `/api/schema/redoc/`
- **OpenAPI Schema**: `/api/schema/`

---

## 🔒 **Security Features**

### **Authentication & Authorization**
- JWT token-based authentication with refresh tokens
- Role-based access control (RBAC) system
- Permission-based menu system
- Two-factor authentication support
- Session management and token expiration

### **Data Protection**
- Secure file storage with MinIO/S3
- Encrypted communication (HTTPS/WSS)
- Rate limiting and IP blocking
- Input validation and sanitization
- SQL injection prevention

### **API Security**
- CORS configuration
- Request throttling
- API key management
- Secure headers configuration

---

## 📈 **Performance & Scalability**

### **Frontend Optimization**
- React Query for server state management
- Image optimization and lazy loading
- Code splitting and dynamic imports
- Service worker for offline support
- Bundle analysis and optimization

### **Backend Optimization**
- Redis caching for frequently accessed data
- Database query optimization with Django ORM
- Celery task queues for background processing
- Horizontal scaling capabilities
- Database connection pooling

### **Mobile Optimization**
- Efficient state management with GetX
- Image caching and optimization
- Offline data synchronization
- Platform-specific performance tuning
- Memory management and garbage collection

---

## 📊 **Monitoring & Analytics**

### **Application Monitoring**
- Sentry integration for error tracking
- Performance monitoring and metrics
- User analytics and behavior tracking
- Real-time system health monitoring
- Log aggregation and analysis

### **Business Intelligence**
- Financial reporting and analytics
- Property performance metrics
- User engagement analytics
- Custom report generation
- Data export capabilities

---

## 📚 **Documentation Sections**

### **📖 [Frontend Documentation](./frontend/README.md)**
Complete guide to the Next.js web application, including setup, architecture, component system, and development guidelines.

### **🗄️ [Backend Documentation](./backend/README.md)**
Comprehensive documentation of the Django backend, API endpoints, database schema, authentication system, and deployment procedures.

### **📱 [Mobile Documentation](./mobile/README.md)**
Detailed guide to the Flutter mobile application, including cross-platform development, JWT authentication, and platform-specific configurations.

---

## 🆘 **Getting Help**

### **For New Developers**
1. **Start Here**: Review this overview document thoroughly
2. **Environment Setup**: Follow the setup instructions step-by-step
3. **Run Applications**: Get all three platforms running locally
4. **Explore Codebase**: Study the project structure and key files
5. **API Understanding**: Review the API endpoints and data flow
6. **Database Schema**: Understand the PostgreSQL models and relationships

### **Common Issues & Solutions**
- **Environment Variables**: Check all `.env` files are properly configured
- **Service Dependencies**: Ensure PostgreSQL, Redis, and MinIO are running
- **Database Migrations**: Run `python manage.py migrate` for backend
- **API Connectivity**: Verify frontend/mobile can reach backend endpoints
- **Port Conflicts**: Check for port conflicts (3000, 8000, 5432, 6379)

### **Development Tips**
- Use VS Code with recommended extensions
- Enable TypeScript strict mode for frontend
- Use Django debug toolbar for backend development
- Enable Flutter hot reload for mobile development
- Use Postman/Insomnia for API testing

---

## 🔄 **Project Transfer Notes**

This documentation is specifically designed for **developer-to-developer project transfer**. Key areas to focus on:

### **1. Architecture Understanding**
- Study the three-tier architecture design
- Understand the separation of concerns
- Review the API integration patterns
- Analyze the database schema relationships

### **2. Technology Stack Mastery**
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Django 5, Python 3.13, PostgreSQL, Redis
- **Mobile**: Flutter 3.8, Dart, GetX state management

### **3. Authentication Flow**
- Master the JWT token system
- Understand role-based permissions
- Review the two-factor authentication
- Study the session management

### **4. Database Schema**
- Review PostgreSQL models and relationships
- Understand PostGIS spatial data
- Study the migration system
- Review indexing and optimization

### **5. Deployment Process**
- Learn the deployment procedures
- Understand environment configuration
- Review monitoring and logging
- Study backup and recovery procedures

### **6. Code Quality Standards**
- Follow the established coding conventions
- Use the configured linting tools
- Maintain test coverage standards
- Follow the Git workflow

---

## 📞 **Support & Contact**

### **Project Maintainers**
- **Mansuur Abdullahi (mruus)**: [GitHub](https://github.com/mruus)
- **Mohamud Ali Abshir (mhbaando)**: [GitHub](https://github.com/mhbaando)

### **Documentation**
- **Live Documentation**: [Docusaurus Site](./documentation/)
- **API Reference**: [Swagger UI](./documentation/docs/api/overview)
- **Development Guide**: [Setup Instructions](./documentation/docs/development/setup)

---

*Documentation created for project transfer - HoyHub Real Estate Management System*

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: Ready for Project Transfer
