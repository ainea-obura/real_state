import { z } from "zod";

// Position Schema
export const positionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, "Position name is required")
    .max(255, "Position name must be less than 255 characters"),
  description: z.string().optional(),
  is_deleted: z.boolean().default(false),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
});

// Position Form Schema (for create/edit forms)
export const positionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Position name is required")
    .max(255, "Position name must be less than 255 characters"),
  description: z.string().optional(),
});

// Position Response Schema
export const positionResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Positions List Response Schema
export const positionsListResponseSchema = z.object({
  count: z.number(),
  results: z.array(positionResponseSchema),
});

// Position Table Item Schema
export const positionTableItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  modified_at: z.string(),
});

// Export types
export type Position = z.infer<typeof positionSchema>;
export type PositionForm = z.infer<typeof positionFormSchema>;
export type PositionResponse = z.infer<typeof positionResponseSchema>;
export type PositionsListResponse = z.infer<typeof positionsListResponseSchema>;
export type PositionTableItem = z.infer<typeof positionTableItemSchema>;
