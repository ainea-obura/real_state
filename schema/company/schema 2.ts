import { z } from 'zod';

// Branch minimal schema (matches BranchMinimalSerializer)
export const BranchSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

// API Response schema
export const BranchListResponseSchema = z.object({
  isError: z.boolean(),
  error: z.boolean(),
  message: z.string(),
  data: z.array(BranchSchema),
});

// Infer types
export type Branch = z.infer<typeof BranchSchema>;
export type BranchListResponse = z.infer<typeof BranchListResponseSchema>;
