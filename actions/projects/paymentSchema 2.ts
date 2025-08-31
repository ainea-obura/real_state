import { z } from 'zod';

export const PaymentReportSchema = z.object({
  stats: z.object({
    totalIncome: z.string(),
    totalExpenses: z.string(),
    netBalance: z.string(),
  }),
  recentInvoices: z.array(
    z.object({
      number: z.string(),
      recipient: z.string(),
      amount: z.string(),
      status: z.string(),
      date: z.string(),
      property_name: z.string(),
      location_name: z.string(),
    })
  ),
  recentExpenses: z.array(
    z.object({
      number: z.string(),
      vendor: z.string(),
      amount: z.string(),
      status: z.string(),
      date: z.string(),
      desc: z.string(),
      property_name: z.string(),
      location_name: z.string(),
    })
  ),
});

export type PaymentReport = z.infer<typeof PaymentReportSchema>;
