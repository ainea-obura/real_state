import type { TenantDashboardResponse } from "../schema/tenantDashboard";
import type { OwnerDashboardResponse } from "../schema/ownerDashboardSchema";
import type { PropertyAssignmentList } from "../schema/tenantDashboard";

// Local type for property assignment node with hierarchy support
export interface PropertyAssignmentNode {
  id: string;
  name: string;
  node_type: string;
  parents?: Array<{
    id: string;
    name: string;
    node_type: string;
  }>;
}

export const mockTenantPropertyAssignmentsList: PropertyAssignmentList = [
  {
    id: "123e4567-e89b-12d3-a456-426614174001",
    node: {
      id: "123e4567-e89b-12d3-a456-426614174002",
      name: "Apartment 101",
      node_type: "UNIT",
      parent: { id: "block-a-3", name: "Block A / Floor 3" },
    },
    contract_start: "2023-06-01",
    contract_end: "2025-12-31",
    rent_amount: 2500,
    currency: "USD",
    created_at: "2023-05-15T09:00:00Z",
  },
  {
    id: "123e4567-e89b-12d3-a456-426614174004",
    node: {
      id: "123e4567-e89b-12d3-a456-426614174005",
      name: "Office Suite 205",
      node_type: "UNIT",
      parent: { id: "block-a-3", name: "Block A / Floor 3" },
    },
    contract_start: "2024-01-01",
    contract_end: "2025-11-30",
    rent_amount: 3500,
    currency: "USD",
    created_at: "2023-12-01T11:30:00Z",
  },
  {
    id: "223e4567-e89b-12d3-a456-426614174021",
    node: {
      id: "223e4567-e89b-12d3-a456-426614174022",
      name: "Penthouse 9B",
      node_type: "UNIT",
      parent: { id: "block-a-3", name: "Block A / Floor 3" },
    },
    contract_start: "2024-03-01",
    contract_end: "2025-02-28",
    rent_amount: 4200,
    currency: "EUR",
    created_at: "2024-02-15T10:00:00Z",
  },
  {
    id: "323e4567-e89b-12d3-a456-426614174031",
    node: {
      id: "323e4567-e89b-12d3-a456-426614174032",
      name: "Villa Serenity",
      node_type: "UNIT",
      parent: { id: "block-a-3", name: "Block A / Floor 3" },
    },
    contract_start: "2024-05-01",
    contract_end: "2025-04-30",
    rent_amount: 180000,
    currency: "KES",
    created_at: "2024-04-20T08:30:00Z",
  },
  {
    id: "423e4567-e89b-12d3-a456-426614174041",
    node: {
      id: "423e4567-e89b-12d3-a456-426614174042",
      name: "Studio 12C",
      node_type: "UNIT",
      parent: { id: "block-a-3", name: "Block A / Floor 3" },
    },
    contract_start: "2024-06-15",
    contract_end: "2025-06-14",
    rent_amount: 1200,
    currency: "USD",
    created_at: "2024-06-01T12:00:00Z",
  },
];

