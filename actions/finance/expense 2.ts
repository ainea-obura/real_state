"use server";

import { getServerSession } from "next-auth";
import { ExpenseSchema } from "@/features/finance/rendandInvoices/expenses/schema/expenseSchema";
import { ExpenseCreateSchema } from "@/features/finance/rendandInvoices/expenses/schema/expenseSchema";
import { authOptions } from "@/lib/auth";
import { Currency } from "@/features/finance/rendandInvoices/currency/schema/types";
const API_BASE_URL = process.env.API_BASE_URL;

// --- Types ---
export type Expense = typeof ExpenseSchema._type;
export type ExpenseCreate = typeof ExpenseCreateSchema._type;

export interface FetchExpenseTableParams {
  page?: number;
  page_size?: number;
}

export interface ExpenseStats {
  totalExpenses: string;
  totalPaid: string;
  outStanding: string;
  pendingExpenses: string;
  overdueExpenses: string;
  budgetRemaining: string;
  monthlyBudget: string;
  currency: Currency;
}

export interface Commission {
  id: string;
  type: 'sales' | 'tenant' | 'sales_person';
  recipient: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  amount: string;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  reference: string;
  commission_id: string;
  sale_id?: string;
  tenant_id?: string;
  sales_person_id?: string;
  property_node_id: string;
  property_node_name: string;
  // Additional fields for sales person commissions
  commission_type?: string;
  commission_rate?: string;
  payment_setting?: string;
}

// --- Fetch Expense Stats ---
export const fetchExpenseStats = async (): Promise<ExpenseStats> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/finance/expenses/stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch expense stats");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from expense stats API");
  return data.data;
};

// --- Fetch Pending Commissions ---
export const fetchPendingCommissions = async (): Promise<Commission[]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/finance/expenses/commissions/pending`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Use backend's custom error message if available
    const errorMessage = data?.message || data?.error || "Failed to fetch pending commissions";
    throw new Error(errorMessage);
  }
  
  if (!data || typeof data !== "object" || !data.data) {
    throw new Error("Invalid response from commissions API");
  }
  
  return data.data;
};

// --- Create Commission Expenses ---
export interface CreateCommissionExpenseRequest {
  commissions: {
    id: string;
    type: 'sales' | 'tenant' | 'sales_person';
    amount: string;
    property_node_id: string;
    commission_id: string;
  }[];
  payment_method: string;
  notes?: string;
}

export interface CreateCommissionExpenseResponse {
  expenses: {
    id: string;
    expense_number: number;
    amount: string;
    status: string;
  }[];
  total_amount: string;
  count: number;
}

export const createCommissionExpenses = async (
  request: CreateCommissionExpenseRequest
): Promise<CreateCommissionExpenseResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  const response = await fetch(`${API_BASE_URL}/finance/expenses/commissions/create`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Use backend's custom error message if available
    const errorMessage = data?.message || data?.error || "Failed to create commission expenses";
    throw new Error(errorMessage);
  }
  
  if (!data || typeof data !== "object" || !data.data) {
    throw new Error("Invalid response from commission expenses API");
  }
  
  return data.data;
};

// --- Fetch Expense Table ---
export const fetchExpenseTable = async (
  params: FetchExpenseTableParams = {}
): Promise<{ count: number; results: Expense[] }> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.page_size)
    searchParams.set("page_size", params.page_size.toString());
  const response = await fetch(
    `${API_BASE_URL}/finance/expenses/?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch expenses");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from expense table API");
  // Validate each result with Zod
  const results = Array.isArray(data.data.results)
    ? data.data.results.map((item: any) => ExpenseSchema.parse(item))
    : [];
  return { count: data.data.count, results };
};

// --- Create Expense ---
export const createExpense = async (
  payload: ExpenseCreate
): Promise<Expense> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const formData = new FormData();
  formData.set("location_node_id", payload.location_node_id);
  formData.set("currency", payload.currency);
  formData.set("service_id", payload.service_id);
  formData.set("vendor_id", payload.vendor_id);
  formData.set("amount", payload.amount.toString());
  formData.set("tax_amount", payload.tax_amount.toString());
  formData.set("total_amount", payload.total_amount.toString());
  formData.set("invoice_date", payload.invoice_date);
  formData.set("due_date", payload.due_date);
  formData.set("payment_method", payload.payment_method);
  if (payload.description) formData.set("description", payload.description);
  if (payload.notes) formData.set("notes", payload.notes);
  if (payload.attachment) formData.set("attachment", payload.attachment as any);

  const response = await fetch(`${API_BASE_URL}/finance/expenses/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create invoice");
  }
  const data = await response.json();
  return data;
};

// --- Delete Expense ---
export const deleteExpense = async (id: string | number): Promise<boolean> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/finance/expenses/${id}/delete`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || "Failed to delete expense");
  }
  return true;
};

// --- Approve Expense ---
export const approveExpense = async (expenseId: string): Promise<{ error: boolean; message: string; data?: any }> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  if (!expenseId) {
    return { error: true, message: "Expense ID is required" };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/finance/expenses/${expenseId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        error: true, 
        message: data.message || "Failed to approve expense" 
      };
    }

    return { 
      error: false, 
      message: data.message || "Expense approved successfully",
      data: data.data 
    };
  } catch (error: any) {
    return { 
      error: true, 
      message: error?.message || "Failed to approve expense" 
    };
  }
};

// --- Reject Expense ---
export const rejectExpense = async (expenseId: string, reason?: string): Promise<{ error: boolean; message: string; data?: any }> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  if (!expenseId) {
    return { error: true, message: "Expense ID is required" };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/finance/expenses/${expenseId}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        error: true, 
        message: data.message || "Failed to reject expense" 
      };
    }

    return { 
      error: false, 
      message: data.message || "Expense rejected successfully",
      data: data.data 
    };
  } catch (error: any) {
    return { 
      error: true, 
      message: error?.message || "Failed to reject expense" 
    };
  }
};

// --- Pay Expense ---
export const payExpense = async (
  id: string | number,
  payment_method: string = "cash",
  account?: string,
  tab?: string,
  amount?: number,
  reference?: string,
  paybill_number?: string,
  paybill_option?: string
): Promise<{ error: boolean; message: string; data?: any }> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const body: any = { payment_method };
  if (account) body.account = account;
  if (tab) body.tab = tab;
  if (amount) body.amount = amount;
  if (reference) body.reference = reference;
  if (paybill_number) body.paybill_number = paybill_number;
  if (paybill_option) body.paybill_option = paybill_option;
  const response = await fetch(`${API_BASE_URL}/finance/expenses/${id}/pay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  const errorMessage =
    data?.detail || data?.message || "Failed to mark expense as paid";
  if (!response.ok) {
    return {
      error: true,
      message: errorMessage,
      data: null,
    };
  }
  return {
    error: false,
    message: data?.message || "Expense marked as paid",
    data,
  };
};
