"use server";

import { getServerSession } from 'next-auth';

import {
    TransactionsResponse, TransactionsResponseSchema,
} from '@/features/finance/transactions/schema';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export interface TransactionsListParams {
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  search?: string;
}

/**
 * Fetch transactions list data with optional filtering and pagination
 */
export const fetchTransactionsList = async (
  params: TransactionsListParams = {}
): Promise<TransactionsResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  // Build query string from params
  const queryParams = new URLSearchParams();

  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/finance/transactions/${
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
      `Failed to fetch transactions list: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  // Validate with Zod schema
  const parsed = TransactionsResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error("Failed to fetch transactions list");
  }
  return parsed.data;
};
