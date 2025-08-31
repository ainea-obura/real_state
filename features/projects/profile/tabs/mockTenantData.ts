// Types for the hierarchical structure
export interface Unit {
  id: string;
  name: string;
  type: 'unit';
}

export interface Floor {
  id: string;
  name: string;
  type: 'floor';
  units: Unit[];
}

export interface Block {
  id: string;
  name: string;
  type: 'block';
  floors: Floor[];
}

export interface House {
  id: string;
  name: string;
  type: 'house';
}

export type StructureChild = Block | House;

export interface Project {
  id: string;
  name: string;
  children: StructureChild[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'pending' | 'inactive';
  assignedTo?: {
    type: 'unit' | 'house';
    id: string;
    name: string;
  };
  contract_start?: string; // ISO date
  contract_end?: string;   // ISO date
  is_verified?: boolean;
  has_outstanding_payments?: boolean;
  has_documents?: boolean;
}

// Types for backend-representative structure
export interface PaymentRecord {
  id: string;
  due_date: string;      // e.g., '2024-07-01'
  paid_date?: string;    // e.g., '2024-07-03' (if paid)
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  amount: number;
  currency: string;
  period: string;        // e.g., '2024-07'
}

export interface TenantAssignment {
  id: string;
  tenant_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  node: {
    id: string;
    name: string;
    node_type: 'UNIT' | 'HOUSE';
    parent: string;
  };
  rent_amount: number;
  currency: string;
  contract_start: string;
  contract_end: string | null;
  payments: PaymentRecord[];
}

// Mock data
export const mockProject: Project = {
  id: 'project-1',
  name: 'Sunrise Residency',
  children: [
    {
      id: 'block-1',
      name: 'Block A',
      type: 'block',
      floors: [
        {
          id: 'floor-1',
          name: '1st Floor',
          type: 'floor',
          units: [
            { id: 'unit-1', name: 'A-101', type: 'unit' },
            { id: 'unit-2', name: 'A-102', type: 'unit' },
          ],
        },
        {
          id: 'floor-2',
          name: '2nd Floor',
          type: 'floor',
          units: [
            { id: 'unit-3', name: 'A-201', type: 'unit' },
          ],
        },
      ],
    },
    {
      id: 'house-1',
      name: 'Villa 1',
      type: 'house',
    },
  ],
};

export const mockTenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1 555-1234',
    status: 'active',
    assignedTo: { type: 'unit', id: 'unit-1', name: 'A-101' },
    contract_start: '2024-01-01',
    contract_end: '2025-01-01',
    is_verified: true,
    has_outstanding_payments: false,
    has_documents: true,
  },
  {
    id: 'tenant-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1 555-5678',
    status: 'pending',
    assignedTo: { type: 'house', id: 'house-1', name: 'Villa 1' },
    contract_start: '2024-07-01',
    contract_end: '2024-12-01',
    is_verified: false,
    has_outstanding_payments: true,
    has_documents: false,
  },
  {
    id: 'tenant-3',
    name: 'Charlie Lee',
    email: 'charlie@example.com',
    phone: '+1 555-9999',
    status: 'inactive',
    contract_start: '2024-09-01', // Pending move-in
    contract_end: '2025-09-01',
    is_verified: true,
    has_outstanding_payments: false,
    has_documents: true,
  },
  {
    id: 'tenant-4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    phone: '+1 555-8888',
    status: 'active',
    assignedTo: { type: 'unit', id: 'unit-2', name: 'A-102' },
    contract_start: '2024-01-01',
    contract_end: '2024-07-15', // Expiring soon
    is_verified: true,
    has_outstanding_payments: true,
    has_documents: false,
  },
  {
    id: 'tenant-5',
    name: 'Evan Wright',
    email: 'evan@example.com',
    phone: '+1 555-7777',
    status: 'active',
    assignedTo: { type: 'unit', id: 'unit-3', name: 'A-201' },
    contract_start: '2023-08-01',
    contract_end: '2024-08-01',
    is_verified: false,
    has_outstanding_payments: false,
    has_documents: true,
  },
];

// Helper to generate months between two dates (YYYY-MM)
function generateMonths(start: string, end: string) {
  const result: string[] = [];
  let [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (sy < ey || (sy === ey && sm <= em)) {
    result.push(`${sy}-${String(sm).padStart(2, '0')}`);
    sm++;
    if (sm > 12) { sm = 1; sy++; }
  }
  return result;
}

// Generate mock tenants and payments for 2023, 2024
const years = [2023, 2024];
const months2023 = generateMonths('2023-01', '2023-12');
const months2024 = generateMonths('2024-01', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

function statusByIndex(idx: number, mod: number = 3): 'PAID' | 'PENDING' | 'OVERDUE' {
  if (idx % mod === 0) return 'PAID';
  if (idx % mod === 1) return 'PENDING';
  return 'OVERDUE';
}