export const mockTenantDashboardData: TenantDashboardResponse = {
  error: false,
  message: null,
  data: {
    tenant: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "john.doe@example.com",
      first_name: "John",
      last_name: "Doe",
      phone: "+1 (555) 123-4567",
      gender: "Male",
      type: "tenant",
      is_active: true,
      is_tenant_verified: true,
      created_at: "2023-01-15T10:30:00Z",
      modified_at: "2024-01-15T14:45:00Z",
      verification: {
        id: null,
        status: "verified",
        id_number: null,
        category: null,
        document_image: null,
        user_image: null,
        created_at: null,
      },
    },
    property_assignments: mockTenantPropertyAssignmentsList,
    payments: [
      {
        id: "123e4567-e89b-12d3-a456-426614174007",
        payment_type: "TENANT_TO_COMPANY",
        amount: 2500,
        currency: "USD",
        method: "Credit Card",
        reference: "PAY-20240101-1234",
        status: "COMPLETED",
        payment_date: "2024-01-01T10:00:00Z",
        created_at: "2024-01-01T10:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174008",
        payment_type: "TENANT_TO_COMPANY",
        amount: 3500,
        currency: "USD",
        method: "Bank Transfer",
        reference: "PAY-20240101-5678",
        status: "COMPLETED",
        payment_date: "2024-01-01T14:30:00Z",
        created_at: "2024-01-01T14:30:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174009",
        payment_type: "TENANT_TO_COMPANY",
        amount: 2500,
        currency: "USD",
        method: "Credit Card",
        reference: "PAY-20231201-9012",
        status: "COMPLETED",
        payment_date: "2023-12-01T09:15:00Z",
        created_at: "2023-12-01T09:15:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174010",
        payment_type: "TENANT_TO_COMPANY",
        amount: 2500,
        currency: "USD",
        method: "Credit Card",
        reference: "PAY-20231101-3456",
        status: "COMPLETED",
        payment_date: "2023-11-01T11:45:00Z",
        created_at: "2023-11-01T11:45:00Z",
      },
    ],
    invoices: [
      {
        id: "123e4567-e89b-12d3-a456-426614174011",
        invoice_number: "INV-2024-001",
        invoice_type: "RENT",
        issue_date: "2024-01-01",
        due_date: "2024-01-31",
        total_amount: 2500,
        status: "PAID",
        description: "Monthly rent for January 2024 - Apartment 101",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174012",
        invoice_number: "INV-2024-002",
        invoice_type: "RENT",
        issue_date: "2024-01-01",
        due_date: "2024-01-31",
        total_amount: 3500,
        status: "PAID",
        description: "Monthly rent for January 2024 - Office Suite 205",
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174013",
        invoice_number: "INV-2024-003",
        invoice_type: "SERVICE",
        issue_date: "2024-01-15",
        due_date: "2024-01-31",
        total_amount: 150,
        status: "ISSUED",
        description: "Cleaning service for January 2024",
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174014",
        invoice_number: "INV-2023-012",
        invoice_type: "RENT",
        issue_date: "2023-12-01",
        due_date: "2023-12-31",
        total_amount: 2500,
        status: "PAID",
        description: "Monthly rent for December 2023 - Apartment 101",
        created_at: "2023-12-01T00:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174015",
        invoice_number: "INV-2023-011",
        invoice_type: "RENT",
        issue_date: "2023-11-01",
        due_date: "2023-11-30",
        total_amount: 2500,
        status: "PAID",
        description: "Monthly rent for November 2023 - Apartment 101",
        created_at: "2023-11-01T00:00:00Z",
      },
    ],
    documents: [
      {
        id: "123e4567-e89b-12d3-a456-426614174016",
        title: "Lease Agreement - Apartment 101",
        file_type: "document",
        category: "document",
        media: "/media/documents/lease_agreement_apartment_101.pdf",
        created_at: "2023-05-15T09:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174017",
        title: "Office Lease Agreement",
        file_type: "document",
        category: "document",
        media: "/media/documents/office_lease_agreement.pdf",
        created_at: "2023-12-01T11:30:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174018",
        title: "Apartment 101 - Main Photo",
        file_type: "image",
        category: "main",
        media: "/media/images/apartment_101_main.jpg",
        created_at: "2023-05-15T09:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174019",
        title: "Apartment 101 - Floor Plan",
        file_type: "image",
        category: "floor_plan",
        media: "/media/images/apartment_101_floor_plan.jpg",
        created_at: "2023-05-15T09:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174020",
        title: "Office Suite 205 - Interior",
        file_type: "image",
        category: "interior",
        media: "/media/images/office_suite_205_interior.jpg",
        created_at: "2023-12-01T11:30:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174021",
        title: "Security Deposit Receipt",
        file_type: "document",
        category: "document",
        media: "/media/documents/security_deposit_receipt.pdf",
        created_at: "2023-05-15T09:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174022",
        title: "Apartment 101 - Exterior View",
        file_type: "image",
        category: "exterior",
        media: "/media/images/apartment_101_exterior.jpg",
        created_at: "2023-05-15T09:00:00Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174023",
        title: "Office Suite 205 - Virtual Tour",
        file_type: "video",
        category: "interior",
        media: "/media/videos/office_suite_205_tour.mp4",
        created_at: "2023-12-01T11:30:00Z",
      },
    ],
    stats: {
      total_rent_paid: 11000,
      total_outstanding: 150,
      active_contracts: 2,
      total_documents: 8,
    },
  },
};

// Mock data for empty states
export const mockEmptyTenantDashboardData: TenantDashboardResponse = {
  error: false,
  message: null,
  data: {
    tenant: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "jane.smith@example.com",
      first_name: "Jane",
      last_name: "Smith",
      phone: "+1 (555) 987-6543",
      gender: "Female",
      type: "tenant",
      is_active: true,
      is_tenant_verified: false,
      created_at: "2024-01-01T00:00:00Z",
      modified_at: "2024-01-01T00:00:00Z",
      verification: {
        id: null,
        status: "unverified",
        id_number: null,
        category: null,
        document_image: null,
        user_image: null,
        created_at: null,
      },
    },
    property_assignments: [],
    payments: [],
    invoices: [],
    documents: [],
    stats: {
      total_rent_paid: 0,
      total_outstanding: 0,
      active_contracts: 0,
      total_documents: 0,
    },
  },
};

