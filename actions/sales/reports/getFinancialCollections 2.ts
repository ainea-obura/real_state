"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Financial Collections Report
export interface FinancialCollectionsRequest {
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  project_id?: string; // UUID
}

export interface MonthlyFinancialData {
  month: string;
  expected: number;
  collected: number;
  collection_rate: number;
}

export interface FinancialCollectionsKPIs {
  expectedPeriod: number;
  collectedPeriod: number;
  collectionRate: number;
  overdueAmount: number;
}

export interface FinancialCollectionsData {
  kpis: FinancialCollectionsKPIs;
  monthlyData: MonthlyFinancialData[];
}

export interface FinancialCollectionsResponse {
  success: boolean;
  message: string;
  data?: FinancialCollectionsData;
}

export interface GetFinancialCollectionsError {
  success: false;
  message: string;
  details?: Record<string, string[] | string>;
}

/**
 * Get Financial Collections Summary report data
 * @param requestData - The request parameters for filtering
 * @returns Promise with report data or error
 */
export async function getFinancialCollections(
  requestData: FinancialCollectionsRequest
): Promise<FinancialCollectionsResponse | GetFinancialCollectionsError> {
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
    const url = `${API_BASE_URL}/sales/reports/financial-collections/${
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
    console.log("=== FINANCIAL COLLECTIONS API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("============================================");

    return {
      success: true,
      message: "Report data retrieved successfully",
      data: data.data, // Return the nested data directly
    };
  } catch (error) {
    console.error("Error getting financial collections report:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
