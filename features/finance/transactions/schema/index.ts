import { z } from 'zod';

// Unified Transaction API Response Schema

export interface Person {
  name: string;
  email: string;
  phone: string;
}

export interface Transaction {
  id: string;
  date: string | null;
  tenant: Person | null;
  owners: Person[];
  agents: Person[];
  vendors: Person[];
  unit: string | null;
  property: string | null;
  type: "INV" | "RV" | "PV";
  reference: string;
  amount: string; // formatted with currency symbol, e.g. 'KES 1,500'
  status: string;
  method: string | null;
  notes: string;
}

export interface TransactionsSummary {
  total_income: string;
  outstanding: string;
  overdue: string;
  upcoming: string;
  expenses: string;
}

export interface TransactionsResponse {
  error: boolean;
  data: {
    count: number;
    results: Transaction[];
    summary: TransactionsSummary;
  };
}

// Zod schema for Person
export const PersonSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
});

// Zod schema for Transaction
export const TransactionSchema = z.object({
  id: z.string(),
  date: z.string().nullable(),
  tenant: PersonSchema.nullable(),
  owners: z.array(PersonSchema),
  agents: z.array(PersonSchema),
  vendors: z.array(PersonSchema),
  unit: z.string().nullable(),
  property: z.string().nullable(),
  type: z.enum(["INV", "RV", "PV"]),
  reference: z.string(),
  amount: z.string(),
  status: z.string(),
  method: z.string().nullable(),
  notes: z.string(),
});

// Zod schema for TransactionsSummary
export const TransactionsSummarySchema = z.object({
  total_income: z.string(),
  outstanding: z.string(),
  overdue: z.string(),
  upcoming: z.string(),
  expenses: z.string(),
});

// Zod schema for TransactionsResponse
export const TransactionsResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(TransactionSchema),
    summary: TransactionsSummarySchema,
  }),
});
