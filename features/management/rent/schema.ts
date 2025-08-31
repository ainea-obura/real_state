import { z } from "zod";

export const DescendantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string().optional(),
});

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string().optional(),
});

export const LocationNodeSchema = z.object({
  block: z.string(),
  floor: z.string(),
});

export const RentalUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.enum(["available", "rented"]),
  rental_price: z.union([z.string(), z.number()]), // Accept string or number
  size: z.string(),
  tenant: TenantSchema.nullable(), // Accept null
  agent: AgentSchema.nullable(),
  rental_start: z.string().nullable(), // Accept null
  rental_end: z.string().nullable(),   // Accept null
  identifier: z.string(),
  project: z.string(),
  location_node: LocationNodeSchema,
  thumbnail: z.string().optional(),
  days_remaining: z.number().nullable(),
  // descendants, invoices, payments are not returned by backend
});

export const RentListResponseSchema = z.object({
  error: z.boolean(),
  data: z.array(RentalUnitSchema),
});

export type RentalUnit = z.infer<typeof RentalUnitSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type Descendant = z.infer<typeof DescendantSchema>; 