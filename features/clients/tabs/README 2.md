# Tenant Dashboard Tabs

This directory contains the comprehensive tenant dashboard components for the real estate management system.

## Overview

The tenant dashboard provides a complete view of tenant information, property assignments, billing history, and documents through an organized tab-based interface.

## Components

### Core Components

- **`Header.tsx`** - Reusable header component for all tabs
- **`StatCard.tsx`** - Statistics display card component

### Tab Components

- **`tenantOverview.tsx`** - Main overview with tenant stats and personal information
- **`tenantProperties.tsx`** - Property assignments and contract details
- **`tenantBills.tsx`** - Invoice and payment history
- **`tenantDocuments.tsx`** - Document and media file management

### Demo Components

- **`TenantDashboardDemo.tsx`** - Interactive demo component with various scenarios
- **`mockData.ts`** - Comprehensive mock data for development and testing

## Schema

### `tenantDashboard.ts`

Defines TypeScript types and Zod schemas for:
- Tenant details
- Property assignments
- Payments
- Invoices
- Documents
- Dashboard statistics

## Actions

### `tenantDashboard.ts`

Server action that fetches comprehensive tenant data including:
- Tenant profile information
- Property assignments
- Payment history
- Invoice records
- Document files
- Calculated statistics

## Features

### Overview Tab
- Personal information display
- Account status and verification
- Key statistics (total rent paid, outstanding balance, active contracts, documents)
- Member since date and account type

### Properties Tab
- Current property assignments
- Contract start/end dates
- Rent amounts and currency
- Contract status indicators (Active, Expired, Expiring Soon)
- Parent property information

### Bills Tab
- Invoice history with status indicators
- Payment records
- Outstanding balances
- Download and view actions for invoices

### Documents Tab
- File categorization (images, documents, videos)
- Upload dates and file types
- View and download actions
- Document descriptions

## Usage

### Basic Usage
```tsx
import ClientDetail from '@/features/clients/clientDetail';

// In your page component
<ClientDetail tenantId="tenant-uuid" />
```

### Demo Usage
```tsx
import { TenantDashboardDemo } from '@/features/clients/tabs/components';

// For development and testing
<TenantDashboardDemo />
```

### Mock Data Usage
```tsx
import { 
  mockTenantDashboardData, 
  mockEmptyTenantDashboardData,
  generateMockTenantData 
} from '@/features/clients/tabs/components';

// Use predefined mock data
const dashboardData = mockTenantDashboardData;

// Generate custom mock data
const customData = generateMockTenantData({
  first_name: "Custom",
  last_name: "Tenant",
  email: "custom@example.com"
});
```

## Data Flow

1. **Query**: React Query fetches tenant dashboard data
2. **Action**: Server action aggregates data from multiple API endpoints
3. **Schema**: Zod validates and types the response data
4. **Components**: Tab components render the data with proper error handling

## Styling

- Uses TailwindCSS for consistent styling
- Dark mode support
- Responsive design for mobile and desktop
- Consistent color scheme with the rest of the application

## Testing

Tests are located in `__tests__/tenantDashboard.test.tsx` and cover:
- Component rendering
- Data display
- Error states
- Empty states
- Mock data integration

## Mock Data

The `components/mockData.ts` file provides comprehensive mock data including:

### Predefined Scenarios
- **`mockTenantDashboardData`** - Complete tenant data with all information
- **`mockEmptyTenantDashboardData`** - Tenant with no assignments or payments
- **`mockErrorTenantDashboardData`** - Simulated error response
- **`mockLoadingTenantDashboardData`** - Loading state data

### Helper Functions
- **`generateMockTenantData()`** - Create custom tenant data
- **`generateMockPropertyData()`** - Generate property assignments
- **`generateMockPaymentData()`** - Create payment history

### Demo Component
The `TenantDashboardDemo` component provides an interactive way to:
- Switch between different data scenarios
- Test all dashboard tabs
- Validate component behavior
- Showcase features to stakeholders

## Error Handling

- Loading states with spinners
- Error alerts for failed requests
- Empty state messages for no data
- Graceful fallbacks for missing information

## Performance

- React Query caching for efficient data fetching
- Optimized re-renders with proper component structure
- Lazy loading of tab content
- Efficient data aggregation on the server side 