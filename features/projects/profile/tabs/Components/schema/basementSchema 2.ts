import { z } from "zod";

export const BasementSchema = z.array(
  z.object({
    name: z.string().min(1, "Name is required"),
    slots: z.number().min(0).max(100, "Slots must be between 0 and 100"),
  })
);

export type BasementFormData = z.infer<typeof BasementSchema>;
