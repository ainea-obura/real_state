import { z } from 'zod';

export const assignmentSchema = z.object({
  unit_ids: z.array(z.string().min(1)),
  slot_id: z.string().min(1),
});

export type AssignmentPayload = z.infer<typeof assignmentSchema>; 