"use server";

import { getServerSession } from 'next-auth';

import {
    AlertsResponse, AlertsResponseSchema, DashboardApiResponse, DashboardApiResponseSchema,
    FinanceSummaryResponse, FinanceSummaryResponseSchema, QuickActionsResponse,
    QuickActionsResponseSchema, RecentTransactionsResponse, RecentTransactionsResponseSchema,
} from '@/features/dashboard/schema/dashboard';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export const fetchDashboardStats = async (): Promise<DashboardApiResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/dashboard/stats/`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  const data = await response.json();
  // Validate shape at runtime
  const parsed = DashboardApiResponseSchema.parse(data);
  return parsed;
};

export const fetchFinanceSummary =
  async (): Promise<FinanceSummaryResponse> => {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    const response = await fetch(`${API_BASE_URL}/dashboard/finance-summary/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch finance summary");
    }

    const data = await response.json();
    // Validate shape at runtime
    const parsed = FinanceSummaryResponseSchema.parse(data);
    return parsed;
  };

export const fetchRecentTransactions =
  async (): Promise<RecentTransactionsResponse> => {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    const response = await fetch(
      `${API_BASE_URL}/dashboard/recent-transactions/`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recent transactions");
    }

    const data = await response.json();
    // Validate shape at runtime
    const parsed = RecentTransactionsResponseSchema.parse(data);
    return parsed;
  };

export const fetchQuickActions = async (): Promise<QuickActionsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/dashboard/quick-actions/`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch quick actions");
  }

  const data = await response.json();
  // Validate shape at runtime
  const parsed = QuickActionsResponseSchema.parse(data);
  return parsed;
};

export const fetchAlerts = async (): Promise<AlertsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/dashboard/alerts/`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  const data = await response.json();
  // Validate shape at runtime
  const parsed = AlertsResponseSchema.parse(data);
  return parsed;
};
