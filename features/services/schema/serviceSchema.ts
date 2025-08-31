import { z } from "zod";

// Service form schema with conditional validation
export const serviceFormSchema = z
  .object({
    name: z.string().min(1, "Service name is required").max(255),
    description: z.string().optional(),
    pricing_type: z.enum(["FIXED", "VARIABLE", "PERCENTAGE"]),
    base_price: z.string().optional(),
    percentage_rate: z.string().optional(),
    currency: z.string().optional(),
    frequency: z.enum([
      "ONE_TIME",
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "QUARTERLY",
      "YEARLY",
    ]),
    billed_to: z.enum(["TENANT", "OWNER", "MANAGEMENT"]),
  })
  .refine(
    (data) => {
      // Conditional validation based on pricing type
      if (data.pricing_type === "FIXED") {
        return data.base_price && parseFloat(data.base_price) > 0;
      }
      if (data.pricing_type === "PERCENTAGE") {
        return data.percentage_rate && parseFloat(data.percentage_rate) > 0;
      }
      return true;
    },
    {
      message: "Price is required",
      path: ["base_price"],
    }
  );

// Service response schema
export const serviceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pricing_type: z.enum(["FIXED", "VARIABLE", "PERCENTAGE"]),
  base_price: z.string().nullable(),
  percentage_rate: z.string().nullable(),
  frequency: z.string(),
  billed_to: z.enum(["TENANT", "OWNER", "MANAGEMENT"]),
  currency: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  total_properties: z.number(),
  code: z.string().optional(),
  symbol: z.string().optional(),
});

// Services list response schema
export const servicesListResponseSchema = z.object({
  isError: z.boolean(),
  message: z.string().nullable(),
  data: z.object({
    count: z.number(),
    results: z.array(serviceResponseSchema),
  }),
});

// Service form values type
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// Service response type
export type ServiceResponse = z.infer<typeof serviceResponseSchema>;

// Services list response type
export type ServicesListResponse = z.infer<typeof servicesListResponseSchema>;

// Service API request type (for backend)
export type ServiceApiRequest = Omit<ServiceFormValues, "currency"> & {
  base_price?: string;
  percentage_rate?: string;
  currency: string;
};
