"use server";

import { getServerSession } from 'next-auth';

import {
    LedgerResponseSchema, RentRollListResponseSchema, RentRollSummaryResponseSchema,
} from '@/features/finance/rendandInvoices/rent-roll/schema';
import { authOptions } from '@/lib/auth';

import type {
  RentRollListResponse,
  RentRollSummaryResponse,
  LedgerResponse,
} from "@/features/finance/rendandInvoices/rent-roll/schema";
const API_BASE_URL = process.env.API_BASE_URL;

// Types for query parameters
export interface RentRollListParams {
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  search?: string;
  project_id?: string;
}

export interface RentRollSummaryParams {
  date_from?: string;
  date_to?: string;
}

/**
 * Fetch rent roll list data with optional filtering and pagination
 */
export const fetchRentRollList = async (
  params: RentRollListParams = {}
): Promise<RentRollListResponse["data"]> => {
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
  if (params.project_id) queryParams.append("project_id", params.project_id);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/finance/rent-roll/${
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
      `Failed to fetch rent roll list: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const parsed = RentRollListResponseSchema.parse(data);

  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch rent roll list");
  }

  return parsed.data;
};

/**
 * Fetch rent roll summary data with optional date filtering
 */
export const fetchRentRollSummary = async (
  params: RentRollSummaryParams = {}
): Promise<RentRollSummaryResponse["data"]> => {
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
  const url = `${API_BASE_URL}/finance/rent-roll/summary/${
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
      `Failed to fetch rent roll summary: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const parsed = RentRollSummaryResponseSchema.parse(data);

  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch rent roll summary");
  }

  return parsed.data;
};

/**
 * Fetch ledger data for a specific unit
 */
export const fetchUnitLedger = async (
  unitId: string
): Promise<LedgerResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Authentication required");
  }

  const url = `${API_BASE_URL}/finance/rent-roll/${unitId}/ledger/`;

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
      `Failed to fetch unit ledger: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const parsed = LedgerResponseSchema.parse(data);

  if (parsed.error) {
    throw new Error("Failed to fetch unit ledger");
  }

  return parsed.data;
};
