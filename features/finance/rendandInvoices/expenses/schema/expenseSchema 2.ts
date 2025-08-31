import { z } from "zod";

export const ExpenseSchema = z.object({
  id: z.string(),
  expense_number: z.string(),
  location_node: z.object({ id: z.string(), name: z.string(), project_name: z.string().optional() }).nullable(),
  service: z.object({ id: z.string(), name: z.string(), billed_to: z.string().optional() }).nullable(),
  vendor: z.object({ id: z.string(), name: z.string(), email: z.string().optional(), phone: z.string().optional() }).nullable(),
  description: z.string(),
  amount: z.string(),
  commission_type: z.string().optional(),
  commission_reference: z.string().optional(),
  tax_amount: z.preprocess((val) => typeof val === "string" ? parseFloat(val) : val, z.number()),
  total_amount: z.string(),
  invoice_date: z.string(),
  due_date: z.string(),
  paid_date: z.string().nullable(),
  status: z.string(),
  payment_method: z.string(),
  notes: z.string().optional(),
  document_url: z.string().url().nullable().optional(),
  currency: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    symbol: z.string(),
    decimal_places: z.number().optional(),
    default: z.boolean().optional(),
  }).nullable(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpenseCreateSchema = z.object({
  location_node_id: z.string(), // property/location node id
  service_id: z.string(),
  vendor_id: z.string(),
  amount: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  invoice_date: z.string(),
  due_date: z.string(),
  payment_method: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
  attachment: z.any().optional(),
  currency: z.string(),

});

export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>; 