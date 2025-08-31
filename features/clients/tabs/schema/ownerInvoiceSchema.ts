// Owner Invoice API Response Schema

export interface OwnerInvoiceReceipt {
  id: string;
  paid_amount: string;
  payment_date: string;
  receipt_number: string;
  notes: string;
}

export interface OwnerInvoice {
  id: string;
  invoice_number: string;
  description: string;
  status: string;
  total_amount: string;
  issue_date: string;
  due_date: string;
  property_name: string;
  receipts: OwnerInvoiceReceipt[];
  balance: string;
}

export interface OwnerInvoiceSummary {
  total_outstanding: string;
  total_paid: string;
  total_invoices: number;
  total_receipts: number;
  invoices: OwnerInvoice[];
}

export interface OwnerInvoiceApiResponse {
  error: boolean;
  data: OwnerInvoiceSummary;
}
