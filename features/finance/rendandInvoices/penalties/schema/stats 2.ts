import { z } from 'zod';

// Penalty Statistics Schema
export const PenaltyStatsSchema = z.object({
  total_penalties: z.number(),
  pending_penalties: z.number(),
  total_amount: z.string(),
  waived_amount: z.string(),
  applied_amount: z.string(),
  paid_amount: z.string(),
});

// API Response Schema for Penalty Stats
export const PenaltyStatsResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(PenaltyStatsSchema),
  }),
});

// TypeScript types derived from schemas
export type PenaltyStats = z.infer<typeof PenaltyStatsSchema>;
export type PenaltyStatsResponse = z.infer<typeof PenaltyStatsResponseSchema>;
