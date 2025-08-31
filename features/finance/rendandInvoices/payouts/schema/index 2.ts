import z from 'zod';

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  decimal_places: number;
  default: boolean;
}

export interface Payout {
  id: string;
  owner: string;
  property_node: string;
  currency: Currency | null;
  owner_name: string;
  owner_phone: string;
  total_properties: number;
  uncollected_rent: string;
  expected_rent: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  payout_number: string;
  payout_date: string | null;
  month: number;
  year: number;
  rent_collected: string;
  services_expenses: string;
  management_fee: string;
  net_amount: string;
  status: string;
  notes: string;
  approved_by: string | null;
  amount: number;
}

export interface PayoutApiResponse {
  error: boolean;
  data: {
    count: number;
    results: Payout[];
  };
  summary: {
    total_payouts: string;
    pending: string;
    total_amount: string;
    completed_amount: string;
  };
}

// Zod schema for validation
export const CurrencySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  symbol: z.string(),
  decimal_places: z.number(),
  default: z.boolean(),
});

export const PayoutSchema = z.object({
  id: z.string(),
  owner: z.string(),
  property_node: z.string(),
  currency: CurrencySchema.nullable(),
  owner_name: z.string(),
  owner_phone: z.string(),
  total_properties: z.number(),
  uncollected_rent: z.string(),
  expected_rent: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  is_deleted: z.boolean(),
  payout_number: z.string(),
  payout_date: z.string().nullable(),
  month: z.number(),
  year: z.number(),
  rent_collected: z.string(),
  services_expenses: z.string(),
  management_fee: z.string(),
  net_amount: z.string(),
  status: z.string(),
  notes: z.string(),
  approved_by: z.string().nullable(),
  amount: z.number(),
});

export const PayoutApiResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(PayoutSchema),
  }),
  summary: z.object({
    total_payouts: z.string(),
    pending: z.string(),
    total_amount: z.string(),
    completed_amount: z.string(),
  }),
});
