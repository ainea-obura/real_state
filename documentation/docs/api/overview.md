---
id: overview
title: API Overview
sidebar_label: Overview
sidebar_position: 1
---

# API Reference Overview

## Introduction

The Real Estate Management System provides a comprehensive REST API built with Django REST Framework (DRF). The API follows REST principles and provides access to all system functionality including authentication, property management, financial operations, and user management.

## API Base Information

- **Base URL**: `http://localhost:8000/api/v1/`
- **Authentication**: JWT (JSON Web Tokens)
- **Content Type**: `application/json`
- **API Version**: v1
- **Documentation**: Auto-generated with DRF Spectacular

## Authentication System

### JWT Token Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    
    Client->>API: POST /auth/login/
    API->>Auth: Validate credentials
    Auth->>API: Generate JWT tokens
    API->>Client: Return access + refresh tokens
    
    Client->>API: Use access token in Authorization header
    API->>Client: Return protected data
    
    Client->>API: POST /auth/refresh/ (when token expires)
    API->>Client: Return new access token
```

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login/` | POST | User login with email/password |
| `/auth/refresh/` | POST | Refresh access token |
| `/auth/logout/` | POST | User logout and token invalidation |
| `/auth/verify/` | POST | Verify token validity |
| `/auth/change-password/` | POST | Change user password |
| `/auth/forgot-password/` | POST | Request password reset |
| `/auth/reset-password/` | POST | Reset password with token |

### Token Usage

```bash
# Include token in request headers
Authorization: Bearer <access_token>

# Example request
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     http://localhost:8000/api/v1/properties/
```

## Core API Modules

### 1. User Management (`/accounts/`)

**Endpoints:**
- `GET /accounts/users/` - List users
- `POST /accounts/users/` - Create user
- `GET /accounts/users/{id}/` - Get user details
- `PUT /accounts/users/{id}/` - Update user
- `DELETE /accounts/users/{id}/` - Delete user
- `GET /accounts/profile/` - Get current user profile
- `PUT /accounts/profile/` - Update current user profile

**User Roles:**
- **Admin**: Full system access
- **Owner**: Property owner access
- **Agent**: Real estate agent access
- **Tenant**: Tenant access
- **Staff**: Staff member access

### 2. Company Management (`/companies/`)

**Endpoints:**
- `GET /companies/` - List companies
- `POST /companies/` - Create company
- `GET /companies/{id}/` - Get company details
- `PUT /companies/{id}/` - Update company
- `DELETE /companies/{id}/` - Delete company
- `POST /companies/{id}/onboard/` - Complete company onboarding

**Company Features:**
- Business information management
- Onboarding workflow
- Document verification
- Staff management

### 3. Property Management (`/projects/`)

**Endpoints:**
- `GET /projects/` - List properties
- `POST /projects/` - Create property
- `GET /projects/{id}/` - Get property details
- `PUT /projects/{id}/` - Update property
- `DELETE /projects/{id}/` - Delete property
- `GET /projects/{id}/units/` - List property units
- `POST /projects/{id}/units/` - Create property unit

**Property Features:**
- Location data (PostGIS integration)
- Unit management
- Media attachments
- Availability status
- Property features and amenities

### 4. Financial Management (`/finance/`)

**Endpoints:**
- `GET /finance/invoices/` - List invoices
- `POST /finance/invoices/` - Create invoice
- `GET /finance/invoices/{id}/` - Get invoice details
- `PUT /finance/invoices/{id}/` - Update invoice
- `DELETE /finance/invoices/{id}/` - Delete invoice
- `POST /finance/invoices/{id}/send/` - Send invoice
- `GET /finance/transactions/` - List transactions
- `GET /finance/payouts/` - List payouts
- `POST /finance/payouts/` - Create payout

**Financial Features:**
- Invoice generation and management
- Payment processing
- Transaction tracking
- Payout management
- Financial reporting

### 5. Sales Management (`/sales/`)

**Endpoints:**
- `GET /sales/contracts/` - List contracts
- `POST /sales/contracts/` - Create contract
- `GET /sales/contracts/{id}/` - Get contract details
- `PUT /sales/contracts/{id}/` - Update contract
- `DELETE /sales/contracts/{id}/` - Delete contract
- `GET /sales/offers/` - List offers
- `POST /sales/offers/` - Create offer
- `GET /sales/commissions/` - List commissions

**Sales Features:**
- Contract management
- Offer processing
- Commission tracking
- Sales pipeline
- Reporting and analytics

### 6. Document Management (`/documents/`)

**Endpoints:**
- `GET /documents/` - List documents
- `POST /documents/` - Upload document
- `GET /documents/{id}/` - Get document details
- `PUT /documents/{id}/` - Update document
- `DELETE /documents/{id}/` - Delete document
- `GET /documents/{id}/download/` - Download document
- `POST /documents/{id}/share/` - Share document

**Document Features:**
- File upload and storage
- Document categorization
- Access control
- Version management
- Sharing and collaboration

### 7. Dashboard & Analytics (`/dashboard/`)

