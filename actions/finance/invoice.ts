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

export interface BulkInvoiceUploadData {
  client_type: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  invoice_type: string;
  total_amount: number;
  balance?: number;
  paid_date?: string;
  notes?: string;
  house_no?: string;
  project_id?: string;
  invoice_subject?: string;
}

export interface BulkInvoiceUploadResponse {
  error: boolean;
  message?: string;
  data?: {
    count: number;
    results: Array<{
      row: number;
      success: boolean;
      data?: any;
      error?: string;
    }>;
  };
}

export const bulkUploadInvoices = async (
  data: BulkInvoiceUploadData[]
): Promise<BulkInvoiceUploadResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return {
        error: true,
        message: "Authentication required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    console.log('🚀 Frontend: Starting bulk invoice upload');
    console.log('🚀 Frontend: Data to send:', data);
    console.log('🚀 Frontend: Data length:', data.length);
    console.log('🚀 Frontend: API_BASE_URL:', API_BASE_URL);
    console.log('🚀 Frontend: Token exists:', !!token);
    
    const apiUrl = `${API_BASE_URL}/payments/invoices/bulk-upload`;
    console.log('🚀 Frontend: Full API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = "Failed to bulk upload invoices";
      console.log('❌ Frontend: Response not OK, status:', response.status);
      console.log('❌ Frontend: Response statusText:', response.statusText);
      
      try {
        const errorData = await response.json();
        console.log('❌ Frontend: Error data:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.log('❌ Frontend: Failed to parse error response:', parseError);
        errorMessage = response.statusText || errorMessage;
      }

      return {
        error: true,
        message: errorMessage,
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const responseData = await response.json();
    console.log('✅ Frontend: Success response:', responseData);
    return responseData;
  } catch (error) {
    console.error('Bulk invoice upload error:', error);
    return {
      error: true,
      message: "Failed to upload invoices",
      data: {
        count: 0,
        results: [],
      },
    };
  }
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
