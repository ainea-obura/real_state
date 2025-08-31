import z from "zod";

// --- Zod Schema for Recipient Search Response ---
export const RecipientUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  node_type: z.string(),
  details: z
    .object({
      rent_price: z.number().nullable(),
      currency: z
        .object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          symbol: z.string(),
        })
        .nullable(),
    })
    .nullable()
    .optional(),
});

export const RecipientNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  node_type: z.string(),
});

export const RecipientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  type: z.string(),
  rented_units: z.array(RecipientUnitSchema),
  owned_nodes: z.array(RecipientNodeSchema),
});

export const RecipientSearchResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(RecipientSchema),
  }),
});

export type Recipient = z.infer<typeof RecipientSchema>;
export type RecipientSearchResponse = z.infer<
  typeof RecipientSearchResponseSchema
>;

export interface CurrencyInfo {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// Updated to match new backend structure with amount, quantity, price
export interface TenantUnitItem {
  description: string;
  node_name: string;
  type: "RENT" | "DEPOSIT" | "FIXED" | "PERCENTAGE" | "VARIABLE" | "PENALTY" | "SERVICE_CHARGE";
  quantity: number;
  amount: number; // Single item amount
  price: number; // Total amount (amount × quantity)
  percentage_rate: number | null;
  currency: CurrencyInfo;
  inputRequired?: boolean;
  serviceId?: string;
  unitId?: string;
  penaltyId?: string;
}

export interface TenantUnitItemsResponse {
  error: boolean;
  data: {
    count: number;
    results: Array<{
      unit_id: string;
      unit_name: string;
      node_type: string;
      items: TenantUnitItem[];
    }>;
  };
}

// Updated to match new backend structure
export interface SubmitInvoiceItem {
  description: string;
  type: string;
  quantity: number;
  amount: number; // Single item amount
  price: number; // Total amount (amount × quantity)
  percentage_rate?: number | null;
  currency: CurrencyInfo;
  inputRequired?: boolean;
  serviceId?: string;
  penaltyId?: string;
}

export interface SubmitInvoiceUnit {
  unitId: string;
  unitName: string;
  items: SubmitInvoiceItem[];
}

export interface SubmitInvoiceRecipient {
  id: string; // tenant or owner UUID
  type: "tenant" | "owner";
  name: string;
  units: SubmitInvoiceUnit[];
}

export interface SubmitInvoicePayload {
  recipients: SubmitInvoiceRecipient[];
  dueDate: string;
  issueDate: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringEndDate?: string;
  taxPercentage?: number;
  discountPercentage?: number;
  status: "draft" | "issued";
}

// --- Zod Schema for Invoice Stat Card Summary ---
export const InvoiceStatsSchema = z.object({
  totalInvoices: z.number(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  outstandingAmount: z.string(),
  draftInvoices: z.number(),
  sentInvoices: z.number(),
  paidInvoices: z.number(),
  overdueInvoices: z.number(),
});

export interface FetchInvoiceTableParams {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceTableItem {
  id: string;
  invoiceNumber: string;
  type: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
    type: string;
  };
  property: {
    unit: string;
    projectName: string;
  };
  items: Array<{
    description: string;
    type: string;
    quantity: number;
    amount: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  tax_percentage: number;
  balance: number;
  total: number;
  total_no_currency: number;
  dueDate: string;
  issueDate: string;
  status: string;
  paymentMethod?: string;
  paidDate?: string;
  notes?: string;
  recurring?: any;
  template?: string;
  currency: CurrencyInfo;
}

export interface InvoiceTableResponse {
  count: number;
  results: InvoiceTableItem[];
}

export interface UpdateInvoiceItem {
  id: string;
  amount?: number;
  quantity?: number;
}

export interface UpdateInvoicePayload {
  items: UpdateInvoiceItem[];
  type: "draft" | "issued";
  tax_percentage?: number;
  notes?: string;
  due_date?: string;
  issue_date?: string;
}

export type InvoiceStats = z.infer<typeof InvoiceStatsSchema>;


