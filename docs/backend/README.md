# Backend Documentation

## Overview
Backend implementation details for the Real Estate Management System.

## Technology Stack
- Framework: Django 5.1.5+ with Django REST Framework 3.15.2+
- Language: Python 3.13
- Database: PostgreSQL with PostGIS (GeoDjango support)
- Authentication: JWT (Simple JWT) with Two-Factor Authentication
- API: REST API with OpenAPI/Swagger documentation (DRF Spectacular)
- Task Queue: Celery 5.5.3+ with Redis broker
- WebSockets: Django Channels with Redis backend
- File Storage: MinIO/S3 compatible storage
- Caching: Redis with Django Redis
- Rate Limiting: Django Rate Limit
- Email: SendGrid SMTP
- Monitoring: Sentry integration
- Code Quality: Ruff, Black, isort

## Project Structure
```
server/                        # Backend root directory
├── src/                       # Django project configuration
│   ├── settings.py           # Main settings file
│   ├── routes.py             # URL routing configuration
│   ├── asgi.py               # ASGI application for WebSockets
│   ├── wsgi.py               # WSGI application
│   ├── middlewares.py        # Custom middleware
│   └── storage_backends.py   # Custom storage backends
├── accounts/                  # User management and authentication
├── agents/                    # Agent management system
├── company/                   # Company and business logic
├── dashboard/                 # Dashboard data and analytics
├── documents/                 # Document management system
├── payments/                  # Payment processing and finance
├── properties/                # Property and real estate management
├── sales/                     # Sales and contract management
├── reports/                   # Reporting system
├── notifications/             # Notification system
├── otp/                       # One-time password system
├── menupermissions/           # Menu and permission management
├── utils/                     # Utility functions and helpers
├── celery_app.py             # Celery task queue configuration
├── manage.py                  # Django management script
├── pyproject.toml            # Python project configuration
└── pdm.lock                  # PDM dependency lock file
```

## Key Modules
- **Authentication System**: Custom user model with JWT tokens and 2FA support
- **Permission Management**: Role-based access control with menu permissions
- **Property Management**: Real estate properties with GeoDjango spatial support
- **Payment Processing**: Comprehensive payment system with multiple gateways
- **Document Management**: File storage with MinIO/S3 and compression
- **Task Queue System**: Celery with Redis for background processing
- **WebSocket Support**: Real-time communication via Django Channels
- **Reporting System**: Financial and operational reporting
- **Notification System**: Email and in-app notifications
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Rate Limiting**: Request throttling and IP blocking
- **Caching System**: Redis-based caching for performance

## API Endpoints
- **Authentication**: `/api/v1/auth/` - OTP and authentication endpoints
- **Accounts**: `/api/v1/` - User management and profiles
- **Companies**: `/api/v1/companies/` - Business onboarding and management
- **Properties**: `/api/v1/projects/` - Property and project management
- **Services**: `/api/v1/services/` - Service management
- **Project Services**: `/api/v1/project-services/` - Project-specific services
- **Finance**: `/api/v1/finance/` - Payment and financial operations
- **Penalties**: `/api/v1/penalties/` - Penalty management
- **Reports**: `/api/v1/reports/` - Financial and operational reports
- **Documents**: `/api/v1/documents/` - Document management
- **Positions**: `/api/v1/positions/` - Staff position management
- **Staff**: `/api/v1/staff/` - Staff management
- **Dashboard**: `/api/v1/dashboard/` - Dashboard data and analytics
- **Sales**: `/api/v1/sales/` - Sales and contract management
- **Payment Callbacks**: `/api/v1/paymentcallback/` - Payment gateway callbacks
- **Payout Callbacks**: `/api/v1/payoutcallback/` - Payout processing callbacks
- **Expense Callbacks**: `/api/v1/expensecallback/` - Expense processing callbacks
- **Instant Payment**: `/api/v1/instant-payment-notification/` - Real-time payment notifications

## Database Schema
- **PostgreSQL with PostGIS**: Spatial database for location-based features
- **Custom User Model**: Extended user model in `accounts.Users`
- **GeoDjango Integration**: Spatial fields for property locations and mapping
- **Relational Design**: Normalized database structure with proper foreign keys
- **Indexing**: Optimized indexes for performance on large datasets
- **Migration System**: Django's built-in migration system for schema changes
- **Backup Strategy**: Database backup and recovery procedures
- **Connection Pooling**: Optimized database connections for production

## Setup Instructions
1. **Python Environment**
   ```bash
   cd server
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install Dependencies**
   ```bash
   pip install pdm
   pdm install
   ```

3. **Environment Variables**
   Create `.env` file with:
   - `DJANGO_SECRET_KEY`
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
   - `REDIS_HOST`, `REDIS_PORT`
   - `SENDGRID_API_KEY`
   - `DEFAULT_FROM_EMAIL`
   - `ENVIRONMENT` (development/production)

4. **Database Setup**
   ```bash
   # Install PostgreSQL with PostGIS
   # Create database
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Redis Setup**
   ```bash
   # Install and start Redis
   redis-server
   ```

6. **MinIO Setup**
   ```bash
   # Install and configure MinIO for file storage
   ```

7. **Run Development Server**
   ```bash
   python manage.py runserver
   ```

8. **Start Celery Workers**
   ```bash
   celery -A celery_app worker --loglevel=info
   celery -A celery_app beat --loglevel=info
   ```

## Development Guidelines
1. **Code Quality**
   - Use Ruff for linting and formatting
   - Follow Black code style (88 character line length)
   - Use isort for import sorting
   - Maintain consistent code structure

2. **API Development**
   - Use Django REST Framework serializers
   - Implement proper validation with DRF
   - Use DRF Spectacular for API documentation
   - Follow REST API best practices

3. **Database Design**
   - Use Django ORM for database operations
   - Implement proper model relationships
   - Use database migrations for schema changes
   - Optimize queries with select_related/prefetch_related

4. **Security**
   - Implement proper authentication and permissions
   - Use JWT tokens for API access
   - Implement rate limiting and IP blocking
   - Validate all user inputs

5. **Performance**
   - Use Redis for caching
   - Implement database query optimization
   - Use Celery for background tasks
   - Monitor performance with Sentry

6. **Testing**
   - Write unit tests for models and views
   - Test API endpoints thoroughly
   - Use Django's testing framework
   - Implement integration tests