// Mock data for error states
export const mockErrorTenantDashboardData: TenantDashboardResponse = {
  error: true,
  message: "Failed to fetch tenant data. Please try again later.",
  data: {
    tenant: {
      id: "",
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      gender: "",
      type: "tenant",
      is_active: false,
      is_tenant_verified: false,
      created_at: "",
      modified_at: "",
      verification: {
        id: null,
        status: "unverified",
        id_number: null,
        category: null,
        document_image: null,
        user_image: null,
        created_at: null,
      },
    },
    property_assignments: [],
    payments: [],
    invoices: [],
    documents: [],
    stats: {
      total_rent_paid: 0,
      total_outstanding: 0,
      active_contracts: 0,
      total_documents: 0,
    },
  },
};

// Mock data for loading states
export const mockLoadingTenantDashboardData: TenantDashboardResponse = {
  error: false,
  message: null,
  data: {
    tenant: {
      id: "loading",
      email: "loading@example.com",
      first_name: "Loading",
      last_name: "User",
      phone: "Loading...",
      gender: "",
      type: "tenant",
      is_active: true,
      is_tenant_verified: false,
      created_at: "2024-01-01T00:00:00Z",
      modified_at: "2024-01-01T00:00:00Z",
      verification: {
        id: null,
        status: "unverified",
        id_number: null,
        category: null,
        document_image: null,
        user_image: null,
        created_at: null,
      },
    },
    property_assignments: [],
    payments: [],
    invoices: [],
    documents: [],
    stats: {
      total_rent_paid: 0,
      total_outstanding: 0,
      active_contracts: 0,
      total_documents: 0,
    },
  },
};

// Helper function to generate mock data with custom tenant info
export const generateMockTenantData = (
  tenantInfo: Partial<TenantDashboardResponse["data"]["tenant"]> = {}
): TenantDashboardResponse => {
  return {
    ...mockTenantDashboardData,
    data: {
      ...mockTenantDashboardData.data,
      tenant: {
        ...mockTenantDashboardData.data.tenant,
        ...tenantInfo,
      },
    },
  };
};

// Helper function to generate mock data with specific property assignments
export const generateMockPropertyData = (
  propertyAssignments: TenantDashboardResponse["data"]["property_assignments"] = []
): TenantDashboardResponse => {
  return {
    ...mockTenantDashboardData,
    data: {
      ...mockTenantDashboardData.data,
      property_assignments: propertyAssignments,
      stats: {
        ...mockTenantDashboardData.data.stats,
        active_contracts: propertyAssignments.length,
      },
    },
  };
};

// Helper function to generate mock data with specific payments
export const generateMockPaymentData = (
  payments: TenantDashboardResponse["data"]["payments"] = []
): TenantDashboardResponse => {
  const totalRentPaid = payments
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    ...mockTenantDashboardData,
    data: {
      ...mockTenantDashboardData.data,
      payments: payments,
      stats: {
        ...mockTenantDashboardData.data.stats,
        total_rent_paid: totalRentPaid,
      },
    },
  };
};

