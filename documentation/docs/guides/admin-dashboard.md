---
id: admin-dashboard
title: Admin Dashboard Guide
sidebar_label: Admin Dashboard
sidebar_position: 1
---

# Admin Dashboard Guide

## Overview

The Admin Dashboard is the central control center for the Real Estate Management System, providing administrators with comprehensive tools to manage all aspects of the platform. This guide covers the dashboard's features, functionality, and technical implementation for developers taking over the project.

## Dashboard Architecture

### Frontend Structure

```
app/(dashboard)/
├── page.tsx                 # Main dashboard page
├── layout.tsx               # Dashboard layout wrapper
├── clients/                 # Client management
├── finance/                 # Financial operations
├── management/              # Property management
├── projects/                # Project management
├── property/                # Property features
├── sales/                   # Sales management
├── settings/                # System settings
└── components/              # Dashboard-specific components
```

### Key Components

- **StatsCards**: Real-time statistics display
- **Navigation**: Role-based menu system
- **DataTables**: Interactive data management
- **Charts**: Visual analytics and reporting
- **Forms**: CRUD operations for all entities

## Dashboard Features

### 1. Overview Dashboard

**Main Statistics Cards:**
- Total Properties
- Active Leases
- Monthly Revenue
- Pending Payments
- Active Users
- System Health

**Real-time Updates:**
- Live data refresh every 30 seconds
- WebSocket notifications for critical events
- Real-time chart updates

**Quick Actions:**
- Create new property
- Generate reports
- Send notifications
- System maintenance

### 2. User Management

**User Types:**
- **Administrators**: Full system access
- **Property Owners**: Property portfolio management
- **Real Estate Agents**: Sales and leasing activities
- **Tenants**: Lease and payment management
- **Staff Members**: Limited access based on role

**User Operations:**
- Create and manage user accounts
- Assign roles and permissions
- Monitor user activity
- Handle account verification
- Manage user sessions

**Permission System:**
```typescript
// Permission-based access control
interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Example permissions
const permissions = {
  'properties:read': true,
  'properties:write': user.role === 'admin',
  'finance:read': user.role === 'admin' || user.role === 'owner',
  'users:manage': user.role === 'admin'
};
```

### 3. Property Management

**Property Operations:**
- Add new properties with detailed information
- Manage property units and amenities
- Handle property media (images, documents, videos)
- Track property availability and status
- Manage property features and specifications

**Location Management:**
- PostGIS integration for spatial data
- Map-based property visualization
- Geographic search and filtering
- Address validation and geocoding

**Property Types:**
- Residential (apartments, houses, condos)
- Commercial (offices, retail, industrial)
- Land (vacant lots, agricultural)
- Mixed-use developments

### 4. Financial Management

**Revenue Tracking:**
- Rent collection and tracking
- Payment processing and reconciliation
- Invoice generation and management
- Expense tracking and categorization
- Financial reporting and analytics

**Payment Processing:**
- Multiple payment gateway integration
- Automated payment scheduling
- Late fee calculation and application
- Payment reminder system
- Refund and adjustment handling

**Financial Reports:**
- Monthly revenue reports
- Expense analysis
- Profit and loss statements
- Cash flow analysis
- Tax reporting support

### 5. Sales Management

**Sales Pipeline:**
- Lead tracking and management
- Offer processing and negotiation
- Contract creation and management
- Commission tracking and calculation
- Sales performance analytics

**Contract Management:**
- Digital contract generation
- Electronic signature integration
- Contract lifecycle management
- Amendment and renewal handling
- Compliance monitoring

**Commission System:**
- Agent commission calculation
- Commission splitting rules
- Payment scheduling
- Performance tracking
- Commission reporting

### 6. Document Management

**Document Types:**
- Property documents (deeds, surveys, permits)
- Lease agreements and contracts
- Financial documents (invoices, receipts)
- Legal documents and compliance
- Marketing materials and photos

**Document Features:**
- Secure file storage with MinIO
- Version control and history
- Access control and sharing
- Document categorization and tagging
- Full-text search capabilities

**File Operations:**
- Upload and download
- Preview and conversion
- Bulk operations
- Document workflow management
- Backup and archiving

### 7. Reporting and Analytics

**Standard Reports:**
- Property performance reports
- Financial summary reports
- User activity reports
- System usage reports
- Compliance and audit reports

