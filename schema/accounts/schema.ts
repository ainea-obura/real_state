import { z } from "zod";

export const AccountType = z.enum(["bank", "mobile"]);

export const AccountFormSchema = z.object({
  user_id: z.string().uuid(),
  account_name: z.string().min(1, "Account name is required"),
  account_code: z.string().optional(),
  account_number: z.string().min(1, "Account number is required"),
  account_type: AccountType,
  bank_name: z.string().optional(),
  is_default: z.boolean(),
  is_active: z.boolean(),
});

export const AccountResponseSchema = z.object({
  error: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    count: z.number(),
    results: z.array(z.object({
      id: z.string(),
      user: z.string(),
      account_name: z.string(),
      account_code: z.string().optional(),
      account_number: z.string(),
      account_type: AccountType,
      bank_name: z.string().optional(),
      is_default: z.boolean(),
      is_active: z.boolean(),
      created_at: z.string(),
      updated_at: z.string(),
    })),
  }).optional(),
});

export type AccountFormValues = z.infer<typeof AccountFormSchema>;
export type AccountResponse = z.infer<typeof AccountResponseSchema>;

export interface Account {
  id: string;
  user: string;
  account_name: string;
  account_code?: string;
  account_number: string;
  account_type: "bank" | "mobile";
  bank_name?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} 