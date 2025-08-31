import { z } from 'zod';

// Owner Income Dashboard Schema (matches PropertyOwnerIncomeDetailSerializer response)

export interface OwnerIncomeTransaction {
  payout_number: string;
  amount: string;
  date: string | null;
  property: string | null;
  status: string;
}

export interface OwnerIncomeTrend {
  month: string;
  income: string;
  management_fee: string;
}

export interface OwnerIncomeDetailResponse {
  total_income: string;
  management_fee: string;
  monthly_average_income: string;
  outstanding_payments: string;
  income_transactions: OwnerIncomeTransaction[];
  last_3_months_trend: OwnerIncomeTrend[];
}

export interface OwnerIncomeApiResponse {
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: OwnerIncomeDetailResponse[];
  };
}

export const OwnerIncomeTransactionSchema = z.object({
  payout_number: z.string(),
  amount: z.string(),
  date: z.string().nullable(),
  property: z.string().nullable(),
  status: z.string(),
});

export const OwnerIncomeTrendSchema = z.object({
  month: z.string(),
  income: z.string(),
  management_fee: z.string(),
});

export const OwnerIncomeDetailResponseSchema = z.object({
  total_income: z.string(),
  management_fee: z.string(),
  monthly_average_income: z.string(),
  outstanding_payments: z.string(),
  income_transactions: z.array(OwnerIncomeTransactionSchema),
  last_3_months_trend: z.array(OwnerIncomeTrendSchema),
});

export const OwnerIncomeApiResponseSchema = z.object({
  error: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    count: z.number(),
    results: z.array(OwnerIncomeDetailResponseSchema),
  }),
});
