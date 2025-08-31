"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Sales Team Performance Report
export interface SalesTeamPerformanceRequest {
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  project_id?: string; // UUID
}

export interface SalesPersonPerformance {
  id: string;
  name: string;
  employee_id: string;
  contracted: number;
  offers_sent: number;
  won: number;
  lost: number;
  conversion_percent: number;
  avg_deal_size: number;
  revenue: number;
}

export interface SalesTeamPerformanceKPIs {
  total_deals_closed: number;
  conversion_rate: number;
  avg_deal_size: number;
  pipeline_velocity: number;
}

export interface SalesTeamPerformanceData {
  kpis: SalesTeamPerformanceKPIs;
  salespeople: SalesPersonPerformance[];
}

export interface SalesTeamPerformanceResponse {
  success: boolean;
  message: string;
  data?: SalesTeamPerformanceData;
}

export interface GetSalesTeamPerformanceError {
  success: false;
  message: string;
  details?: Record<string, string[] | string>;
}

/**
 * Get Sales Team Performance report data
 * @param requestData - The request parameters for filtering
 * @returns Promise with report data or error
 */
export async function getSalesTeamPerformance(
  requestData: SalesTeamPerformanceRequest
): Promise<SalesTeamPerformanceResponse | GetSalesTeamPerformanceError> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (requestData.from_date) {
      queryParams.append("from_date", requestData.from_date);
    }
    if (requestData.to_date) {
      queryParams.append("to_date", requestData.to_date);
    }
    if (requestData.project_id) {
      queryParams.append("project_id", requestData.project_id);
    }

    // Make API request
    const url = `${API_BASE_URL}/sales/reports/sales-team-performance/${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
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
        message:
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log("=== SALES TEAM PERFORMANCE API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("===============================================");

    return {
      success: true,
      message: "Report data retrieved successfully",
      data: data.data, // Return the nested data directly
    };
  } catch (error) {
    console.error("Error getting sales team performance report:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