**Custom Reports:**
- Report builder interface
- Custom metrics and KPIs
- Scheduled report generation
- Export to multiple formats (PDF, Excel, CSV)
- Email delivery and sharing

**Analytics Dashboard:**
- Interactive charts and graphs
- Trend analysis and forecasting
- Comparative analysis
- Drill-down capabilities
- Real-time data visualization

## Technical Implementation

### State Management

**Global State (Jotai):**
```typescript
// Dashboard state atoms
export const dashboardStatsAtom = atom({
  totalProperties: 0,
  activeLeases: 0,
  monthlyRevenue: 0,
  pendingPayments: 0
});

export const userPermissionsAtom = atom({
  canManageUsers: false,
  canManageProperties: false,
  canViewFinance: false,
  canManageSettings: false
});
```

**Server State (React Query):**
```typescript
// Dashboard data fetching
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => fetchDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });
};

export const useUserPermissions = () => {
  return useQuery({
    queryKey: ['user', 'permissions'],
    queryFn: () => fetchUserPermissions(),
    staleTime: Infinity // Permissions don't change often
  });
};
```

### Data Fetching

**API Integration:**
```typescript
// Dashboard API functions
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await fetch('/api/v1/dashboard/stats/', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getRecentActivity: async (): Promise<Activity[]> => {
    const response = await fetch('/api/v1/dashboard/activity/', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  generateReport: async (params: ReportParams): Promise<Report> => {
    const response = await fetch('/api/v1/reports/generate/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    return response.json();
  }
};
```

### Real-time Updates

**WebSocket Integration:**
```typescript
// WebSocket connection for real-time updates
export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/');
    
    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'dashboard_updates'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleDashboardUpdate(data);
    };

    ws.onclose = () => setIsConnected(false);
    
    setSocket(ws);

    return () => ws.close();
  }, []);

  return { socket, isConnected };
};
```

### Permission System

**Permission Gate Component:**
```typescript
// Permission-based access control component
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null
}) => {
  const { data: permissions } = useUserPermissions();
  
  if (!permissions || !permissions[permission]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Usage example
<PermissionGate permission="properties:write">
  <CreatePropertyButton />
</PermissionGate>
```

## Dashboard Components

### 1. StatsCards Component

