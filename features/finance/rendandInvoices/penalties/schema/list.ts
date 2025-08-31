import { z } from 'zod';

// Penalty Type Enum
export const PenaltyTypeSchema = z.enum([
  "late_payment",
  "returned_payment",
  "lease_violation",
  "utility_overcharge",
  "other",
]);

// Penalty Status Enum
export const PenaltyStatusSchema = z.enum([
  "pending",
  "applied_to_invoice",
  "waived",
  "paid",
]);

// Amount Type Enum (fixed only)
export const AmountTypeSchema = z.enum(["fixed"]);

// Tenant Information Schema
export const TenantInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
});

// Property Information Schema
export const PropertyInfoSchema = z.object({
  unit: z.string(),
  project_name: z.string(),
});

// Currency Information Schema
export const CurrencyInfoSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    symbol: z.string(),
  })
  .nullable();

// Linked Invoice Information Schema
export const LinkedInvoiceInfoSchema = z
  .object({
    id: z.string(),
    invoice_number: z.union([z.string(), z.number()]),
  })
  .nullable();

// Created By User Information Schema
export const CreatedByInfoSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .nullable();

// Waived By User Information Schema
export const WaivedByInfoSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .nullable();

// Individual Penalty Schema
export const PenaltySchema = z.object({
  id: z.string(),
  penalty_number: z.string(),
  tenant: TenantInfoSchema,
  property: PropertyInfoSchema,
  penalty_type: PenaltyTypeSchema,
  amount: z.string(), // Backend returns formatted currency string
  amount_type: AmountTypeSchema,
  date_applied: z.string().nullable().optional(), // ISO date string
  due_date: z.string(), // ISO date string
  status: PenaltyStatusSchema,
  currency_info: CurrencyInfoSchema,
  linked_invoice_info: LinkedInvoiceInfoSchema,
  notes: z.string().optional(),
  tenant_notes: z.string().optional(),
  created_by_info: CreatedByInfoSchema,
  created_at: z.string(), // ISO datetime string
  updated_at: z.string().optional(), // ISO datetime string
  waived_at: z.string().nullable().optional(), // Backend returns null, allow null
  waived_by_info: WaivedByInfoSchema,
  waived_reason: z.string().nullable().optional(), // Backend returns null, allow null
});

// Penalty List Response Schema
export const PenaltyListResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(PenaltySchema),
  }),
});

// Penalty List Query Parameters Schema
export const PenaltyListQuerySchema = z.object({
  q: z.string().optional(), // Search query
  penalty_type: PenaltyTypeSchema.optional(),
  status: PenaltyStatusSchema.optional(),
  date_applied_from: z.string().optional(), // YYYY-MM-DD
  date_applied_to: z.string().optional(), // YYYY-MM-DD
  due_date_from: z.string().optional(), // YYYY-MM-DD
  due_date_to: z.string().optional(), // YYYY-MM-DD
  tenant_name: z.string().optional(),
  property_unit: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  ordering: z.string().optional(), // e.g., "-created_at", "amount", etc.
});

// TypeScript types derived from schemas
export type PenaltyType = z.infer<typeof PenaltyTypeSchema>;
export type PenaltyStatus = z.infer<typeof PenaltyStatusSchema>;
export type AmountType = z.infer<typeof AmountTypeSchema>;
export type TenantInfo = z.infer<typeof TenantInfoSchema>;
export type PropertyInfo = z.infer<typeof PropertyInfoSchema>;
export type CurrencyInfo = z.infer<typeof CurrencyInfoSchema>;
export type LinkedInvoiceInfo = z.infer<typeof LinkedInvoiceInfoSchema>;
export type CreatedByInfo = z.infer<typeof CreatedByInfoSchema>;
export type WaivedByInfo = z.infer<typeof WaivedByInfoSchema>;
export type Penalty = z.infer<typeof PenaltySchema>;
export type PenaltyListResponse = z.infer<typeof PenaltyListResponseSchema>;
export type PenaltyListQuery = z.infer<typeof PenaltyListQuerySchema>;