// Mock data for Owner Dashboard (Property Manager View)
export const mockOwnerDashboardData: OwnerDashboardResponse = {
  error: false,
  message: null,
  data: {
    owner: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "sarah.johnson@example.com",
      first_name: "Sarah",
      last_name: "Johnson",
      phone: "+1 (555) 987-6543",
      gender: "Female",
      type: "owner",
      is_active: true,
      is_owner_verified: true,
      created_at: "2022-03-15T10:30:00Z",
      modified_at: "2024-01-15T14:45:00Z",
    },
    property_ownerships: [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          name: "Sunset Towers - Building A",
          node_type: "BLOCK",
          parent: {
            id: "123e4567-e89b-12d3-a456-426614174003",
            name: "Sunset Towers Complex",
          },
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2022-03-15T09:00:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 24,
          occupied_units: 22,
          vacant_units: 2,
          occupancy_rate: 91.67,
          total_rent_income: 8500,
          monthly_expenses: 1200,
          net_income: 7300,
          maintenance_requests: 3,
          urgent_issues: 1,
          last_inspection: "2024-01-10T00:00:00Z",
          next_inspection: "2024-02-10T00:00:00Z",
          property_value: 2500000,
          annual_appreciation: 4.5,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174010",
            name: "John Doe",
            unit: "A-101",
            rent_amount: 2500,
            lease_start: "2023-06-01",
            lease_end: "2024-12-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 123-4567",
            email: "john.doe@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174011",
            name: "Jane Smith",
            unit: "A-102",
            rent_amount: 2800,
            lease_start: "2023-08-15",
            lease_end: "2024-08-14",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 234-5678",
            email: "jane.smith@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174012",
            name: "Mike Wilson",
            unit: "A-103",
            rent_amount: 3200,
            lease_start: "2023-09-01",
            lease_end: "2024-08-31",
            payment_status: "OVERDUE",
            last_payment: "2023-12-01T09:15:00Z",
            contact: "+1 (555) 345-6789",
            email: "mike.wilson@example.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174020",
            title: "HVAC System Maintenance",
            description:
              "Annual HVAC system inspection and filter replacement needed",
            priority: "MEDIUM",
            status: "SCHEDULED",
            assigned_to: "Maintenance Team",
            estimated_cost: 500,
            created_at: "2024-01-15T00:00:00Z",
            due_date: "2024-01-25T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174021",
            title: "Water Leak in Unit A-103",
            description: "Tenant reported water leak from ceiling in bathroom",
            priority: "HIGH",
            status: "IN_PROGRESS",
            assigned_to: "Emergency Plumber",
            estimated_cost: 800,
            created_at: "2024-01-18T00:00:00Z",
            due_date: "2024-01-20T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174030",
            title: "Building Permit",
            type: "LEGAL",
            url: "/documents/sunset_towers_permit.pdf",
            uploaded_at: "2022-03-15T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174031",
            title: "Insurance Certificate",
            type: "INSURANCE",
            url: "/documents/sunset_towers_insurance.pdf",
            uploaded_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174032",
            title: "Fire Safety Inspection",
            type: "SAFETY",
            url: "/documents/sunset_towers_fire_safety.pdf",
            uploaded_at: "2023-12-15T00:00:00Z",
          },
        ],
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174004",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174005",
          name: "Downtown Business Center",
          node_type: "BLOCK",
          parent: {
            id: "123e4567-e89b-12d3-a456-426614174006",
            name: "Downtown Complex",
          },
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2023-01-10T11:30:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 12,
          occupied_units: 11,
          vacant_units: 1,
          occupancy_rate: 91.67,
          total_rent_income: 12000,
          monthly_expenses: 1800,
          net_income: 10200,
          maintenance_requests: 1,
          urgent_issues: 0,
          last_inspection: "2024-01-05T00:00:00Z",
          next_inspection: "2024-02-05T00:00:00Z",
          property_value: 1800000,
          annual_appreciation: 3.8,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174013",
            name: "Tech Corp Inc",
            unit: "Suite 201",
            rent_amount: 4500,
            lease_start: "2023-01-01",
            lease_end: "2025-12-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 456-7890",
            email: "finance@techcorp.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174014",
            name: "Legal Associates LLC",
            unit: "Suite 202",
            rent_amount: 3800,
            lease_start: "2023-03-01",
            lease_end: "2024-02-28",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 567-8901",
            email: "admin@legalassociates.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174015",
            name: "Marketing Solutions",
            unit: "Suite 203",
            rent_amount: 3700,
            lease_start: "2023-06-01",
            lease_end: "2024-05-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T09:15:00Z",
            contact: "+1 (555) 678-9012",
            email: "info@marketingsolutions.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174022",
            title: "Elevator Maintenance",
            description: "Monthly elevator inspection and maintenance",
            priority: "MEDIUM",
            status: "COMPLETED",
            assigned_to: "Elevator Service Co",
            estimated_cost: 300,
            created_at: "2024-01-10T00:00:00Z",
            due_date: "2024-01-15T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174033",
            title: "Commercial Lease Agreement",
            type: "LEGAL",
            url: "/documents/downtown_lease_agreement.pdf",
            uploaded_at: "2023-01-10T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174034",
            title: "Building Code Compliance",
            type: "SAFETY",
            url: "/documents/downtown_code_compliance.pdf",
            uploaded_at: "2023-11-15T00:00:00Z",
          },
        ],
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174005",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174006",
          name: "Riverside Apartments",
          node_type: "PROPERTY",
          parent: null,
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2023-06-01T09:00:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 8,
          occupied_units: 6,
          vacant_units: 2,
          occupancy_rate: 75,
          total_rent_income: 4800,
          monthly_expenses: 800,
          net_income: 4000,
          maintenance_requests: 2,
          urgent_issues: 0,
          last_inspection: "2024-01-12T00:00:00Z",
          next_inspection: "2024-02-12T00:00:00Z",
          property_value: 1200000,
          annual_appreciation: 5.2,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174016",
            name: "Alex Rodriguez",
            unit: "Unit 1A",
            rent_amount: 1800,
            lease_start: "2023-07-01",
            lease_end: "2024-06-30",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 789-0123",
            email: "alex.rodriguez@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174017",
            name: "Maria Garcia",
            unit: "Unit 2B",
            rent_amount: 1600,
            lease_start: "2023-08-01",
            lease_end: "2024-07-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 890-1234",
            email: "maria.garcia@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174018",
            name: "David Chen",
            unit: "Unit 3A",
            rent_amount: 1400,
            lease_start: "2023-09-01",
            lease_end: "2024-08-31",
            payment_status: "OVERDUE",
            last_payment: "2023-12-15T09:15:00Z",
            contact: "+1 (555) 901-2345",
            email: "david.chen@example.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174023",
            title: "Roof Inspection",
            description: "Annual roof inspection and minor repairs",
            priority: "MEDIUM",
            status: "SCHEDULED",
            assigned_to: "Roofing Contractor",
            estimated_cost: 1200,
            created_at: "2024-01-20T00:00:00Z",
            due_date: "2024-01-30T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174024",
            title: "Plumbing Repair",
            description: "Kitchen sink clogged in Unit 2B",
            priority: "LOW",
            status: "IN_PROGRESS",
            assigned_to: "Plumbing Service",
            estimated_cost: 150,
            created_at: "2024-01-22T00:00:00Z",
            due_date: "2024-01-24T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174035",
            title: "Property Deed",
            type: "LEGAL",
            url: "/documents/riverside_deed.pdf",
            uploaded_at: "2023-06-01T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174036",
            title: "Property Tax Assessment",
            type: "TAX",
            url: "/documents/riverside_tax_assessment.pdf",
            uploaded_at: "2023-11-01T00:00:00Z",
          },
        ],
      },
    ],
    portfolio_stats: {
      total_properties: 3,
      total_units: 44,
      total_occupied: 39,
      total_vacant: 5,
      overall_occupancy: 88.64,
      total_monthly_income: 25300,
      total_monthly_expenses: 3800,
      total_net_income: 21500,
      total_maintenance_requests: 6,
      total_urgent_issues: 1,
      total_property_value: 5500000,
      average_appreciation: 4.5,
      overdue_payments: 2,
      total_tenants: 9,
    },
  },
};