```typescript
// Statistics display component
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  color
}) => {
  return (
    <div className={`stats-card stats-card--${color}`}>
      <div className="stats-card__icon">{icon}</div>
      <div className="stats-card__content">
        <h3 className="stats-card__title">{title}</h3>
        <div className="stats-card__value">{value}</div>
        {change && (
          <div className={`stats-card__change stats-card__change--${change > 0 ? 'positive' : 'negative'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2. DataTable Component

```typescript
// Data table with filtering and pagination
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterConfig[];
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  filters,
  pagination,
  onRowClick
}: DataTableProps<T>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="data-table">
      <DataTableToolbar table={table} filters={filters} />
      <DataTableContent table={table} onRowClick={onRowClick} />
      <DataTablePagination table={table} config={pagination} />
    </div>
  );
};
```

### 3. Chart Components

```typescript
// Chart components for analytics
interface ChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie' | 'area';
  options?: any;
}

export const Chart: React.FC<ChartProps> = ({ data, type, options }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current);
      chart.setOption({
        ...getDefaultOptions(type),
        ...options,
        series: [{ data, type }]
      });

      return () => chart.dispose();
    }
  }, [data, type, options]);

  return <div ref={chartRef} className="chart" />;
};
```

## Dashboard Configuration

### Environment Variables

```bash
# Dashboard configuration
NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL=30000
NEXT_PUBLIC_DASHBOARD_CHART_THEME=light
NEXT_PUBLIC_DASHBOARD_DEFAULT_PAGE_SIZE=25
NEXT_PUBLIC_DASHBOARD_ENABLE_REAL_TIME=true
NEXT_PUBLIC_DASHBOARD_WEBSOCKET_URL=ws://localhost:8000/ws/
```

### Feature Flags

```typescript
// Feature flag configuration
export const dashboardFeatures = {
  realTimeUpdates: process.env.NEXT_PUBLIC_DASHBOARD_ENABLE_REAL_TIME === 'true',
  advancedAnalytics: process.env.NEXT_PUBLIC_DASHBOARD_ADVANCED_ANALYTICS === 'true',
  customReports: process.env.NEXT_PUBLIC_DASHBOARD_CUSTOM_REPORTS === 'true',
  bulkOperations: process.env.NEXT_PUBLIC_DASHBOARD_BULK_OPERATIONS === 'true'
};
```

## Performance Optimization

### 1. Data Caching

```typescript
// Optimized data fetching with caching
export const useOptimizedDashboardData = () => {
  const queryClient = useQueryClient();

  // Prefetch dashboard data
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard', 'stats'],
      queryFn: () => fetchDashboardStats(),
      staleTime: 30000
    });
  }, [queryClient]);

  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => fetchDashboardStats(),
    refetchInterval: 30000,
    staleTime: 10000,
    gcTime: 300000 // 5 minutes
  });
};
```

### 2. Lazy Loading

```typescript
// Lazy load dashboard sections
const DashboardSection = lazy(() => import('./DashboardSection'));

export const Dashboard = () => {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardSection />
    </Suspense>
  );
};
```

### 3. Virtual Scrolling

```typescript
// Virtual scrolling for large datasets
export const VirtualizedDataTable = <T extends Record<string, any>>({
  data,
  columns
}: DataTableProps<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  });

  return (
    <div ref={parentRef} className="virtualized-table">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            {/* Row content */}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Security Considerations

### 1. Input Validation

```typescript
// Input validation for dashboard operations
export const validateDashboardInput = (input: any): ValidationResult => {
  const schema = z.object({
    dateRange: z.object({
      start: z.date(),
      end: z.date()
    }).refine(data => data.end > data.start, {
      message: "End date must be after start date"
    }),
    filters: z.record(z.any()).optional(),
    exportFormat: z.enum(['pdf', 'excel', 'csv']).optional()
  });

  try {
    const validated = schema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    return { success: false, error: error.errors };
  }
};
```

### 2. XSS Prevention

```typescript
// XSS prevention in dashboard
export const sanitizeDashboardData = (data: any): any => {
  return DOMPurify.sanitize(data, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
};
```

### 3. CSRF Protection

```typescript
// CSRF token handling
export const useCSRFProtection = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    fetch('/api/csrf-token/')
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken));
  }, []);

  const apiCall = useCallback(async (url: string, options: RequestInit) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': csrfToken
      }
    });
  }, [csrfToken]);

  return { csrfToken, apiCall };
};
```

## Testing

### 1. Unit Tests

```typescript
// Dashboard component tests
describe('Dashboard', () => {
  it('renders dashboard stats correctly', () => {
    const mockStats = {
      totalProperties: 100,
      activeLeases: 75,
      monthlyRevenue: 50000
    };

    render(<Dashboard />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('handles permission restrictions', () => {
    const mockPermissions = {
      canManageUsers: false,
      canViewFinance: true
    };

    render(<Dashboard permissions={mockPermissions} />);
    
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    expect(screen.getByText('Financial Reports')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

```typescript
// Dashboard integration tests
describe('Dashboard Integration', () => {
  it('fetches and displays real-time data', async () => {
    const mockApiResponse = {
      totalProperties: 100,
      activeLeases: 75
    };

    server.use(
      rest.get('/api/v1/dashboard/stats', (req, res, ctx) => {
        return res(ctx.json(mockApiResponse));
      })
    );

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Dashboard not loading**: Check API connectivity and authentication
2. **Real-time updates not working**: Verify WebSocket connection and permissions
3. **Charts not rendering**: Check data format and chart library dependencies
4. **Performance issues**: Review data fetching strategy and caching configuration

### Debug Tools

```typescript
// Dashboard debugging utilities
export const dashboardDebug = {
  logState: (state: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Dashboard State:', state);
    }
  },

  logPerformance: (operation: string, duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${operation} took ${duration}ms`);
    }
  },

  validateData: (data: any) => {
    // Data validation logic
    return data && typeof data === 'object';
  }
};
```

## Next Steps

After understanding the admin dashboard:

1. **Explore the Codebase**: Review the dashboard implementation
2. **Test Functionality**: Run the dashboard and test all features
3. **Customize**: Modify dashboard components as needed
4. **Extend**: Add new dashboard features and reports
5. **Optimize**: Improve performance and user experience

---

*This admin dashboard guide provides comprehensive information for developers taking over the project. For implementation details, refer to the dashboard components and API endpoints.*

