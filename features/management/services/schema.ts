import { z } from "zod";

export const ServiceNameSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const PropertyServiceCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "paused", "cancelled"]),
  thumbnail: z.string().optional(),
  services: z.array(ServiceNameSchema),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  descendant: z.string(),
  project_id: z.string(),
  block_id: z.string().optional(),
});

export const ServiceCardListResponseSchema = z.object({
  error: z.boolean(),
  data: z.array(PropertyServiceCardSchema),
});

export type PropertyServiceCard = z.infer<typeof PropertyServiceCardSchema>;
export type ServiceName = z.infer<typeof ServiceNameSchema>; 