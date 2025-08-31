---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
---

<div className="hero">
  <h1 className="hero__title">Quick Start Guide</h1>
  <p className="hero__subtitle">
    Get up and running with the Real Estate Management System in minutes
  </p>
</div>

## Prerequisites

Before setting up the Real Estate Management System, ensure you have the following installed:

### System Requirements
- **Operating System**: macOS, Linux, or Windows
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 10GB free space
- **Network**: Stable internet connection for package downloads

### Required Software
- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.13 or higher
- **Flutter**: SDK version ^3.8.1
- **PostgreSQL**: Version 14 or higher with PostGIS extension
- **Redis**: Version 6.0 or higher
- **Git**: Latest version

## Installation Steps

### 1. Clone the Repository

<div className="card">
  <h4>📥 Repository Setup</h4>
  <p>Start by cloning the project repository to your local machine.</p>
  
  ```bash
  git clone https://github.com/mruus/real-state.git
  cd real-state
  ```
</div>

### 2. Frontend Setup (Next.js)

<div className="card">
  <h4>🌐 Frontend Development</h4>
  <p>Set up the Next.js web application with modern React features.</p>
  
  ```bash
  # Navigate to frontend directory
  cd app
  
  # Install dependencies
  npm install
  
  # Create environment file
  cp .env.example .env.local
  
  # Edit .env.local with your configuration
  # Required variables:
  # - NEXT_PUBLIC_API_URL
  # - NEXT_PUBLIC_SITE_NAME
  # - DATABASE_URL
  # - NEXTAUTH_SECRET
  # - NEXTAUTH_URL
  
  # Start development server
  npm run dev
  ```
  
  **Frontend will be available at**: http://localhost:3000
</div>

### 3. Backend Setup (Django)

<div className="card">
  <h4>🐍 Backend Development</h4>
  <p>Configure the Django backend with Python virtual environment and dependencies.</p>
  
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
  
  # Install PDM (Python dependency manager)
  pip install pdm
  
  # Install project dependencies
  pdm install
  
  # Create environment file
  cp .env.example .env
  
  # Edit .env with your configuration
  # Required variables:
  # - DJANGO_SECRET_KEY
  # - DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
  # - REDIS_HOST, REDIS_PORT
  # - SENDGRID_API_KEY
  # - DEFAULT_FROM_EMAIL
  # - ENVIRONMENT
  
  # Run database migrations
  python manage.py migrate
  
  # Create superuser
  python manage.py createsuperuser
  
  # Start Django development server
  python manage.py runserver
  ```
  
  **Backend API will be available at**: http://localhost:8000
</div>

### 4. Database Setup (PostgreSQL)

<div className="card">
  <h4>🗄️ Database Configuration</h4>
  <p>Set up PostgreSQL with PostGIS extension for spatial data support.</p>
  
  ```bash
  # Install PostgreSQL (Ubuntu/Debian)
  sudo apt update
  sudo apt install postgresql postgresql-contrib postgis
  
  # Install PostgreSQL (macOS with Homebrew)
  brew install postgresql postgis
  
  # Install PostgreSQL (Windows)
  # Download from https://www.postgresql.org/download/windows/
  
  # Create database
  sudo -u postgres psql
  CREATE DATABASE real_estate_db;
  CREATE USER real_estate_user WITH PASSWORD 'your_password';
  GRANT ALL PRIVILEGES ON DATABASE real_estate_db TO real_estate_user;
  \q
  
  # Enable PostGIS extension
  sudo -u postgres psql -d real_estate_db -c "CREATE EXTENSION postgis;"
  ```
</div>

### 5. Redis Setup

<div className="card">
  <h4>⚡ Cache & Queue Setup</h4>
  <p>Configure Redis for caching and task queue management.</p>
  
  ```bash
  # Install Redis (Ubuntu/Debian)
  sudo apt install redis-server
  
  # Install Redis (macOS with Homebrew)
  brew install redis
  
  # Install Redis (Windows)
  # Download from https://redis.io/download
  
  # Start Redis server
  redis-server
  
  # Test Redis connection
  redis-cli ping
  # Should return: PONG
  ```
</div>

### 6. Celery Setup (Background Tasks)

<div className="card">
  <h4>🔄 Background Processing</h4>
  <p>Set up Celery for handling background tasks and scheduled jobs.</p>
  
  ```bash
  # Navigate to backend directory (if not already there)
  cd ../server
  
  # Start Celery worker (in a new terminal)
  celery -A celery_app worker --loglevel=info
  
  # Start Celery beat scheduler (in another terminal)
  celery -A celery_app beat --loglevel=info
  ```
</div>

### 7. Mobile Setup (Flutter)

<div className="card">
  <h4>📱 Mobile Development</h4>
  <p>Configure Flutter for cross-platform mobile application development.</p>
  
  ```bash
  # Navigate to mobile directory
  cd ../mobile
  
  # Install Flutter dependencies
  flutter pub get
  
  # Run on connected device or emulator
  flutter run
  
  # For specific platforms:
  flutter run -d chrome    # Web
  flutter run -d windows   # Windows
  flutter run -d macos     # macOS
  flutter run -d linux     # Linux
  ```
</div>

## Environment Configuration

### Frontend (.env.local)
<div className="card">
  <h4>🌐 Frontend Environment</h4>
  <p>Configure the Next.js application environment variables.</p>
  
  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_SITE_NAME=Real Estate Platform
  NEXT_PUBLIC_SITE_DESCRIPTION=Real Estate Management System
  DATABASE_URL=postgresql://username:password@localhost:5432/real_estate_db
  NEXTAUTH_SECRET=your-secret-key-here
  NEXTAUTH_URL=http://localhost:3000
  ```
