import { z } from 'zod';

// Schema for last payment object
export const LastPaymentSchema = z.object({
  date: z.string(),
  amount: z.string(),
});

// Schema for individual rent roll property
export const RentRollPropertySchema = z.object({
  id: z.string(),
  property: z.string(),
  propertyType: z.string(),
  projectName: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.number(),
  tenantName: z.string(),
  tenantContact: z.string(),
  leaseStart: z.string(),
  leaseEnd: z.string(),
  monthlyRent: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  nextDueDate: z.string(),
  lastPayment: LastPaymentSchema,
  balance: z.string(),
  status: z.string(),
  paymentProgress: z.number(),
  rentAmount: z.string(),
  servicesAmount: z.string(),
  penaltiesAmount: z.string(),
  totalPaid: z.string(),
});

// Schema for rent roll summary
export const RentRollSummarySchema = z.object({
  total_properties: z.number(),
  occupied_properties: z.number(),
  vacant_properties: z.number(),
  rent_expected: z.string(),
  total_expected: z.string(),
  collected: z.string(),
});

// Schema for pagination
export const PaginationSchema = z.object({
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

// Schema for rent roll list data
export const RentRollListDataSchema = z.object({
  count: z.number(),
  results: z.array(RentRollPropertySchema),
  summary: RentRollSummarySchema,
  pagination: PaginationSchema.optional(),
});

// Schema for the complete rent roll list response
export const RentRollListResponseSchema = z.object({
  error: z.boolean(),
  data: RentRollListDataSchema,
  message: z.string().nullable().optional(),
});

// Type exports
export type LastPayment = z.infer<typeof LastPaymentSchema>;
export type RentRollProperty = z.infer<typeof RentRollPropertySchema>;
export type RentRollSummary = z.infer<typeof RentRollSummarySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type RentRollListData = z.infer<typeof RentRollListDataSchema>;
export type RentRollListResponse = z.infer<typeof RentRollListResponseSchema>;
