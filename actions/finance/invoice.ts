"use server";

import { getServerSession } from "next-auth";

import {
  FetchInvoiceTableParams,
  InvoiceStats,
  InvoiceStatsSchema,
  InvoiceTableResponse,
  RecipientSearchResponse,
  RecipientSearchResponseSchema,
  TenantUnitItemsResponse,
  UpdateInvoicePayload,
} from "@/features/finance/scehmas/invoice";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// --- Action: searchRecipients ---
export interface SearchRecipientsParams {
  type: string; // required: "tenant" | "owner"
  q?: string;
  email?: string;
  phone?: string;
}

export const searchRecipients = async (
  params: SearchRecipientsParams
): Promise<RecipientSearchResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!params.type) {
    throw new Error("'type' parameter is required");
  }
  const searchParams = new URLSearchParams();
  searchParams.set("type", params.type);
  if (params.q) searchParams.set("q", params.q);
  if (params.email) searchParams.set("email", params.email);
  if (params.phone) searchParams.set("phone", params.phone);

  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/search?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to search recipients");
  const data = await response.json();
  const parsed = RecipientSearchResponseSchema.parse(data);
  return parsed.data;
};

export const fetchTenantUnitItems = async (
  tenantId: string,
  with_items: boolean = true
): Promise<TenantUnitItemsResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!tenantId) throw new Error("'tenantId' is required");
  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/tenant-unit-items?tenant_id=${tenantId}&with_items=${with_items}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch tenant unit items");
  const data = await response.json();
  if (typeof data !== "object" || !data.data)
    throw new Error("Invalid response from tenant unit items API");
  return data.data;
};

export const fetchOwnerNodeItems = async (
  ownerId: string
): Promise<TenantUnitItemsResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!ownerId) throw new Error("'ownerId' is required");
  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/owner-node-items?owner_id=${ownerId}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch owner node items");
  const data = await response.json();
  if (typeof data !== "object" || !data.data)
    throw new Error("Invalid response from owner node items API");
  return data.data;
};

export const createInvoice = async (payload: any): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/create-invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to create invoice",
      };
    }
    return data;
  } catch (error: any) {
    return {
      error: true,
      message: error?.message || "Failed to create invoice",
    };
  }
};

export const updateInvoice = async (
  invoiceId: string,
  payload: UpdateInvoicePayload
): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!invoiceId) return { error: true, message: "'invoiceId' is required" };
    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/${invoiceId}/update`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to update invoice",
      };
    }
    return data;
  } catch (error: any) {
    return {
      error: true,
      message: error?.message || "Failed to update invoice",
    };
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!invoiceId) return { error: true, message: "'invoiceId' is required" };
    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/${invoiceId}/delete`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to delete invoice",
      };
    }
    return data;
  } catch (error: any) {
    return {
      error: true,
      message: error?.message || "Failed to delete invoice",
    };
  }
};

export const cancelInvoice = async (invoiceId: string): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!invoiceId) return { error: true, message: "'invoiceId' is required" };
    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/${invoiceId}/cancel`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to cancel invoice",
      };
    }
    return data;
  } catch (error: any) {
    return {
      error: true,
      message: error?.message || "Failed to cancel invoice",
    };
  }
};

export const sendInvoice = async (
  invoiceId: string,
  customMessage?: string
): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!invoiceId) return { error: true, message: "'invoiceId' is required" };

    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/${invoiceId}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customMessage: customMessage || "",
        }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: true, message: data.message || "Failed to send invoice" };
    }
    return data;
  } catch (error: any) {
    return { error: true, message: error?.message || "Failed to send invoice" };
  }
};

export const createCreditNote = async (data: {
  invoice_id: string;
  amount: number;
  reason?: string;
  description?: string;
}) => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/finance/invoices/create-credit-note`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create credit note");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating credit note:", error);
    throw error;
  }
};

// --- Action: downloadInvoicePDF ---
export interface DownloadPDFResponse {
  error: boolean;
  message?: string;
  data?: {
    downloadUrl: string;
    filename: string;
  };
}

export const downloadInvoicePDF = async (
  invoiceId: string
): Promise<DownloadPDFResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!invoiceId) return { error: true, message: "'invoiceId' is required" };

    // Use Next.js proxy endpoint to avoid mixed content issues
    const downloadUrl = `/api/download-pdf?invoiceId=${invoiceId}`;

    return {
      error: false,
      data: {
        downloadUrl,
        filename: `invoice_${invoiceId}.pdf`,
      },
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to download PDF";
    return { error: true, message: errorMessage };
  }
};

export interface FetchInvoiceStatsParams {
  from?: string; // "YYYY-MM-DD"
  to?: string; // "YYYY-MM-DD"
}

export const fetchInvoiceStats = async (
  params: FetchInvoiceStatsParams = {}
): Promise<InvoiceStats> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/stats-summary?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch invoice stats");
  const data = await response.json();
  return InvoiceStatsSchema.parse(data);
};

export const fetchInvoiceTable = async (
  params: FetchInvoiceTableParams = {}
): Promise<InvoiceTableResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize)
    searchParams.set("page_size", params.pageSize.toString());

  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/list?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch invoice table");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from invoice table API");
  return data.data;
};

// --- Action: fetchTenantInvoices ---
export interface FetchTenantInvoicesParams {
  user_id: string;
  page?: number;
  page_size?: number;
}

export interface TenantInvoiceResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

export const fetchTenantInvoices = async (
  params: FetchTenantInvoicesParams
): Promise<TenantInvoiceResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!params.user_id) {
    throw new Error("'user_id' parameter is required");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("user_id", params.user_id);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.page_size) searchParams.set("page_size", params.page_size.toString());

  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/tenant-invoices?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  if (!response.ok) throw new Error("Failed to fetch tenant invoices");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from tenant invoices API");
  return data.data;
};

// --- Action: fetchInvoiceDetail ---
export interface InvoiceDetailResponse {
  invoice: {
    id: string;
    invoice_number: string;
    description: string;
    total_amount: number;
    balance: number;
    status: string;
    issue_date: string;
    due_date: string;
    currency: string;
    property_name: string;
    property_address: string;
  };
  payments: Array<{
    id: string;
    transaction_id: string;
    amount: number;
    payment_method: string;
    status: string;
    payment_date: string;
    currency: string;
    notes: string;
  }>;
}

export const fetchInvoiceDetail = async (
  invoiceId: string
): Promise<InvoiceDetailResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!invoiceId) {
    throw new Error("'invoiceId' parameter is required");
  }

  const response = await fetch(
    `${API_BASE_URL}/finance/invoices/${invoiceId}/detail`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  if (!response.ok) throw new Error("Failed to fetch invoice detail");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from invoice detail API");
  return data.data;
};
