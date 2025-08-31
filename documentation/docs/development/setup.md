---
id: setup
title: Development Setup
sidebar_label: Development Setup
sidebar_position: 1
---

# Development Setup Guide

## Overview

This guide provides comprehensive setup instructions for developers taking over the Real Estate Management System project. It covers all aspects of the development environment setup across the three platforms: Frontend (Next.js), Backend (Django), and Mobile (Flutter).

## Prerequisites

### System Requirements
- **Operating System**: macOS 12+, Ubuntu 20.04+, or Windows 10+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 20GB free space
- **Network**: Stable internet connection for package downloads

### Required Software Versions
- **Node.js**: 18.0.0 or higher
- **Python**: 3.13 or higher
- **Flutter**: SDK version ^3.8.1
- **PostgreSQL**: 14 or higher with PostGIS extension
- **Redis**: 6.0 or higher
- **Git**: Latest version

## Step-by-Step Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/mruus/real-state.git
cd real-state

# Check out the main branch
git checkout main

# Verify the project structure
ls -la
```

### 2. Frontend Development Environment (Next.js)

#### Install Node.js Dependencies
```bash
# Navigate to frontend directory
cd app

# Install dependencies
npm install

# Verify installation
npm --version
node --version
```

#### Environment Configuration
```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

**Required Environment Variables:**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_NAME=Real Estate Platform
NEXT_PUBLIC_SITE_DESCRIPTION=Real Estate Management System

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database (if using direct database connection)
DATABASE_URL=postgresql://username:password@localhost:5432/real_estate_db

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

#### Development Server
```bash
# Start development server
npm run dev

# The application will be available at http://localhost:3000
```

### 3. Backend Development Environment (Django)

#### Python Environment Setup
```bash
# Navigate to backend directory
cd ../server

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Verify Python version
python --version  # Should be 3.13+
```

#### Install Python Dependencies
```bash
# Install PDM (Python dependency manager)
pip install pdm

# Install project dependencies
pdm install

# Verify installation
pdm --version
```

#### Environment Configuration
```bash
# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
```bash
# Django Configuration
DJANGO_SECRET_KEY=your-django-secret-key-here
DEBUG=True
ENVIRONMENT=development

# Database Configuration
DB_NAME=real_estate_db
DB_USER=real_estate_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# File Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=real-estate-files

# External Services
SENTRY_DSN=your-sentry-dsn
```

#### Database Setup
```bash
# Ensure PostgreSQL is running
sudo systemctl status postgresql

# Create database and user (if not exists)
sudo -u postgres psql
CREATE DATABASE real_estate_db;
CREATE USER real_estate_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE real_estate_db TO real_estate_user;
\q

# Enable PostGIS extension
sudo -u postgres psql -d real_estate_db -c "CREATE EXTENSION postgis;"

# Run Django migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data (if available)
python manage.py loaddata initial_data
```

#### Development Server
```bash
# Start Django development server
python manage.py runserver

# The API will be available at http://localhost:8000
# Admin interface at http://localhost:8000/admin
```

### 4. Mobile Development Environment (Flutter)

#### Flutter SDK Setup
```bash
# Navigate to mobile directory
cd ../mobile

# Verify Flutter installation
flutter --version

# Check Flutter doctor for any issues
flutter doctor

# Install Flutter dependencies
flutter pub get
```

#### Platform-Specific Setup

**Android Development:**
```bash
# Install Android Studio
# Set up Android SDK
# Create Android Virtual Device (AVD)

# Verify Android setup
flutter doctor --android-licenses
flutter doctor
```

**iOS Development (macOS only):**
```bash
# Install Xcode from App Store
# Install iOS Simulator
# Accept Xcode license

# Verify iOS setup
flutter doctor
```

**Web Development:**
```bash
# Enable web support
flutter config --enable-web

# Verify web setup
flutter doctor
```

#### Environment Configuration
```bash
# Create environment configuration file
cp lib/core/config/env.example.dart lib/core/config/env.dart

# Edit environment configuration
nano lib/core/config/env.dart
```

**Required Configuration:**
```dart
class Environment {
  static const String apiUrl = 'http://localhost:8000';
  static const String appName = 'Real Estate Platform';
  static const String appVersion = '1.0.0';
}
```

#### Development Server
```bash
# Run on connected device or emulator
flutter run

