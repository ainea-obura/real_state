"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Installments Table Data
export interface InstallmentTableItem {
  id: string; // This is now sale_item.id (consistent across all endpoints)
  payment_number: number;
  ownerId: string; // This is now also sale_item.id (consistent)
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  projectName: string;
  propertyName: string;
  ownershipPercentage: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paidDate?: string | null;
  paidAmount?: number | null;
  lateFee: number;
  daysOverdue: number;
  notes?: string | null;
}

export interface InstallmentsTableResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: InstallmentTableItem[];
  };
}

export interface InstallmentsTableError {
  success: false;
  message: string;
  error: string;
}

export interface InstallmentsTableParams {
  sale_item_id: string; // Changed from sale_id to sale_item_id to match backend
  page?: number;
  page_size?: number;
  status?: "pending" | "paid" | "overdue" | "cancelled";
  owner?: string;
  property?: string;
}

/**
 * Fetch installments table data for a specific property sale
 * Provides detailed installment information with pagination and filtering
 *
 * IMPORTANT: Uses consistent ID structure:
 * - id: sale_item.id (PropertySaleItem ID)
 * - ownerId: sale_item.id (same as id for consistency)
 * This allows easy fetching of related models using the same ID
 */
export async function fetchInstallmentsTable(
  params: InstallmentsTableParams
): Promise<InstallmentsTableResponse | InstallmentsTableError> {
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

    // Validate required parameters
    if (!params.sale_item_id) {
      return {
        success: false,
        message: "Validation failed",
        error: "Sale item ID is required",
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) {
      queryParams.append("page", params.page.toString());
    }

    if (params.page_size) {
      queryParams.append("page_size", params.page_size.toString());
    }

    if (params.status) {
      queryParams.append("status", params.status);
    }

    if (params.owner) {
      queryParams.append("owner", params.owner);
    }

    if (params.property) {
      queryParams.append("property", params.property);
    }

    // Make API request
    const url = `${API_BASE_URL}/sales/installments/${params.sale_item_id}/${
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
        message: "Backend request failed",
        error:
          errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log("=== INSTALLMENTS TABLE API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=======================================");

    return data;
  } catch (error) {
    console.error("Error fetching installments table:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Fetch a single installment by ID
 */
export async function fetchInstallment(
  saleItemId: string, // Changed from saleId to saleItemId for clarity
  installmentId: string
): Promise<{
  success: boolean;
  data?: InstallmentTableItem;
  message?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
        error: "Please log in to continue",
      };
    }

    // First get all installments for the sale, then find the specific one
    const allInstallments = await fetchInstallmentsTable({
      sale_item_id: saleItemId,
      page_size: 1000, // Get all to find the specific installment
    });

    if (!allInstallments.success) {
      return {
        success: false,
        message: "Failed to fetch installments",
        error:
          "error" in allInstallments ? allInstallments.error : "Unknown error",
      };
    }

    // Find the specific installment
    const installment = allInstallments.data.results.find(
      (item) => item.id === installmentId
    );

    if (!installment) {
      return {
        success: false,
        message: "Installment not found",
        error: `Installment with ID ${installmentId} not found in sale item ${saleItemId}`,
      };
    }

    return {
      success: true,
      data: installment,
    };
  } catch (error) {
    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get installments summary for a sale item (counts by status)
 */
export async function getInstallmentsSummary(saleItemId: string): Promise<{
  success: boolean;
  data?: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    cancelled: number;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
  };
  message?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
        error: "Please log in to continue",
      };
    }

    // Get installments data with pagination to get the total count
    const installmentsResponse = await fetchInstallmentsTable({
      sale_item_id: saleItemId,
      page: 1,
      page_size: 10, // Small page size, we only need the count
    });

    if (!installmentsResponse.success) {
      return {
        success: false,
        message: "Failed to fetch installments",
        error:
          "error" in installmentsResponse
            ? installmentsResponse.error
            : "Unknown error",
      };
    }

    // Get the total count from the response
    const total_count = installmentsResponse.data.count;

    // Now get all installments for detailed summary calculation
    const allInstallments = await fetchInstallmentsTable({
      sale_item_id: saleItemId,
      page: 1,
      page_size: total_count, // Use the actual total count
    });

    if (!allInstallments.success) {
      return {
        success: false,
        message: "Failed to fetch all installments",
        error:
          "error" in allInstallments ? allInstallments.error : "Unknown error",
      };
    }

    const installments = allInstallments.data.results;

    // Calculate summary
    const summary = {
      total: total_count, // Use the actual total count from backend
      pending: installments.filter((item) => item.status === "pending").length,
      paid: installments.filter((item) => item.status === "paid").length,
      overdue: installments.filter((item) => item.status === "overdue").length,
      cancelled: installments.filter((item) => item.status === "cancelled")
        .length,
      total_amount: installments.reduce((sum, item) => sum + item.amount, 0),
      paid_amount: installments
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + (item.paidAmount || 0), 0),
      outstanding_amount: installments
        .filter(
          (item) => item.status === "pending" || item.status === "overdue"
        )
        .reduce((sum, item) => sum + item.amount, 0),
    };

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