// Mock data for empty states
export const mockEmptyOwnerDashboardData: OwnerDashboardResponse = {
  error: false,
  message: null,
  data: {
    owner: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "new.owner@example.com",
      first_name: "New",
      last_name: "Owner",
      phone: "+1 (555) 123-4567",
      gender: "Male",
      type: "owner",
      is_active: true,
      is_owner_verified: false,
      created_at: "2024-01-01T00:00:00Z",
      modified_at: "2024-01-01T00:00:00Z",
    },
    property_ownerships: [],
    income: [],
    invoices: [],
    documents: [],
    stats: {
      total_income: 0,
      total_outstanding: 0,
      owned_properties: 0,
      total_documents: 0,
      monthly_income: 0,
      annual_income: 0,
    },
  },
};

// Mock data for error states
export const mockErrorOwnerDashboardData: OwnerDashboardResponse = {
  error: true,
  message: "Failed to fetch owner data. Please try again later.",
  data: {
    owner: {
      id: "",
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      gender: "",
      type: "owner",
      is_active: false,
      is_owner_verified: false,
      created_at: "",
      modified_at: "",
    },
    property_ownerships: [],
    income: [],
    invoices: [],
    documents: [],
    stats: {
      total_income: 0,
      total_outstanding: 0,
      owned_properties: 0,
      total_documents: 0,
      monthly_income: 0,
      annual_income: 0,
    },
  },
};

