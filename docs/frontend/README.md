# Frontend Documentation - HoyHub Real Estate Platform

## 🎯 **Overview**

The frontend of HoyHub is built with **Next.js 15.3.1** using the **App Router** architecture. It's a modern, responsive web application that provides an intuitive interface for real estate management operations.

### **Key Design Principles**
- **Component-First Architecture**: Reusable, composable components
- **Type Safety**: Full TypeScript implementation
- **Performance**: Optimized rendering and data fetching
- **Accessibility**: WCAG compliant design
- **Responsive**: Mobile-first responsive design

---

## 🚀 **Technology Stack**

### **Core Framework**
- **Next.js**: 15.3.1 with App Router
- **React**: 19.x with latest features
- **TypeScript**: 5.x for type safety
- **Node.js**: 18+ runtime

### **State Management**
- **Jotai**: Atomic state management for local state
- **React Query**: Server state management and caching
- **Context API**: Global state and theme management

### **UI & Styling**
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality component library
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icon library
- **Hugeicons**: Additional icon set
- **React Icons**: Popular icon libraries

### **Data & Forms**
- **React Hook Form**: Performant form handling
- **Zod**: Schema validation and type inference
- **React Query**: Data fetching and caching
- **Axios**: HTTP client for API calls

### **Maps & Visualization**
- **Mapbox GL JS**: Interactive maps
- **React Map GL**: React wrapper for Mapbox
- **Recharts**: Data visualization charts
- **TinyMCE**: Rich text editor

### **Development Tools**
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Next.js DevTools**: Development utilities

---

## 📁 **Project Structure**

```
app/                          # Next.js App Router pages
├── (auth)/                   # Authentication routes (grouped)
│   ├── create-company/      # Company creation
│   ├── forget-password/     # Password recovery
│   ├── reset-password/      # Password reset
│   ├── sign-in/             # User login
│   ├── sign-up/             # User registration
│   ├── user-type/           # User type selection
│   ├── verify-email/        # Email verification
│   ├── verify-otp/          # OTP verification
│   └── verify-password-reset-otp/ # Password reset OTP
├── (dashboard)/              # Dashboard routes (grouped)
│   ├── clients/             # Client management
│   ├── finance/             # Financial operations
│   ├── managements/         # Property management
│   ├── projects/            # Project management
│   ├── property/            # Property features
│   ├── sales/               # Sales management
│   └── settings/            # System settings
├── api/                      # API routes
│   ├── auth/                # Authentication endpoints
│   ├── clear-verify-cookie/ # Cookie management
│   ├── download-pdf/        # PDF download
│   ├── get-remaining-time/  # Time utilities
│   └── set-retry-timer/     # Retry mechanism
├── provider/                 # Global providers
├── layout.tsx               # Root layout
└── globals.css              # Global styles

components/                    # Reusable UI components
├── ui/                      # shadcn/ui components
│   ├── alert-dialog.tsx     # Alert dialogs
│   ├── alert.tsx            # Alert components
│   ├── button.tsx           # Button components
│   ├── card.tsx             # Card components
│   ├── dialog.tsx           # Dialog components
│   ├── dropdown-menu.tsx    # Dropdown menus
│   ├── form.tsx             # Form components
│   ├── input.tsx            # Input fields
│   ├── label.tsx            # Label components
│   ├── select.tsx           # Select dropdowns
│   ├── table.tsx            # Table components
│   └── [other components]   # Additional UI components
├── datatable/               # Data table components
│   ├── data-table-column-header.tsx
│   ├── data-table-faceted-filter.tsx
│   ├── data-table-pagination.tsx
│   └── [table utilities]
├── navBar/                  # Navigation components
├── stats/                   # Statistics components
├── providers/               # Context providers
│   ├── PermissionProvider.tsx
│   └── [other providers]
└── [shared components]      # Other shared components

features/                     # Feature-based components
├── auth/                    # Authentication features
│   ├── accountType.tsx      # Account type selection
│   ├── create-company.tsx   # Company creation
│   ├── forget-password.tsx  # Password recovery
│   ├── sign-in.tsx          # Login form
│   ├── sign-up.tsx          # Registration form
│   ├── user-type.tsx        # User type selection
│   ├── verify-email.tsx     # Email verification
│   ├── verify-otp.tsx       # OTP verification
│   └── verify-password-reset-otp.tsx
├── clients/                 # Client management
│   ├── addAgency.tsx        # Agency addition
│   ├── addOwner.tsx         # Owner addition
│   ├── addTenant.tsx        # Tenant addition
│   ├── tabs/                # Client management tabs
│   └── [client components]
├── dashboard/               # Dashboard features
│   ├── components/          # Dashboard components
│   ├── index.tsx            # Main dashboard
│   └── schema/              # Dashboard schemas
├── finance/                 # Financial management
│   ├── paymen-methods.ts    # Payment methods
│   ├── rendandInvoices/     # Rent and invoices
│   ├── reports/             # Financial reports
│   ├── schemas/             # Financial schemas
│   └── transactions/        # Transaction management
├── management/              # Property management
│   ├── documents/           # Document management
│   ├── media/               # Media management
│   ├── rent/                # Rent management
│   └── services/            # Service management
├── projects/                # Project management
│   ├── addProject.tsx       # Project addition
│   ├── columns.tsx          # Project table columns
│   ├── DeleteProjectModal.tsx
│   ├── profile/             # Project profiles
│   └── [project components]
├── property/                # Property features
│   ├── fetchProperty.tsx    # Property fetching
│   ├── tabs/                # Property management tabs
│   └── tenant-assignment/   # Tenant assignment
├── sales/                   # Sales features
│   ├── dashboard/           # Sales dashboard
│   ├── documents/           # Sales documents
│   ├── owner/               # Owner sales features
│   ├── reports/             # Sales reports
│   └── salesMenus.tsx       # Sales navigation
├── services/                # Service management
│   ├── addServicesModel.tsx # Service addition
│   ├── fetchServices.tsx    # Service fetching
│   └── schema/              # Service schemas
└── settings/                # Settings management
    ├── schema/              # Settings schemas
    ├── SettingsMain.tsx     # Main settings
    └── tabs/                # Settings tabs

hooks/                       # Custom React hooks
├── auth/                    # Authentication hooks
│   ├── useAuthErrorHandler.ts
│   ├── useCallbackUrl.tsx
│   ├── useForcePasswordChange.ts
│   └── [other auth hooks]
├── finance/                 # Finance-related hooks
│   └── useRecipientSearch.ts
└── usePermissionWebSocket.ts

lib/                         # Utility libraries
├── auth.ts                  # Authentication utilities
├── excel-export.ts          # Excel export functionality
├── redis.ts                 # Redis utilities
└── [other utilities]        # Additional utility functions

store/                       # State management
├── index.ts                 # Store configuration
└── nvoiceDrafts.ts          # Invoice draft management

types/                       # TypeScript type definitions
└── api/                     # API type definitions
```

