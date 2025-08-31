import { z } from 'zod';

// Schema for rent roll summary item
export const RentRollSummaryItemSchema = z.object({
  total_properties: z.number(),
  occupied_properties: z.number(),
  vacant_properties: z.number(),
  rent_expected: z.string(),
  total_expected: z.string(),
  collected: z.string(),
});

// Schema for rent roll summary data
export const RentRollSummaryDataSchema = z.object({
  count: z.number(),
  results: z.array(RentRollSummaryItemSchema),
});

// Schema for the complete rent roll summary response
export const RentRollSummaryResponseSchema = z.object({
  error: z.boolean(),
  data: RentRollSummaryDataSchema,
  message: z.string().nullable().optional(),
});

// Type exports
export type RentRollSummaryItem = z.infer<typeof RentRollSummaryItemSchema>;
export type RentRollSummaryData = z.infer<typeof RentRollSummaryDataSchema>;
export type RentRollSummaryResponse = z.infer<
  typeof RentRollSummaryResponseSchema
>;
