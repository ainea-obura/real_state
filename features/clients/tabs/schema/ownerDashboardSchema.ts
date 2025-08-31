import { z } from 'zod';

// Owner Detail Schema
export const OwnerDetailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  type: z.enum(["tenant", "owner"]),
  is_active: z.boolean(),
  is_owner_verified: z.boolean().optional(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Owner Stats Schema
export const OwnerStatsSchema = z.object({
  total_income: z.string(),
  pending_invoices: z.string(),
  owned_properties: z.string(),
  total_outstanding: z.string(),
  occupancy_rate: z.string(),
  total_service_cost: z.string(),
  total_management_cost: z.string(),
});

// Owner Dashboard Response Schema
export const OwnerDashboardResponseSchema = z.object({
  error: z.boolean().optional(),
  message: z.string().nullable().optional(),
  data: z.object({
    count: z.number(),
    results: z.array(
      z.object({
        owner: OwnerDetailSchema,
        stats: OwnerStatsSchema,
      })
    ),
  }),
});

// Types
export type OwnerDetail = z.infer<typeof OwnerDetailSchema>;
export type OwnerStats = z.infer<typeof OwnerStatsSchema>;
export type OwnerDashboardResponse = z.infer<
  typeof OwnerDashboardResponseSchema
>;
