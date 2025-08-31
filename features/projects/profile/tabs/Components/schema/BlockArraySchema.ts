import { z } from 'zod';

export const BlockArraySchema = z.object({
  blocks: z
    .array(
      z.object({
        name: z.string().min(1, "Block name is required"),
        floors: z.number().min(0).max(100, "Floors must be between 0 and 100"),
      })
    )
    .min(1, "At least one block is required"),
});

export type BlockArrayFormData = z.infer<typeof BlockArraySchema>;