---

## 🧩 **Key Components & Features**

### **🔐 Authentication System**
- **NextAuth.js Integration**: JWT-based authentication
- **Permission Management**: Role-based access control
- **PermissionGate Component**: Conditional rendering based on permissions
- **Multi-Role Support**: Owner, Agent, Tenant, Admin roles
- **Two-Factor Authentication**: Enhanced security with OTP

### **📊 Data Management**
- **React Query**: Server state management and caching
- **Data Tables**: Custom data table components with filtering, sorting, and pagination
- **Excel Export**: Built-in Excel export functionality for reports
- **PDF Generation**: jsPDF for document generation
- **Real-time Updates**: WebSocket integration for live data

### **🎨 UI/UX Components**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Theme System**: Dark/light mode support with next-themes
- **Component Library**: shadcn/ui components with Radix UI primitives
- **Form System**: React Hook Form with Zod validation schemas
- **Notification System**: Sonner toast notifications
- **Loading States**: Skeleton loaders and progress indicators

### **🗺️ Map Integration**
- **Mapbox GL JS**: Interactive property mapping
- **React Map GL**: React wrapper for Mapbox
- **Property Visualization**: Location-based property display
- **Interactive Features**: Zoom, pan, and property selection

### **📝 Content Management**
- **Rich Text Editor**: TinyMCE for content editing
- **File Upload**: Drag-and-drop file management
- **Image Optimization**: Next.js Image component optimization
- **Document Preview**: PDF and image viewing capabilities

---

## ⚙️ **Setup Instructions**

### **1. Prerequisites**
```bash
# Node.js 18+ required
node --version
npm --version
```

### **2. Install Dependencies**
```bash
cd app
npm install
# or
yarn install
```

### **3. Environment Configuration**
Create `.env.local` file with required environment variables:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_NAME=HoyHub
NEXT_PUBLIC_SITE_DESCRIPTION=Real Estate Management Platform

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NEXT_PUBLIC_TINYMCE_API_KEY=your-tinymce-key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### **4. Development Server**
```bash
npm run dev
# or
yarn dev
```

**Access**: http://localhost:3000