</div>

### Backend (.env)
<div className="card">
  <h4>🐍 Backend Environment</h4>
  <p>Configure the Django backend environment variables.</p>
  
  ```bash
  DJANGO_SECRET_KEY=your-django-secret-key
  DB_NAME=real_estate_db
  DB_USER=real_estate_user
  DB_PASSWORD=your_password
  DB_HOST=localhost
  DB_PORT=5432
  REDIS_HOST=localhost
  REDIS_PORT=6379
  SENDGRID_API_KEY=your-sendgrid-key
  DEFAULT_FROM_EMAIL=noreply@yourdomain.com
  ENVIRONMENT=development
  ```
</div>

## Verification Steps

<div className="features">
  <div className="feature">
    <h3 className="feature__title">✅ Check Frontend</h3>
    <p>Open http://localhost:3000<br/>
    Should see the login page<br/>
    Check browser console for any errors</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">✅ Check Backend</h3>
    <p>Open http://localhost:8000/admin<br/>
    Login with superuser credentials<br/>
    Check Django admin interface</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">✅ Check API</h3>
    <p>Open http://localhost:8000/api/v1/<br/>
    Should see API endpoints<br/>
    Test authentication endpoints</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">✅ Check Database</h3>
    <p>Connect to PostgreSQL<br/>
    List tables with \dt<br/>
    Check PostGIS extension</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">✅ Check Redis</h3>
    <p>Use redis-cli<br/>
    Test with ping command<br/>
    Should return PONG</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">✅ Check Celery</h3>
    <p>Verify worker is running<br/>
    Check beat scheduler<br/>
    Look for scheduled tasks</p>
  </div>
</div>

## Common Issues and Solutions

### Frontend Issues
- **Port 3000 in use**: Change port in package.json or kill existing process
- **API connection failed**: Check backend server and API URL in .env.local
- **Build errors**: Clear node_modules and reinstall dependencies

### Backend Issues
- **Database connection failed**: Verify PostgreSQL is running and credentials are correct
- **Migration errors**: Check database permissions and PostGIS extension
- **Redis connection failed**: Ensure Redis server is running

### Mobile Issues
- **Flutter version mismatch**: Update Flutter SDK to ^3.8.1
- **Dependencies conflict**: Run `flutter clean` and `flutter pub get`
- **Platform-specific errors**: Check platform configuration files

## Development Workflow

### 1. **Daily Development**
<div className="card">
  <h4>🚀 Start All Services</h4>
  
  ```bash
  # Start all services
  cd real-state
  make start
  
  # Or start individually:
  # Terminal 1: Frontend
  cd app && npm run dev
  
  # Terminal 2: Backend
  cd server && python manage.py runserver
  
  # Terminal 3: Celery Worker
  cd server && celery -A celery_app worker
  
  # Terminal 4: Celery Beat
  cd server && celery -A celery_app beat
  
  # Terminal 5: Mobile (if needed)
  cd mobile && flutter run
  ```
</div>

### 2. **Code Changes**
- Make changes in your preferred editor
- Frontend changes auto-reload at http://localhost:3000
- Backend changes auto-reload at http://localhost:8000
- Mobile changes require hot reload or restart

### 3. **Testing Changes**
- Test frontend functionality in browser
- Test API endpoints with tools like Postman
- Test mobile app on target devices
- Run automated tests: `npm test`, `python manage.py test`

## Next Steps

After successful setup:

<div className="features">
  <div className="feature">
    <h3 className="feature__title">🔍 Explore the Codebase</h3>
    <p>Review the project structure<br/>
    Understand the authentication system<br/>
    Explore API endpoints</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">📚 Read Documentation</h3>
    <p>Check the main README files<br/>
    Review API documentation<br/>
    Study the database schema</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">🧪 Run Sample Data</h3>
    <p>Create test properties and users<br/>
    Test the complete workflow<br/>
    Verify all features work correctly</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">⚙️ Development Setup</h3>
    <p>Configure your IDE/editor<br/>
    Set up debugging tools<br/>
    Configure version control</p>
  </div>
</div>

## Support

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify environment variables** are set correctly
3. **Ensure all services** are running
4. **Check the GitHub repository** for known issues
5. **Review the documentation** for configuration details

---

*This quick start guide is designed for new developers taking over the project. For detailed information, refer to the specific documentation sections.* 