# For specific platforms:
flutter run -d chrome    # Web
flutter run -d windows   # Windows
flutter run -d macos     # macOS
flutter run -d linux     # Linux
```

### 5. Infrastructure Services

#### PostgreSQL Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib postgis

# Install PostgreSQL (macOS with Homebrew)
brew install postgresql postgis

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

#### Redis Setup
```bash
# Install Redis (Ubuntu/Debian)
sudo apt install redis-server

# Install Redis (macOS with Homebrew)
brew install redis

# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Verify installation
redis-cli ping  # Should return PONG
```

#### MinIO Setup (File Storage)
```bash
# Install MinIO (Ubuntu/Debian)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Start MinIO server
mkdir ~/minio-data
minio server ~/minio-data --console-address ":9001"

# Access MinIO console at http://localhost:9001
# Default credentials: minioadmin/minioadmin
```

### 6. Background Task Processing (Celery)

#### Start Celery Services
```bash
# Navigate to backend directory
cd ../server

# Activate virtual environment
source .venv/bin/activate

# Start Celery worker (in a new terminal)
celery -A celery_app worker --loglevel=info

# Start Celery beat scheduler (in another terminal)
celery -A celery_app beat --loglevel=info
```

#### Verify Celery Setup
```bash
# Check Celery status
celery -A celery_app status

# Monitor Celery tasks
celery -A celery_app monitor
```

## Development Workflow

### 1. Daily Development Routine
```bash
# Start all services
cd real-state

# Terminal 1: Frontend
cd app && npm run dev

# Terminal 2: Backend
cd server && source .venv/bin/activate && python manage.py runserver

# Terminal 3: Celery Worker
cd server && source .venv/bin/activate && celery -A celery_app worker

# Terminal 4: Celery Beat
cd server && source .venv/bin/activate && celery -A celery_app beat

# Terminal 5: Mobile (if needed)
cd mobile && flutter run
```

### 2. Code Quality Tools

**Frontend (Next.js):**
```bash
cd app

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm run test
```

**Backend (Django):**
```bash
cd server
source .venv/bin/activate

# Code formatting
black .
isort .

# Linting
ruff check .

# Run tests
python manage.py test

# Check migrations
python manage.py makemigrations --check
```

**Mobile (Flutter):**
```bash
cd mobile

# Analyze code
flutter analyze

# Format code
flutter format .

# Run tests
flutter test
```

### 3. Database Management
```bash
cd server
source .venv/bin/activate

# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database (development only)
python manage.py flush

# Create superuser
python manage.py createsuperuser
```

## Troubleshooting

### Common Issues

**Frontend Issues:**
- **Port 3000 in use**: Kill existing process or change port
- **API connection failed**: Check backend server and environment variables
- **Build errors**: Clear node_modules and reinstall

**Backend Issues:**
- **Database connection failed**: Verify PostgreSQL is running and credentials
- **Migration errors**: Check database permissions and PostGIS extension
- **Redis connection failed**: Ensure Redis server is running

**Mobile Issues:**
- **Flutter version mismatch**: Update Flutter SDK to ^3.8.1
- **Dependencies conflict**: Run `flutter clean` and `flutter pub get`
- **Platform-specific errors**: Check platform configuration files

### Debugging Tools

**Frontend Debugging:**
- Browser Developer Tools
- React Developer Tools extension
- Next.js debugging

**Backend Debugging:**
- Django Debug Toolbar
- Django shell: `python manage.py shell`
- Logging configuration

**Mobile Debugging:**
- Flutter Inspector
- Flutter DevTools
- Platform-specific debugging tools

## Next Steps

After successful setup:

1. **Explore the Codebase**:
   - Review project structure
   - Understand authentication system
   - Explore API endpoints

2. **Run Sample Data**:
   - Create test properties and users
   - Test complete workflows
   - Verify all features work

3. **Development Setup**:
   - Configure your IDE/editor
   - Set up debugging tools
   - Configure version control

4. **Read Documentation**:
   - Check main README files
   - Review API documentation
   - Study database schema

## Support Resources

- **GitHub Repository**: [https://github.com/mruus/real-state](https://github.com/mruus/real-state)
- **Documentation**: This Docusaurus site
- **Issues**: GitHub Issues for bug reports
- **Code Examples**: Review existing codebase

---

*This setup guide is designed for new developers taking over the project. For detailed information, refer to the specific documentation sections and the main README files in each project directory.*

