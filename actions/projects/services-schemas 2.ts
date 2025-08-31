import { z } from "zod";

export const ServiceAssignmentSchema = z.object({
  id: z.string(),
  service_name: z.string(),
  service_description: z.string().nullable(),
  service_pricing_type: z.string(),
  service_base_price: z.string().nullable(),
  service_percentage_rate: z.string().nullable(),
  service_frequency: z.string(),
  service_billed_to: z.string(),
  service_requires_approval: z.boolean(),
  service_is_active: z.boolean(),
  status: z.string(),
  currency: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  is_metered: z.boolean(),
  meter_identifier: z.string().nullable(),
  last_reading: z
    .object({
      reading_date: z.string(),
      reading_value: z.string(),
    })
    .nullable(),
  next_billing_date: z.string().nullable(),
  current_price: z.string().nullable(),
  structure_type: z.string(),
  structure_value: z.string(),
});

export const ProjectServiceStatisticsSchema = z.object({
  total_units: z.number(),
  total_houses: z.number(),
  total_blocks: z.number(),
  total_structures: z.number(),
  total_services: z.number(),
  metered_services: z.number(),
  unmetered_services: z.number(),
  active_services: z.number(),
  paused_services: z.number(),
  cancelled_services: z.number(),
  fixed_billing: z.number(),
  variable_billing: z.number(),
  percentage_billing: z.number(),
  expiring_soon: z.number(),
  top_service_types: z.array(z.object({ name: z.string(), count: z.number() })),
});

export const ProjectServiceOverviewSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  project_description: z.string(),
  statistics: ProjectServiceStatisticsSchema,
  service_assignments: z.array(ServiceAssignmentSchema),
  total_properties_with_services: z.number(),
  total_active_services: z.number(),
  total_revenue_potential: z.string(),
});

export const CreateServiceAssignmentSchema = z.object({
  service_id: z.string().uuid(),
  property_node_ids: z.array(z.string().uuid()),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).default("ACTIVE"),
  currency: z.string().nullable().optional(),

  is_metered: z.boolean().optional(),
  custom_price: z.union([z.number(), z.string()]).nullable().optional(),
});

export const ServiceAssignmentListSchema = z.array(ServiceAssignmentSchema);

export type ProjectServiceOverview = z.infer<
  typeof ProjectServiceOverviewSchema
>;
export type ProjectServiceStatistics = z.infer<
  typeof ProjectServiceStatisticsSchema
>;
export type ServiceAssignment = z.infer<typeof ServiceAssignmentSchema>;
export type ProjectServiceCreate = z.infer<
  typeof CreateServiceAssignmentSchema
>;
