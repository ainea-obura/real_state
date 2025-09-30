"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export interface BulkTransactionUploadData {
  trans_id: string;
  msisdn: string;
  trans_amount: string;
  payment_method: string;
  trans_time: string;
  bill_ref_number: string;
  merchant_code?: string;
  business_short_code?: string;
  invoice_number?: string;
  third_party_trans_id?: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  transaction_type?: string;
  org_account_balance?: string;
  is_verified?: boolean;
}

export interface BulkTransactionUploadResponse {
  error: boolean;
  message: string;
  data?: {
    total_processed: number;
    success_count: number;
    error_count: number;
    results: Array<{
      row: number;
      success: boolean;
      error?: string;
      message?: string;
      data?: any;
    }>;
  };
}

export const bulkUploadTransactions = async (
  transactions: BulkTransactionUploadData[]
): Promise<BulkTransactionUploadResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(`${API_BASE_URL}/finance/payments/transactions/bulk-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactions }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload transactions: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to upload transactions");
  }

  return data;
};

