"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Dashboard Data
export interface FeatureCardsData {
  total_listings: number;
  sold_units: number;
  total_revenue: number;
  outstanding_payments: number;
}

export interface FinanceSeriesData {
  month: string;
  expected: number;
  collected: number;
}

export interface SalespersonData {
  name: string;
  assigned: number;
  outstanding: number;
  overdueFollowUps: number;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    feature_cards: FeatureCardsData;
    finance_collection: {
      series: FinanceSeriesData[];
    };
    salespeople: SalespersonData[];
  };
}

export interface DashboardError {
  success: false;
  message: string;
  error: string;
}

/**
 * Fetch complete dashboard data for the sales dashboard
 * Provides unit status, revenue metrics, monthly finance data, and sales team performance
 */
export async function fetchDashboard(
  startDate?: string,
  endDate?: string
): Promise<DashboardResponse | DashboardError> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
        error: "Please log in to continue",
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("start_date", startDate);
    if (endDate) queryParams.append("end_date", endDate);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/sales/dashboard/${queryString ? `?${queryString}` : ""}`;

    // Make API request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error response:", errorData);

      return {
        success: false,
        message: "Backend request failed",
        error:
          errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log("=== DASHBOARD API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=============================");

    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
