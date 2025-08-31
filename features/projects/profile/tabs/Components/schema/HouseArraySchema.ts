import { z } from 'zod';

export const HouseArraySchema = z.array(
  z.object({
    name: z.string().min(1, "House name is required"),
    floors: z.number().min(0).max(100, "Floors must be between 0 and 100"),
    management_mode: z.enum(["FULL_MANAGEMENT", "SERVICE_ONLY"]),
    service_charge: z.number().optional(),
  })
);

export type HouseArrayFormData = z.infer<typeof HouseArraySchema>;
