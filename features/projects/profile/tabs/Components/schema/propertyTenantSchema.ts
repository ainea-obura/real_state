import { z } from 'zod';

export const PropertyTenantSchema = z.object({
  id: z.string(),
  node_id: z.string(),
  tenant_user_id: z.string(),
  tenant_user: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email().optional().nullable(),
    phone: z.string(),
    gender: z.string().nullable(),
    date_joined: z.string(),
    last_login: z.string().nullable(),
    is_verified: z.boolean(),
    status: z.string(),
    type: z.string(),
  }),
  contract_start: z.string(),
  contract_end: z.string().nullable(),
  rent_amount: z.string(),
  currency: z.string(),
  payment_frequency: z.string(),
  deposit_amount: z.string().nullable(),
  deposit_currency: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  commission: z.string().nullable(),
});

export const PropertyTenantCreateInputSchema = z.object({
  block: z.string().min(1, "Block is required"),
  floor: z.string().min(1, "Floor is required"),
  apartment: z.string().min(1, "Apartment is required"),
  tenant_user: z.string().min(1, "Tenant is required"),
  contract_start: z.string(),
  contract_end: z.string().nullable(),
  rent_amount: z.string(),
  currency: z.string(),
  deposit_amount: z.string().nullable(),
  deposit_currency: z.string().nullable(),
  commission: z.string().nullable().optional(),
});

export const PropertyTenantUpdateInputSchema = z.object({
  block: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  tenant_user: z.string().optional(),
  commission: z.string().nullable().optional(),
});

// Type exports
export type PropertyTenant = z.infer<typeof PropertyTenantSchema>;
export type PropertyTenantCreateInput = z.infer<typeof PropertyTenantCreateInputSchema>;
export type PropertyTenantUpdateInput = z.infer<typeof PropertyTenantUpdateInputSchema>; 