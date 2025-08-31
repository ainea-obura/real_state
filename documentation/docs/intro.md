---
id: intro
title: Real Estate Management System
sidebar_label: Introduction
---

<div className="hero">
  <h1 className="hero__title">Real Estate Management System</h1>
  <p className="hero__subtitle">
    Comprehensive developer guide for the Real Estate Management Platform
  </p>
  <div className="hero__buttons">
    <a href="/docs/quick-start" className="button">
      Get Started
    </a>
    <a href="/docs/architecture/overview" className="button button--secondary">
      View Architecture
    </a>
  </div>
</div>

## Project Overview

The Real Estate Management System is a comprehensive, full-stack platform designed to manage real estate properties, clients, financial operations, and business processes. This system serves property owners, real estate agents, tenants, and administrative staff with a complete suite of tools for real estate management.

## Project Information

- **Project Name**: Real Estate Management System
- **Repository**: [https://github.com/mruus/real-state](https://github.com/mruus/real-state)
- **Developers**: 
  - Mansuur Abdullahi ([@mruus](https://github.com/mruus))
  - Mohamud Ali Abshir ([@mhbaando](https://github.com/mhbaando))
- **Project Type**: Full-stack real estate management platform
- **Architecture**: Three-tier architecture (Frontend, Backend, Mobile)

## System Architecture

<div className="card">
  <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.4' }}>
    <div style={{ marginBottom: '1rem' }}>
      ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │   Frontend      │    │    Backend      │    │     Mobile      │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │   (Next.js)     │◄──►│   (Django)      │◄──►│   (Flutter)     │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │                 │    │                 │    │                 │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │ • React 19      │    │ • Python 3.13   │    │ • Dart/Flutter  │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │ • TypeScript    │    │ • PostgreSQL    │    │ • GetX State    │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │ • Tailwind CSS  │    │ • Redis         │    │ • JWT Auth      │
    </div>
    <div style={{ marginBottom: '1rem' }}>
      │ • JWT Auth      │    │ • Celery        │    │ • Multi-platform│
    </div>
    <div>
      └─────────────────┘    └─────────────────┘    └─────────────────┘
    </div>
  </div>
</div>

## Core Business Domains

<div className="features">
  <div className="feature">
    <h3 className="feature__title">🏢 Property Management</h3>
    <p>Property listing and categorization, location-based search (PostGIS integration), availability tracking, maintenance requests, and document management.</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">👥 Client Management</h3>
    <p><strong>Owner Management:</strong> Property owners and portfolios<br/>
    <strong>Agent Management:</strong> Real estate agents and activities<br/>
    <strong>Tenant Management:</strong> Tenant profiles and lease management<br/>
    <strong>Company Management:</strong> Business entities and partnerships</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">💰 Financial Operations</h3>
    <p>Payment processing and tracking, invoice generation and management, expense tracking and categorization, payout management for property owners, financial reporting and analytics, penalty and late fee management.</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">📊 Sales & Contracts</h3>
    <p>Sales pipeline management, contract creation and management, offer letter processing, commission tracking for agents, sales reporting and analytics.</p>
  </div>
  
  <div className="feature">
    <h3 className="feature__title">🔐 Authentication & Security</h3>
    <p>Multi-role user system (Owner, Agent, Tenant, Admin), JWT-based authentication with refresh tokens, role-based access control (RBAC), permission-based menu system, two-factor authentication support.</p>
  </div>
</div>

## Technology Stack

### Frontend (Web Application)
- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript
- **State Management**: Jotai + React Query
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with JWT
- **Data Fetching**: TanStack React Query v5
- **Forms**: React Hook Form + Zod validation

### Backend (API & Services)
- **Framework**: Django 5.1.5+ with DRF 3.15.2+
- **Language**: Python 3.13
- **Database**: PostgreSQL with PostGIS (GeoDjango)
- **Cache & Queue**: Redis + Celery
- **Authentication**: JWT with Two-Factor Auth
- **File Storage**: MinIO/S3 compatible
- **API Documentation**: OpenAPI/Swagger (DRF Spectacular)

### Mobile (Cross-Platform)
- **Framework**: Flutter SDK ^3.8.1
- **Language**: Dart
- **Platforms**: iOS, Android, Web, Windows, macOS, Linux
- **State Management**: GetX (State + Navigation + DI)
- **Authentication**: JWT with automatic refresh
- **Storage**: Secure storage + local preferences

## Project Structure

<div className="card">
  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }}>
    <div>real-state/</div>
    <div style={{ marginLeft: '1rem' }}>├── app/                    # Next.js frontend application</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── (auth)/            # Authentication routes</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── (dashboard)/       # Dashboard routes</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── api/               # API routes</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── provider/          # Global providers</div>
    <div style={{ marginLeft: '2rem' }}>│   └── layout.tsx         # Root layout</div>
    <div style={{ marginLeft: '1rem' }}>├── components/             # Reusable UI components</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── ui/                # shadcn/ui components</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── datatable/         # Data table components</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── navBar/            # Navigation components</div>
    <div style={{ marginLeft: '2rem' }}>│   └── stats/             # Statistics components</div>
    <div style={{ marginLeft: '1rem' }}>├── features/               # Feature-based components</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── auth/              # Authentication features</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── clients/           # Client management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── dashboard/         # Dashboard features</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── finance/           # Financial management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── management/        # Property management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── projects/          # Project management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── property/          # Property features</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── sales/             # Sales features</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── services/          # Service management</div>
    <div style={{ marginLeft: '2rem' }}>│   └── settings/          # Settings management</div>
    <div style={{ marginLeft: '1rem' }}>├── server/                 # Django backend application</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── src/               # Django project configuration</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── accounts/          # User management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── properties/        # Property management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── payments/          # Financial services</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── sales/             # Sales management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── documents/         # Document management</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── notifications/     # Notification system</div>
    <div style={{ marginLeft: '2rem' }}>│   └── [other modules]    # Additional features</div>
    <div style={{ marginLeft: '1rem' }}>├── mobile/                 # Flutter mobile application</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── lib/               # Dart source code</div>
    <div style={{ marginLeft: '2rem' }}>│   ├── core/              # Core application layer</div>
    <div style={{ marginLeft: '2rem' }}>│   └── features/          # Feature modules</div>
    <div style={{ marginLeft: '1rem' }}>├── docs/                   # Project documentation</div>
    <div style={{ marginLeft: '1rem' }}>└── documentation/          # Docusaurus developer docs</div>
  </div>
</div>

## Key Features for Developers

### 🔧 Development Tools
- **Code Quality**: Ruff, Black, isort for Python; ESLint, Prettier for TypeScript
- **Testing**: Django test framework, Jest + React Testing Library, Flutter test framework
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Database Migrations**: Django's built-in migration system
- **Task Queues**: Celery with Redis for background processing

### 📱 Cross-Platform Support
- **Web**: Responsive Next.js application
- **Mobile**: Native iOS and Android apps
- **Desktop**: Windows, macOS, and Linux applications
- **API**: RESTful API with WebSocket support

### 🚀 Performance Features
- **Caching**: Redis-based caching system
- **Database Optimization**: Query optimization with select_related/prefetch_related
- **Frontend Optimization**: React Query, code splitting, lazy loading
- **Mobile Optimization**: Efficient state management, image caching

## Getting Started for New Developers

### 1. **Environment Setup**
- Install required dependencies (Node.js, Python, Flutter, PostgreSQL, Redis)
- Clone the repository and set up environment variables
- Run the development servers for all platforms

### 2. **Understanding the Codebase**
- Start with the main README files in each project directory
- Review the API endpoints and database schema
- Understand the authentication and permission system
- Explore the feature-based component structure

### 3. **Development Workflow**
- Use feature branches for development
- Follow the established code quality standards
- Test changes across all platforms
- Update documentation as needed

### 4. **Key Areas to Focus On**
- **Authentication System**: JWT tokens, permissions, role management
- **API Integration**: REST API structure, WebSocket support
- **Database Design**: PostgreSQL models, GeoDjango integration
- **State Management**: Frontend state patterns, mobile state management
- **File Management**: MinIO integration, document handling

## Project Transfer Notes

This documentation is specifically designed to help new developers understand and take over the project. The system is production-ready with comprehensive features covering all aspects of real estate management.

**Critical Areas for New Developers:**
1. **Architecture Understanding**: Study the three-tier architecture and how components interact
2. **Business Logic**: Understand the real estate domain and business processes
3. **API Mastery**: Learn the REST API structure and authentication patterns
4. **Database Knowledge**: Review the PostgreSQL schema and GeoDjango integration
5. **Deployment Process**: Learn the deployment procedures for all platforms

## Support and Resources

- **Repository**: [https://github.com/mruus/real-state](https://github.com/mruus/real-state)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: This Docusaurus site for comprehensive developer guides
- **Code Examples**: Review the existing codebase for implementation patterns

---

*This documentation is maintained for project transfer purposes. For questions about the codebase, please refer to the GitHub repository or contact the original developers.*
