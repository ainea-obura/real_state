import { z } from 'zod';

// Stat summary
export const TenantFinanceStatSchema = z.object({
  total_billed: z.string(),
  total_paid: z.string(),
  outstanding: z.string(),
  overdue: z.string(),
  paid_invoices: z.number(),
  overdue_invoices: z.union([z.string(), z.number()]), // <-- allow both
  penalties: z.string(),
  avg_payment_delay: z.union([z.string(), z.number()]), // <-- allow both
  next_bill_due: z.union([z.string(), z.null()]), // <-- allow null
});

// Lease summary
export const TenantLeaseSummarySchema = z.object({
  unit: z.string(),
  property: z.string(),
  rent: z.string(),
  deposit: z.string(),
  currency: z.string(),
  contract_start: z.string(), // ISO date
  contract_end: z.string(),   // ISO date
});

// Penalty
export const PenaltySchema = z.object({
  type: z.string(),
  amount: z.string(),
  status: z.string(),
  due: z.string(), // ISO date
});

// Invoice
export const InvoiceSummarySchema = z.object({
  number: z.string(),
  type: z.string(),
  status: z.string(),
  due: z.string(), // ISO date
  amount: z.string(),
});

// Payment
export const PaymentSummarySchema = z.object({
  ref: z.string(),
  date: z.string(), // ISO date
  amount: z.string(),
  method: z.string(),
  status: z.string(),
});

// Main response schema
export const TenantFinanceSummarySchema = z.object({
  stats: TenantFinanceStatSchema,
  lease: TenantLeaseSummarySchema,
  penalties: z.array(PenaltySchema),
  recent_invoices: z.array(InvoiceSummarySchema),
  recent_payments: z.array(PaymentSummarySchema),
  bill_health_score: z.number(),
});

// Type for usage
export type TenantFinanceSummary = z.infer<typeof TenantFinanceSummarySchema>;
