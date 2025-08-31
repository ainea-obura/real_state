"use server";

import { getServerSession } from 'next-auth';

import {
    CreatePaymentPayload, CreatePaymentSchema, PaymentStatsResponse, PaymentStatsResponseSchema,
    PaymentTableResponse, PaymentTableResponseSchema, UnpaidInvoicesResponse,
    UnpaidInvoicesResponseSchema,
} from '@/features/finance/scehmas/payment';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export const fetchUnpaidInvoices = async (
  userId: string,
  recipientType: "tenant" | "owner"
): Promise<UnpaidInvoicesResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!userId) throw new Error("'userId' is required");
  if (!recipientType) throw new Error("'recipientType' is required");
  const response = await fetch(
    `${API_BASE_URL}/finance/payments/unpaid-invoices?user_id=${userId}&recipient_type=${recipientType}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch unpaid invoices");
  const data = await response.json();
  const parsed = UnpaidInvoicesResponseSchema.parse(data);
  return parsed.data;
};

export const recordPayment = async (
  payload: CreatePaymentPayload
): Promise<{ error: boolean; message: string }> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  // Validate payload before sending
  CreatePaymentSchema.parse(payload);
  const response = await fetch(
    `${API_BASE_URL}/finance/payments/record-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to record payment",
    };
  }
  return data;
};

export const fetchPaymentStats = async ({
  from,
  to,
}: { from?: string; to?: string } = {}): Promise<
  PaymentStatsResponse["data"]
> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const url = `${API_BASE_URL}/finance/payments/stats${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  const parsed = PaymentStatsResponseSchema.parse(data);
  return parsed.data;
};

export const fetchPaymentTable = async ({
  from,
  to,
  page = 1,
  pageSize = 10,
}: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaymentTableResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (page) params.append("page", String(page));
  if (pageSize) params.append("page_size", String(pageSize));
  const url = `${API_BASE_URL}/finance/payments/table${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  const parsed = PaymentTableResponseSchema.parse(data);
  return parsed.data;
};

export const verifyPayment = async (
  payload: {
    invoice_id: string;
    phone_number: string;
  }
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/finance/payments/verify-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to verify payment",
    };
  }
  return data;
};