// Mock data for loading states
export const mockLoadingOwnerDashboardData: OwnerDashboardResponse = {
  error: false,
  message: null,
  data: {
    owner: {
      id: "loading",
      email: "loading@example.com",
      first_name: "Loading",
      last_name: "Owner",
      phone: "Loading...",
      gender: "",
      type: "owner",
      is_active: true,
      is_owner_verified: false,
      created_at: "2024-01-01T00:00:00Z",
      modified_at: "2024-01-01T00:00:00Z",
    },
    property_ownerships: [],
    income: [],
    invoices: [],
    documents: [],
    stats: {
      total_income: 0,
      total_outstanding: 0,
      owned_properties: 0,
      total_documents: 0,
      monthly_income: 0,
      annual_income: 0,
    },
  },
};

// Helper function to generate mock data with custom owner info
export const generateMockOwnerData = (
  ownerInfo: Partial<OwnerDashboardResponse["data"]["owner"]> = {}
): OwnerDashboardResponse => {
  return {
    ...mockOwnerDashboardData,
    data: {
      ...mockOwnerDashboardData.data,
      owner: {
        ...mockOwnerDashboardData.data.owner,
        ...ownerInfo,
      },
    },
  };
};

// Helper function to generate mock data with specific property ownerships
export const generateMockPropertyOwnershipData = (
  propertyOwnerships: OwnerDashboardResponse["data"]["property_ownerships"] = []
): OwnerDashboardResponse => {
  return {
    ...mockOwnerDashboardData,
    data: {
      ...mockOwnerDashboardData.data,
      property_ownerships: propertyOwnerships,
      stats: {
        ...mockOwnerDashboardData.data.stats,
        owned_properties: propertyOwnerships.length,
      },
    },
  };
};

// Helper function to generate mock data with specific income
export const generateMockIncomeData = (
  income: OwnerDashboardResponse["data"]["income"] = []
): OwnerDashboardResponse => {
  const totalIncome = income
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    ...mockOwnerDashboardData,
    data: {
      ...mockOwnerDashboardData.data,
      income: income,
      stats: {
        ...mockOwnerDashboardData.data.stats,
        total_income: totalIncome,
      },
    },
  };
};

