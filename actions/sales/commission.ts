import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface CommissionData {
  commission_id: string;
  sale_id: string;
  agent_name: string;
  agent_email: string;
  total_sale_value: number;
  total_down_payment: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  sale_date: string;
  paid_date?: string;
  paid_amount: number;
  notes: string;
  properties: Array<{
    name: string;
    sale_price: number;
    down_payment: number;
  }>;
}

export interface CommissionSummary {
  total_commissions: number;
  total_pending_amount: number;
  total_paid_amount: number;
  pending_count: number;
  paid_count: number;
}

export interface CommissionResponse {
  error: boolean;
  message: string;
  data: {
    commissions: CommissionData[];
    summary: CommissionSummary;
  };
}

export interface DownPaymentData {
  sale_id: string;
  property_name: string;
  sale_price: number;
  expected_down_payment_20_percent: number;
  actual_down_payment: number;
  down_payment_percentage: number;
  agent_name: string;
  sale_status: string;
  sale_date: string;
  is_down_payment_collected: boolean;
  down_payment_variance: number;
}

export interface DownPaymentResponse {
  error: boolean;
  message: string;
  data: {
    down_payments: DownPaymentData[];
    summary: {
      total_expected_down_payments: number;
      total_collected_down_payments: number;
      collection_rate: number;
      total_sales: number;
    };
  };
}

export const fetchCommissions = async (filters?: {
  status?: string;
  agent_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<CommissionResponse> => {
  const session = await getSession();
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.agent_id) params.append('agent_id', filters.agent_id);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const url = `${API_BASE_URL}/sales/commission/management/${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch commissions: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to fetch commissions");
  }

  return data;
};

export const fetchDownPaymentTracking = async (): Promise<DownPaymentResponse> => {
  const session = await getSession();
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/sales/commission/down-payment-tracking/`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch down payment tracking: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to fetch down payment tracking");
  }

  return data;
};

export const calculateCommission = async (saleId: string): Promise<any> => {
  const session = await getSession();
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/sales/commission/calculate/`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sale_id: saleId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to calculate commission: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to calculate commission");
  }

  return data;
};

export const updateCommissionStatus = async (
  commissionId: string, 
  status: string, 
  paidAmount?: number, 
  notes?: string
): Promise<any> => {
  const session = await getSession();
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/sales/commission/management/`;
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      commission_id: commissionId,
      status,
      paid_amount: paidAmount,
      notes,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update commission: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to update commission");
  }

  return data;
};
