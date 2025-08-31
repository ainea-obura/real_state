import { z } from 'zod';

export const PaymentInvoiceAppliedSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  amount: z.union([z.string(), z.number()]),
  appliedAmount: z.union([z.string(), z.number()]),
});

export const TransactionAppliedSchema = z.object({
  id: z.string(),
  trans_id: z.string(),
  merchant_code: z.string(),
  payment_method: z.string(),
  full_name: z.string(),
  trans_amount: z.string(),
  trans_time: z.string(),
  is_verified: z.boolean(),
  bill_ref_number: z.string(),
  msisdn: z.string(),
});

export const CreatePaymentSchema = z.object({
  recipientType: z.enum(["tenant", "owner"]),
  recipient: z.object({
    id: z.string(),
    name: z.string(),
  }),
  paymentDate: z.string(), // ISO date string
  paymentMethod: z.string(),
  amountPaid: z.union([z.string(), z.number()]),
  notes: z.string().optional(),
  sendReceipt: z.boolean().optional(),
  invoicesApplied: z.array(PaymentInvoiceAppliedSchema),
  transactionsApplied: z.array(TransactionAppliedSchema).optional(),
  totalApplied: z.union([z.string(), z.number()]),
  balance: z.union([z.string(), z.number()]),
  status: z.string(),
});

export type CreatePaymentPayload = z.infer<typeof CreatePaymentSchema>;

export const UnpaidInvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  due_date: z.string(),
  total_amount: z.string(),
  paid_amount: z.union([z.string(), z.number()]),
  balance: z.union([z.string(), z.number()]),
  status: z.string(),
  discount: z.union([z.string(), z.number()]).optional(),
  tax_percentage: z.union([z.string(), z.number()]).optional(),
  tax_amount: z.union([z.string(), z.number()]).optional(),
});

export const UnpaidInvoicesResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(UnpaidInvoiceSchema),
  }),
});

export type UnpaidInvoice = z.infer<typeof UnpaidInvoiceSchema>;
export type UnpaidInvoicesResponse = z.infer<
  typeof UnpaidInvoicesResponseSchema
>;

export const PaymentStatsSchema = z.object({
  totalPayments: z.string(),
  totalAmountPaid: z.string(),
  totalInvoices: z.string(),
  totalOutstanding: z.string(),
  lastPaymentDate: z.string().nullable(), // ISO date or null if none
});

export type PaymentStats = z.infer<typeof PaymentStatsSchema>;

export const PaymentStatsResponseSchema = z.object({
  error: z.boolean(),
  data: PaymentStatsSchema,
});

export type PaymentStatsResponse = z.infer<typeof PaymentStatsResponseSchema>;

export const PaymentTableItemSchema = z.object({
  id: z.string(),
  paymentNumber: z.string(),
  tenant: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  property: z.object({
    unit: z.string(),
    projectName: z.string(),
  }),
  paymentDate: z.string(),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "online",
    "evc_plus",
    "mpesa",
    "other",
  ]),
  amountPaid: z.string(),
  amountPaidNoCurrency: z.number(),
  invoicesApplied: z.array(
    z.object({
      id: z.string(),
      invoiceNumber: z.string(),
      amount: z.string(),
    })
  ),
  balanceRemaining: z.string(),
  status: z.enum(["success", "failed", "refunded", "partial", "pending"]),
  notes: z.string().optional(),
  receiptUrl: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type PaymentTableItem = z.infer<typeof PaymentTableItemSchema>;

export const PaymentTableResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(PaymentTableItemSchema),
  }),
});

export type PaymentTableResponse = z.infer<typeof PaymentTableResponseSchema>;
