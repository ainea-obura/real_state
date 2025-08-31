import { z } from 'zod';

export const UnitDetailSchema = z.object({
  id: z.string(),
  node_id: z.string(),
  node_name: z.string(),
  identifier: z.string(),
  size: z.string(),
  management_mode: z.string(),
  sale_price: z.string(),
  rental_price: z.string(),
  status: z.string(),
  description: z.string(),
});

export const TenantUserSchema = z.object({
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
});

export const TenantAssignmentSchema = z.object({
  id: z.string(),
  node_id: z.string(),
  node: UnitDetailSchema,
  tenant_user_id: z.string(),
  tenant_user: TenantUserSchema,
  contract_start: z.string(),
  contract_end: z.string(),
  rent_amount: z.string(),
});

export const TenantAssignmentCreateInputSchema = z.object({
  node: z.string(), // node id
  tenant_user: z.string(), // user id
  contract_start: z.string(),
  contract_end: z.string(),
  rent_amount: z.string(),
});

export const TenantAssignmentUpdateInputSchema = z.object({
  node: z.string().optional(),
  tenant_user: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  rent_amount: z.string().optional(),
});

// Type exports for backward compatibility
export type UnitDetail = z.infer<typeof UnitDetailSchema>;
export type TenantUser = z.infer<typeof TenantUserSchema>;
export type TenantAssignment = z.infer<typeof TenantAssignmentSchema>;
export type TenantAssignmentCreateInput = z.infer<
  typeof TenantAssignmentCreateInputSchema
>;
export type TenantAssignmentUpdateInput = z.infer<
  typeof TenantAssignmentUpdateInputSchema
>;