**Endpoints:**
- `GET /dashboard/overview/` - Dashboard overview
- `GET /dashboard/stats/` - Key statistics
- `GET /dashboard/revenue/` - Revenue analytics
- `GET /dashboard/properties/` - Property analytics
- `GET /dashboard/users/` - User analytics
- `GET /dashboard/activity/` - Recent activity

**Dashboard Features:**
- Real-time data visualization
- Key performance indicators
- Financial analytics
- User activity tracking
- Custom reporting

## API Response Format

### Success Response

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Sample Property",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Property created successfully"
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "name": ["This field is required."],
      "price": ["Enter a valid number."]
    }
  }
}
```

### Pagination Response

```json
{
  "status": "success",
  "data": {
    "results": [...],
    "count": 150,
    "next": "http://localhost:8000/api/v1/properties/?page=2",
    "previous": null,
    "page": 1,
    "total_pages": 15
  }
}
```

## Request/Response Examples

### Create Property

**Request:**
```bash
POST /api/v1/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sunset Apartments",
  "description": "Luxury apartment complex",
  "address": "123 Sunset Blvd",
  "city": "Los Angeles",
  "state": "CA",
  "zip_code": "90210",
  "property_type": "apartment",
  "total_units": 50,
  "price": 2500000.00
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Sunset Apartments",
    "description": "Luxury apartment complex",
    "address": "123 Sunset Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip_code": "90210",
    "property_type": "apartment",
    "total_units": 50,
    "price": "2500000.00",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "Property created successfully"
}
```

### Get Properties with Filtering

**Request:**
```bash
GET /api/v1/projects/?property_type=apartment&city=Los Angeles&min_price=1000000&max_price=5000000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "id": 1,
        "name": "Sunset Apartments",
        "property_type": "apartment",
        "city": "Los Angeles",
        "price": "2500000.00"
      }
    ],
    "count": 1,
    "next": null,
    "previous": null,
    "page": 1,
    "total_pages": 1
  }
}
```

## Filtering and Search

### Query Parameters

**Common Filters:**
- `search`: Text search across multiple fields
- `ordering`: Sort by specific fields
- `page`: Page number for pagination
- `page_size`: Number of items per page

**Property Filters:**
- `property_type`: Filter by property type
- `city`, `state`, `zip_code`: Location filters
- `min_price`, `max_price`: Price range
- `status`: Property status (available, rented, sold)
- `features`: Filter by property features

**Date Filters:**
- `created_after`: Items created after date
- `created_before`: Items created before date
- `updated_after`: Items updated after date
- `updated_before`: Items updated before date

### Search Examples

```bash
# Search properties by name
GET /api/v1/projects/?search=sunset

# Filter by property type and price range
GET /api/v1/projects/?property_type=apartment&min_price=1000000&max_price=5000000

# Sort by price descending
GET /api/v1/projects/?ordering=-price

# Combine multiple filters
GET /api/v1/projects/?property_type=apartment&city=Los Angeles&min_price=1000000&ordering=-created_at
```

## Rate Limiting

### Rate Limit Rules

- **Authentication endpoints**: 5 requests per minute
- **Read operations**: 1000 requests per hour
- **Write operations**: 100 requests per hour
- **File uploads**: 10 requests per hour

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_ERROR` | Authentication failed |
| `PERMISSION_ERROR` | Insufficient permissions |
| `NOT_FOUND_ERROR` | Resource not found |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |

## WebSocket Support

### Real-time Features

- **Notifications**: Real-time user notifications
- **Dashboard Updates**: Live dashboard data updates
- **Chat**: Real-time messaging system
- **Property Updates**: Live property status changes

### WebSocket Connection

```javascript
// Connect to WebSocket
const socket = new WebSocket('ws://localhost:8000/ws/');

// Listen for messages
socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send message
socket.send(JSON.stringify({
  type: 'subscribe',
  channel: 'notifications'
}));
```

## Testing the API

### Using curl

```bash
# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Get properties with token
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/projects/
```

### Using Postman

1. **Import Collection**: Use the provided Postman collection
2. **Set Environment Variables**: Configure base URL and tokens
3. **Test Endpoints**: Run through all API endpoints
4. **Validate Responses**: Check response formats and status codes

## API Documentation

### Interactive Documentation

- **Swagger UI**: Available at `/api/docs/`
- **ReDoc**: Available at `/api/redoc/`
- **OpenAPI Schema**: Available at `/api/schema/`

### Documentation Features

- **Interactive Testing**: Test endpoints directly from browser
- **Request/Response Examples**: Sample requests and responses
- **Authentication**: Built-in authentication testing
- **Schema Validation**: Automatic request/response validation

## Best Practices

### For API Consumers

1. **Always handle errors gracefully**
2. **Implement proper retry logic**
3. **Cache responses when appropriate**
4. **Use pagination for large datasets**
5. **Validate responses before processing**

### For API Developers

1. **Follow REST conventions**
2. **Implement proper validation**
3. **Use consistent error formats**
4. **Document all endpoints**
5. **Implement rate limiting**
6. **Add comprehensive logging**

---

*This API overview provides the foundation for integrating with the Real Estate Management System. For detailed endpoint information, refer to the interactive API documentation at `/api/docs/` when the backend is running.*

