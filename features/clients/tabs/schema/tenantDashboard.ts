import { z } from 'zod';

// Tenant Detail Schema
export const TenantDetailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  type: z.enum(["tenant", "owner"]),
  is_active: z.boolean(),
  is_tenant_verified: z.boolean().optional(),
  created_at: z.string(),
  modified_at: z.string(),
  verification: z.object({
    id: z.string().nullable(),
    status: z.string(),
    id_number: z.string().nullable(),
    category: z.string().nullable(),
    document_image: z.string().nullable(),
    user_image: z.string().nullable(),
    created_at: z.string().nullable(),
  }).nullable(),
});

// Property Assignment Schema
export const PropertyAssignmentSchema = z.object({
  id: z.string().uuid(),
  node: z.object({
    id: z.string().uuid(),
    name: z.string(),
    node_type: z.string(),
    parent: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }).optional(),
  }),
  floor: z.string().optional(),
  block: z.string().optional(),
  contract_start: z.string(),
  contract_end: z.string().optional(),
  rent_amount: z.number(),
  currency: z.string(),
  created_at: z.string(),
});

// Payment Schema
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  payment_type: z.string(),
  amount: z.number(),
  currency: z.string(),
  method: z.string().optional(),
  reference: z.string().optional(),
  status: z.string(),
  payment_date: z.string(),
  created_at: z.string(),
});

// Invoice Schema
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string(),
  invoice_type: z.string(),
  issue_date: z.string(),
  due_date: z.string(),
  total_amount: z.number(),
  status: z.string(),
  description: z.string().optional(),
  created_at: z.string(),
});

// Document Schema
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  file_type: z.string(),
  category: z.string(),
  media: z.string(),
  created_at: z.string(),
});

// Tenant Dashboard Response Schema
export const TenantDashboardResponseSchema = z.object({
  error: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: z.object({
    tenant: TenantDetailSchema,
    property_assignments: z.array(PropertyAssignmentSchema),
    payments: z.array(PaymentSchema),
    invoices: z.array(InvoiceSchema),
    documents: z.array(DocumentSchema),
    stats: z.object({
      total_rent_paid: z.number(),
      total_outstanding: z.number(),
      active_contracts: z.number(),
      total_documents: z.number(),
    }),
  }),
});

// Property Assignment List Schema and Type
export const PropertyAssignmentListSchema = z.array(PropertyAssignmentSchema);
export type PropertyAssignmentList = z.infer<typeof PropertyAssignmentListSchema>;

// Types
export type TenantDetail = z.infer<typeof TenantDetailSchema>;
export type PropertyAssignment = z.infer<typeof PropertyAssignmentSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type TenantDashboardResponse = z.infer<typeof TenantDashboardResponseSchema>; 