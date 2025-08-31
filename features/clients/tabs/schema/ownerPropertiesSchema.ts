import { z } from 'zod';

// Tenant schema (current_tenant)
export const CurrentTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  contract_start: z.string(),
  contract_end: z.string(),
  rent_amount: z.string(),
});

// Property schema (properties[])
export const PropertySchema = z.object({
  id: z.string(),
  name: z.string(),
  node_type: z.string(),
  parent: z.string().nullable(),
  property_node: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  maintenance_requests: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      created_at: z.string().optional(),
    })
  ),
  current_tenant: CurrentTenantSchema.nullable(),
});

// Summary schema
export const SummarySchema = z.object({
  total_properties: z.number(),
  active_tenants: z.number(),
  occupancy_rate: z.number(),
  total_maintenance: z.number(),
  total_emergency_maintenance: z.number(),
});

// Main result schema: only allow the new shape
export const OwnerPropertiesResultSchema = z.object({
  summary: SummarySchema,
  properties: z.array(PropertySchema),
});

// API Response wrapper schema
export const OwnerPropertiesApiResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(OwnerPropertiesResultSchema),
  }),
});
