"use server";

import { getServerSession } from 'next-auth';

import {
    PenaltyListResponse, PenaltyListResponseSchema,
} from '@/features/finance/rendandInvoices/penalties/schema/list';
import {
    PenaltyStatsResponse, PenaltyStatsResponseSchema,
} from '@/features/finance/rendandInvoices/penalties/schema/stats';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for query parameters
export interface PenaltyStatsParams {
  date_from?: string; // YYYY-MM-DD format
  date_to?: string; // YYYY-MM-DD format
}

export interface PenaltyListParams {
  date_from?: string; // YYYY-MM-DD format
  date_to?: string; // YYYY-MM-DD format
}

// Types for create penalty
export interface CreatePenaltyData {
  tenant_id: string;
  property_tenant_id: string;
  penalty_type:
    | "late_payment"
    | "returned_payment"
    | "lease_violation"
    | "utility_overcharge"
    | "other";
  amount: number;
  currency: string;
  due_date: Date;
  notes?: string;
  tenant_notes?: string;
}

export interface CreatePenaltyResponse {
  error: boolean;
  message: string;
  data?: {
    id: string;
    tenant_id: string;
    property_tenant_id: string;
    penalty_type: string;
    amount: number;
    currency: string;
    due_date: string;
    notes?: string;
    tenant_notes?: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create a new penalty
 */
export const createPenalty = async (
  data: CreatePenaltyData
): Promise<CreatePenaltyResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/penalties/create/`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
      due_date: data.due_date.toISOString().split("T")[0], // Convert to YYYY-MM-DD format
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create penalty: ${response.status} - ${errorText}`
    );
  }

  const responseData = await response.json();
  return responseData;
};

export const updatePenalty = async (
  data: {
    penalty_type: string;
    amount: number;
    due_date: string;
    notes: string;
    tenant_notes: string;
  },
  penalty_id: string
): Promise<CreatePenaltyResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/penalties/${penalty_id}/update/`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      penalty_type: data.penalty_type,
      amount: data.amount,
      due_date: data.due_date,
      notes: data.notes,
      tenant_notes: data.tenant_notes,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create penalty: ${response.status} - ${errorText}`
    );
  }

  const responseData = await response.json();
  return responseData;
};

export const waivePenalty = async (
  data: {
    waived_reason: string;
  },
  penalty_id: string
): Promise<CreatePenaltyResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/penalties/${penalty_id}/waive/`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      waived_reason: data.waived_reason,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create penalty: ${response.status} - ${errorText}`
    );
  }

  const responseData = await response.json();
  return responseData;
};

export const deletePenalty = async (
  penalty_id: string
): Promise<CreatePenaltyResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/penalties/${penalty_id}/delete/`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create penalty: ${response.status} - ${errorText}`
    );
  }

  const responseData = await response.json();
  return responseData;
};
/**
 * Fetch penalty list data with optional date filtering
 */
export const fetchPenaltyList = async (
  params: PenaltyListParams = {}
): Promise<PenaltyListResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  // Build query string from params
  const queryParams = new URLSearchParams();

  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/penalties/list${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch penalty list: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const parsed = PenaltyListResponseSchema.parse(data);

  if (parsed.error) {
    throw new Error("Failed to fetch penalty list");
  }

  return parsed.data;
};

/**
 * Fetch penalty statistics with optional date filtering
 */
export const fetchPenaltyStats = async (
  params: PenaltyStatsParams = {}
): Promise<PenaltyStatsResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  // Build query string from params
  const queryParams = new URLSearchParams();

  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/penalties/stats${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch penalty stats: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const parsed = PenaltyStatsResponseSchema.parse(data);

  if (parsed.error) {
    throw new Error("Failed to fetch penalty stats");
  }

  return parsed.data;
};

// Types for penalty tenant search
interface PropertyInfo {
  property_tenant_id: string;
  unit: string;
  project_name: string;
  rent_amount: number;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
}

interface TenantSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_info: PropertyInfo[];
  outstanding_balance: number;
}

interface PenaltyTenantSearchResponse {
  error: boolean;
  data: {
    count: number;
    results: TenantSearchResult[];
  };
}

export const searchPenaltyTenants = async (
  query: string,
): Promise<PenaltyTenantSearchResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/penalties/search-tenants?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to search tenants for penalties");
  }

  const data = await response.json();
  return data;
};