### **5. Build for Production**
```bash
npm run build
npm start
# or
yarn build
yarn start
```

---

## 🔧 **Development Guidelines**

### **Code Style & Standards**
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Configured with Next.js recommended rules
- **Prettier**: Automatic code formatting
- **Component Naming**: PascalCase for components, camelCase for functions
- **File Naming**: kebab-case for file names

### **Component Architecture**
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Pages
- **Props Interface**: Always define TypeScript interfaces for props
- **Default Props**: Use default parameter values
- **Error Boundaries**: Implement error boundaries for critical components

### **State Management Best Practices**
- **Local State**: Use `useState` for component-specific state
- **Global State**: Use Jotai for shared application state
- **Server State**: Use React Query for API data
- **Form State**: Use React Hook Form for form management

### **Performance Optimization**
- **Code Splitting**: Use dynamic imports for large components
- **Memoization**: Use `useMemo` and `useCallback` appropriately
- **Image Optimization**: Use Next.js Image component
- **Bundle Analysis**: Regular bundle size monitoring

---

## 🧪 **Testing Strategy**

### **Testing Tools**
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **MSW**: API mocking for tests
- **Testing Library**: User-centric testing approach

### **Test Structure**
```
__tests__/
├── components/              # Component tests
├── hooks/                   # Hook tests
├── utils/                   # Utility function tests
└── integration/             # Integration tests
```

### **Testing Guidelines**
- **Component Testing**: Test component rendering and interactions
- **Hook Testing**: Test custom hooks in isolation
- **Integration Testing**: Test component interactions
- **Accessibility Testing**: Ensure components meet accessibility standards

---

## 📱 **Responsive Design**

### **Breakpoints**
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Large Desktop**: 1440px+

### **Mobile-First Approach**
- **Base Styles**: Mobile-first CSS
- **Progressive Enhancement**: Add complexity for larger screens
- **Touch-Friendly**: Proper touch target sizes
- **Performance**: Optimized for mobile devices

### **Responsive Components**
- **Navigation**: Collapsible mobile navigation
- **Tables**: Horizontal scrolling on mobile
- **Forms**: Stacked layout on small screens
- **Cards**: Single column layout on mobile

---

## 🔒 **Security Features**

### **Authentication Security**
- **JWT Tokens**: Secure token-based authentication
- **Token Refresh**: Automatic token refresh mechanism
- **Session Management**: Secure session handling
- **Permission Gates**: Component-level permission control

### **Data Security**
- **Input Validation**: Zod schema validation
- **XSS Prevention**: Sanitized user input
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Secure Headers**: Security headers configuration

---

## 🚀 **Deployment**

### **Build Process**
```bash
# Install dependencies
npm ci

# Build application
npm run build

# Start production server
npm start
```

### **Environment Variables**
- **Production**: Set all required environment variables
- **Secrets**: Use secure secret management
- **API URLs**: Configure production API endpoints
- **Feature Flags**: Enable/disable features as needed

### **Performance Monitoring**
- **Core Web Vitals**: Monitor performance metrics
- **Error Tracking**: Sentry integration for error monitoring
- **Analytics**: User behavior and performance analytics
- **Uptime Monitoring**: Application availability monitoring

---

## 📚 **Additional Resources**

### **Documentation**
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **React Docs**: [react.dev](https://react.dev)
- **TypeScript Docs**: [typescriptlang.org](https://typescriptlang.org)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)

### **Component Libraries**
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)
- **Radix UI**: [radix-ui.com](https://radix-ui.com)
- **Lucide Icons**: [lucide.dev](https://lucide.dev)

### **Development Tools**
- **VS Code Extensions**: ESLint, Prettier, TypeScript
- **Browser DevTools**: React DevTools, Performance tools
- **API Testing**: Postman, Insomnia

---

## 🔄 **Project Transfer Notes**

### **Key Areas to Focus On**
1. **Component Architecture**: Understand the feature-based component structure
2. **State Management**: Master Jotai + React Query patterns
3. **Authentication Flow**: Study the NextAuth.js integration
4. **Permission System**: Understand the role-based access control
5. **API Integration**: Review the data fetching patterns
6. **Styling System**: Learn the Tailwind CSS + shadcn/ui setup

### **Development Workflow**
1. **Feature Development**: Create feature branches from main
2. **Component Creation**: Follow the established component patterns
3. **State Management**: Use appropriate state management solutions
4. **Testing**: Write tests for new components and features
5. **Code Review**: Follow the established code review process

---

*Frontend Documentation - HoyHub Real Estate Platform*  
**Last Updated**: January 2025  
**Version**: 2.0.0