// Enhanced Property Ownership Data for Property Manager View
export const mockPropertyManagerData = {
  error: false,
  message: null,
  data: {
    owner: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "sarah.johnson@example.com",
      first_name: "Sarah",
      last_name: "Johnson",
      phone: "+1 (555) 987-6543",
      gender: "Female",
      type: "owner",
      is_active: true,
      is_owner_verified: true,
      created_at: "2022-03-15T10:30:00Z",
      modified_at: "2024-01-15T14:45:00Z",
    },
    property_ownerships: [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          name: "Sunset Towers - Building A",
          node_type: "BLOCK",
          parent: {
            id: "123e4567-e89b-12d3-a456-426614174003",
            name: "Sunset Towers Complex",
          },
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2022-03-15T09:00:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 24,
          occupied_units: 22,
          vacant_units: 2,
          occupancy_rate: 91.67,
          total_rent_income: 8500,
          monthly_expenses: 1200,
          net_income: 7300,
          maintenance_requests: 3,
          urgent_issues: 1,
          last_inspection: "2024-01-10T00:00:00Z",
          next_inspection: "2024-02-10T00:00:00Z",
          property_value: 2500000,
          annual_appreciation: 4.5,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174010",
            name: "John Doe",
            unit: "A-101",
            rent_amount: 2500,
            lease_start: "2023-06-01",
            lease_end: "2024-12-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 123-4567",
            email: "john.doe@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174011",
            name: "Jane Smith",
            unit: "A-102",
            rent_amount: 2800,
            lease_start: "2023-08-15",
            lease_end: "2024-08-14",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 234-5678",
            email: "jane.smith@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174012",
            name: "Mike Wilson",
            unit: "A-103",
            rent_amount: 3200,
            lease_start: "2023-09-01",
            lease_end: "2024-08-31",
            payment_status: "OVERDUE",
            last_payment: "2023-12-01T09:15:00Z",
            contact: "+1 (555) 345-6789",
            email: "mike.wilson@example.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174020",
            title: "HVAC System Maintenance",
            description:
              "Annual HVAC system inspection and filter replacement needed",
            priority: "MEDIUM",
            status: "SCHEDULED",
            assigned_to: "Maintenance Team",
            estimated_cost: 500,
            created_at: "2024-01-15T00:00:00Z",
            due_date: "2024-01-25T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174021",
            title: "Water Leak in Unit A-103",
            description: "Tenant reported water leak from ceiling in bathroom",
            priority: "HIGH",
            status: "IN_PROGRESS",
            assigned_to: "Emergency Plumber",
            estimated_cost: 800,
            created_at: "2024-01-18T00:00:00Z",
            due_date: "2024-01-20T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174030",
            title: "Building Permit",
            type: "LEGAL",
            url: "/documents/sunset_towers_permit.pdf",
            uploaded_at: "2022-03-15T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174031",
            title: "Insurance Certificate",
            type: "INSURANCE",
            url: "/documents/sunset_towers_insurance.pdf",
            uploaded_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174032",
            title: "Fire Safety Inspection",
            type: "SAFETY",
            url: "/documents/sunset_towers_fire_safety.pdf",
            uploaded_at: "2023-12-15T00:00:00Z",
          },
        ],
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174004",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174005",
          name: "Downtown Business Center",
          node_type: "BLOCK",
          parent: {
            id: "123e4567-e89b-12d3-a456-426614174006",
            name: "Downtown Complex",
          },
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2023-01-10T11:30:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 12,
          occupied_units: 11,
          vacant_units: 1,
          occupancy_rate: 91.67,
          total_rent_income: 12000,
          monthly_expenses: 1800,
          net_income: 10200,
          maintenance_requests: 1,
          urgent_issues: 0,
          last_inspection: "2024-01-05T00:00:00Z",
          next_inspection: "2024-02-05T00:00:00Z",
          property_value: 1800000,
          annual_appreciation: 3.8,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174013",
            name: "Tech Corp Inc",
            unit: "Suite 201",
            rent_amount: 4500,
            lease_start: "2023-01-01",
            lease_end: "2025-12-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 456-7890",
            email: "finance@techcorp.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174014",
            name: "Legal Associates LLC",
            unit: "Suite 202",
            rent_amount: 3800,
            lease_start: "2023-03-01",
            lease_end: "2024-02-28",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 567-8901",
            email: "admin@legalassociates.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174015",
            name: "Marketing Solutions",
            unit: "Suite 203",
            rent_amount: 3700,
            lease_start: "2023-06-01",
            lease_end: "2024-05-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T09:15:00Z",
            contact: "+1 (555) 678-9012",
            email: "info@marketingsolutions.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174022",
            title: "Elevator Maintenance",
            description: "Monthly elevator inspection and maintenance",
            priority: "MEDIUM",
            status: "COMPLETED",
            assigned_to: "Elevator Service Co",
            estimated_cost: 300,
            created_at: "2024-01-10T00:00:00Z",
            due_date: "2024-01-15T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174033",
            title: "Commercial Lease Agreement",
            type: "LEGAL",
            url: "/documents/downtown_lease_agreement.pdf",
            uploaded_at: "2023-01-10T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174034",
            title: "Building Code Compliance",
            type: "SAFETY",
            url: "/documents/downtown_code_compliance.pdf",
            uploaded_at: "2023-11-15T00:00:00Z",
          },
        ],
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174005",
        node: {
          id: "123e4567-e89b-12d3-a456-426614174006",
          name: "Riverside Apartments",
          node_type: "PROPERTY",
          parent: null,
        },
        owner_user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "Sarah",
          last_name: "Johnson",
          email: "sarah.johnson@example.com",
        },
        owner_company: undefined,
        created_at: "2023-06-01T09:00:00Z",
        // Property Manager Specific Data
        property_stats: {
          total_units: 8,
          occupied_units: 6,
          vacant_units: 2,
          occupancy_rate: 75,
          total_rent_income: 4800,
          monthly_expenses: 800,
          net_income: 4000,
          maintenance_requests: 2,
          urgent_issues: 0,
          last_inspection: "2024-01-12T00:00:00Z",
          next_inspection: "2024-02-12T00:00:00Z",
          property_value: 1200000,
          annual_appreciation: 5.2,
        },
        tenants: [
          {
            id: "123e4567-e89b-12d3-a456-426614174016",
            name: "Alex Rodriguez",
            unit: "Unit 1A",
            rent_amount: 1800,
            lease_start: "2023-07-01",
            lease_end: "2024-06-30",
            payment_status: "PAID",
            last_payment: "2024-01-01T10:00:00Z",
            contact: "+1 (555) 789-0123",
            email: "alex.rodriguez@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174017",
            name: "Maria Garcia",
            unit: "Unit 2B",
            rent_amount: 1600,
            lease_start: "2023-08-01",
            lease_end: "2024-07-31",
            payment_status: "PAID",
            last_payment: "2024-01-01T14:30:00Z",
            contact: "+1 (555) 890-1234",
            email: "maria.garcia@example.com",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174018",
            name: "David Chen",
            unit: "Unit 3A",
            rent_amount: 1400,
            lease_start: "2023-09-01",
            lease_end: "2024-08-31",
            payment_status: "OVERDUE",
            last_payment: "2023-12-15T09:15:00Z",
            contact: "+1 (555) 901-2345",
            email: "david.chen@example.com",
          },
        ],
        maintenance_issues: [
          {
            id: "123e4567-e89b-12d3-a456-426614174023",
            title: "Roof Inspection",
            description: "Annual roof inspection and minor repairs",
            priority: "MEDIUM",
            status: "SCHEDULED",
            assigned_to: "Roofing Contractor",
            estimated_cost: 1200,
            created_at: "2024-01-20T00:00:00Z",
            due_date: "2024-01-30T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174024",
            title: "Plumbing Repair",
            description: "Kitchen sink clogged in Unit 2B",
            priority: "LOW",
            status: "IN_PROGRESS",
            assigned_to: "Plumbing Service",
            estimated_cost: 150,
            created_at: "2024-01-22T00:00:00Z",
            due_date: "2024-01-24T00:00:00Z",
          },
        ],
        documents: [
          {
            id: "123e4567-e89b-12d3-a456-426614174035",
            title: "Property Deed",
            type: "LEGAL",
            url: "/documents/riverside_deed.pdf",
            uploaded_at: "2023-06-01T00:00:00Z",
          },
          {
            id: "123e4567-e89b-12d3-a456-426614174036",
            title: "Property Tax Assessment",
            type: "TAX",
            url: "/documents/riverside_tax_assessment.pdf",
            uploaded_at: "2023-11-01T00:00:00Z",
          },
        ],
      },
    ],
    portfolio_stats: {
      total_properties: 3,
      total_units: 44,
      total_occupied: 39,
      total_vacant: 5,
      overall_occupancy: 88.64,
      total_monthly_income: 25300,
      total_monthly_expenses: 3800,
      total_net_income: 21500,
      total_maintenance_requests: 6,
      total_urgent_issues: 1,
      total_property_value: 5500000,
      average_appreciation: 4.5,
      overdue_payments: 2,
      total_tenants: 9,
    },
  },
};

