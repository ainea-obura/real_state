import { z } from 'zod';

export const VendorSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
});

export const MaintenanceRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  project: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  vendor: VendorSchema,
  created_by: z.string(),
  created_at: z.string(), // ISO date string
});

export const MaintenanceRequestListSchema = z.object({
  count: z.number(),
  results: z.array(MaintenanceRequestSchema),
});

export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;
export type MaintenanceRequestList = z.infer<typeof MaintenanceRequestListSchema>;
