"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Feature Cards Data
export interface FeatureCardsData {
  total_listings: number;
  sold_units: number;
  total_revenue: number;
  outstanding_payments: number;
}

export interface FeatureCardsResponse {
  success: boolean;
  message: string;
  data: FeatureCardsData;
}

export interface FeatureCardsError {
  success: false;
  message: string;
  error: string;
}

/**
 * Fetch feature cards data for the sales dashboard
 * Returns total listings, sold units, total revenue, and outstanding payments
 */
export async function fetchFeatureCards(
  startDate?: string,
  endDate?: string,
  projectId?: string
): Promise<FeatureCardsResponse | FeatureCardsError> {
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
    if (startDate) queryParams.append("from_date", startDate);
    if (endDate) queryParams.append("to_date", endDate);
    if (projectId) queryParams.append("project_id", projectId);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/sales/dashboard/feature-cards-new/${queryString ? `?${queryString}` : ""}`;

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
      console.error("Feature cards API error response:", errorData);

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
    console.log("=== FEATURE CARDS API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=================================");

    return data;
  } catch (error) {
    console.error("Error fetching feature cards data:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