// Mock property assignments for tenant Properties tab (with hierarchy for UNITs)
export const mockTenantPropertyAssignments: Array<{
  id: string;
  node: PropertyAssignmentNode;
  contract_start: string;
  contract_end?: string;
  rent_amount: number;
  currency: string;
  created_at: string;
}> = [
  {
    id: "a1",
    node: {
      id: "n1",
      name: "Apartment 101",
      node_type: "UNIT",
      parents: [
        { id: "b1", name: "Block A", node_type: "BLOCK" },
        { id: "f1", name: "Floor 3", node_type: "FLOOR" },
      ],
    },
    contract_start: "2023-06-01",
    contract_end: "2025-12-31",
    rent_amount: 2500,
    currency: "USD",
    created_at: "2023-05-15T09:00:00Z",
    // Hierarchy: Block A > Floor 3
  },
  {
    id: "a2",
    node: {
      id: "n2",
      name: "Villa Serenity",
      node_type: "HOUSE",
      parents: [],
    },
    contract_start: "2024-05-01",
    contract_end: "2025-04-30",
    rent_amount: 180000,
    currency: "KES",
    created_at: "2024-04-20T08:30:00Z",
  },
  {
    id: "a3",
    node: {
      id: "n3",
      name: "Studio 12C",
      node_type: "UNIT",
      parents: [
        {
          id: "b2",
          name: "City Center Lofts with an Exceptionally Long Parent Name for Testing Purposes",
          node_type: "BLOCK",
        },
        { id: "f2", name: "Floor 7", node_type: "FLOOR" },
      ],
    },
    contract_start: "2024-06-15",
    contract_end: "2025-06-14",
    rent_amount: 1200,
    currency: "USD",
    created_at: "2024-06-01T12:00:00Z",
    // Hierarchy: City Center Lofts... > Floor 7
  },
  {
    id: "a4",
    node: {
      id: "n4",
      name: "Penthouse 9B",
      node_type: "UNIT",
      parents: [
        { id: "b3", name: "Skyline Residences", node_type: "BLOCK" },
        { id: "f3", name: "Floor 12", node_type: "FLOOR" },
      ],
    },
    contract_start: "2024-03-01",
    contract_end: "2025-02-28",
    rent_amount: 4200,
    currency: "EUR",
    created_at: "2024-02-15T10:00:00Z",
    // Hierarchy: Skyline Residences > Floor 12
  },
];
