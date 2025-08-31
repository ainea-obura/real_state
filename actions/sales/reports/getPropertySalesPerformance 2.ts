"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Property Sales Performance Report
export interface PropertySalesPerformanceRequest {
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  project_id?: string; // UUID
}

export interface MonthlySalesData {
  month: string;
  unitsSold: number;
  revenue: number;
  averagePrice: number;
}

export interface SalesRecord {
  id: string;
  propertyName: string;
  salePrice: number;
  soldDate: string;
  timeToClose: number;
  project: string;
}

export interface PropertySalesPerformanceKPIs {
  unitsSold: number;
  averageSalePrice: number;
  totalRevenue: number;
  averageTimeToClose: number;
}

export interface PropertySalesPerformanceResponse {
  kpis: PropertySalesPerformanceKPIs;
  monthlyData: MonthlySalesData[];
  salesRecords: SalesRecord[];
}

export interface GetPropertySalesPerformanceResponse {
  success: boolean;
  message: string;
  data?: PropertySalesPerformanceResponse;
}

export interface GetPropertySalesPerformanceError {
  success: false;
  message: string;
  details?: Record<string, string[] | string>;
}

/**
 * Get Property Sales Performance report data
 * @param requestData - The request parameters for filtering
 * @returns Promise with report data or error
 */
export async function getPropertySalesPerformance(
  requestData: PropertySalesPerformanceRequest
): Promise<
  GetPropertySalesPerformanceResponse | GetPropertySalesPerformanceError
> {
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
    const url = `${API_BASE_URL}/sales/reports/property-sales-performance/${
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
    console.log("=== PROPERTY SALES PERFORMANCE API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("===============================================");

    return {
      success: true,
      message: "Report data retrieved successfully",
      data: data,
    };
  } catch (error) {
    console.error("Error getting property sales performance report:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
