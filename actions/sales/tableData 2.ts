"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Table Data
export interface InstallmentPlan {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  nextDueDate: string;
  nextDueAmount: number;
  totalInstallments: number;
  completedInstallments: number;
}

export interface PaymentHistory {
  lastPaymentDate: string;
  lastPaymentAmount: number;
  missedPayments: number;
}

export interface OwnerProperty {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPhoto?: string | null;
  projectName: string;
  propertyName: string;
  ownershipPercentage: number;
  coOwners?: string[];
  assignedSalesPerson: {
    name: string;
    employee_id: string;
    email: string;
    phone: string;
    is_active: boolean;
    is_available: boolean;
  };
  status: "on-track" | "behind" | "at-risk" | "completed";
  installmentPlan: InstallmentPlan;
  lastActivity: string;
  paymentHistory: PaymentHistory;
}

export interface TableDataResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: OwnerProperty[];
  };
}

export interface TableDataError {
  success: false;
  message: string;
  error: string;
}

export interface TableDataParams {
  page?: number;
  page_size?: number;
  search?: string;
  owner?: string;
  status?: string;
  project?: string;
}

/**
 * Fetch owner property table data for the sales dashboard
 * Supports pagination and filtering
 */
export async function fetchTableData(
  params: TableDataParams = {}
): Promise<TableDataResponse | TableDataError> {
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

    if (params.page) {
      queryParams.append("page", params.page.toString());
    }

    if (params.page_size) {
      queryParams.append("page_size", params.page_size.toString());
    }

    if (params.search) {
      queryParams.append("search", params.search);
    }

    if (params.status) {
      queryParams.append("status", params.status);
    }

    if (params.owner) {
      queryParams.append("owner", params.owner);
    }

    if (params.status) {
      queryParams.append("status", params.status);
    }

    if (params.project) {
      queryParams.append("project", params.project);
    }

    // Make API request
    const url = `${API_BASE_URL}/sales/dashboard/owner-properties/${
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

    return data;
  } catch (error) {
    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Fetch a single owner property by ID
 */
export async function fetchOwnerProperty(id: string): Promise<{
  success: boolean;
  data?: OwnerProperty;
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

    const response = await fetch(
      `${API_BASE_URL}/sales/dashboard/owner-properties/${id}/`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: "Failed to fetch owner property",
        error:
          errorData.message || errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
