"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Property Assignment
export interface PropertyBuyerPair {
  property_node_id: string;
  buyer_id: string;
  ownership_percentage: number;
}

export interface CreatePropertySaleParams {
  // Property and buyer data
  property_buyer_pairs: PropertyBuyerPair[];

  // Total amounts for backend calculation
  total_property_price: number;
  total_down_payment: number;

  // Agent and commission data
  agent_id?: string | null;
  agent_commission_type?: "%" | "fixed";
  agent_commission_rate?: number | null;
  agent_commission_amount?: number | null;

  // Payment plan data
  payment_plan_start_date: string;
  payment_plan_frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  payment_plan_installment_count: number;
  payment_plan_template_id?: string | null;

  // Additional metadata
  total_buyers: number;
  total_units: number;
  total_houses: number;
  co_ownership_percentages: Record<string, number>;
  total_percentage: number;

  // Form validation status
  is_valid: boolean;
}

export interface PropertySaleResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    total_properties: number;
    total_buyers: number;
    total_sale_value: number;
    status: string;
    created_at: string;
    sale_items: Array<{
      property_name: string;
      buyer_name: string;
      sale_price: number;
      down_payment: number;
      ownership_percentage: number;
    }>;
    payment_plans: Array<{
      owner_name: string;
      property_name: string;
      ownership_percentage: number;
      sale_price: number;
      down_payment: number;
      installment_count: number;
      frequency: string;
      installment_amount: number;
      is_custom: boolean;
      payment_schedule: Array<{
        payment_number: number;
        due_date: string;
        amount: number;
        status: string;
        paid_date?: string;
        paid_amount?: number;
      }>;
    }>;
  };
}

export interface PropertySaleError {
  success: false;
  message: string;
  error: string;
}

/**
 * Create a new property sale with payment plans and commissions
 * This handles the complete sales flow from the frontend wizard
 */
export async function createPropertySale(
  params: CreatePropertySaleParams
): Promise<PropertySaleResponse | PropertySaleError> {
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

    // Validate required fields
    if (
      !params.property_buyer_pairs ||
      params.property_buyer_pairs.length === 0
    ) {
      return {
        success: false,
        message: "Validation failed",
        error: "At least one property-buyer pair must be provided",
      };
    }

    if (!params.total_property_price || params.total_property_price <= 0) {
      return {
        success: false,
        message: "Validation failed",
        error: "Total property price must be greater than 0",
      };
    }

    if (!params.payment_plan_start_date) {
      return {
        success: false,
        message: "Validation failed",
        error: "Payment plan start date is required",
      };
    }

    if (!params.payment_plan_frequency) {
      return {
        success: false,
        message: "Validation failed",
        error: "Payment plan frequency is required",
      };
    }

    if (
      !params.payment_plan_installment_count ||
      params.payment_plan_installment_count <= 0
    ) {
      return {
        success: false,
        message: "Validation failed",
        error: "Payment plan installment count must be greater than 0",
      };
    }

    // Validate ownership percentages
    if (params.total_percentage !== 100) {
      return {
        success: false,
        message: "Validation failed",
        error: `Total ownership percentage must equal 100%, got ${params.total_percentage}%`,
      };
    }

    // Prepare the request payload (only send what the backend needs)
    const requestPayload = {
      property_buyer_pairs: params.property_buyer_pairs,
      total_property_price: params.total_property_price,
      total_down_payment: params.total_down_payment,
      agent_id: params.agent_id,
      agent_commission_type: params.agent_commission_type,
      agent_commission_rate: params.agent_commission_rate,
      agent_commission_amount: params.agent_commission_amount,
      payment_plan_start_date: params.payment_plan_start_date,
      payment_plan_frequency: params.payment_plan_frequency,
      payment_plan_installment_count: params.payment_plan_installment_count,
      payment_plan_template_id: params.payment_plan_template_id,
    };

    console.log("=== SENDING TO BACKEND ===");
    console.log("API URL:", `${API_BASE_URL}/sales/property-sales/create/`);
    console.log("Payload:", JSON.stringify(requestPayload, null, 2));
    console.log("==========================");

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/property-sales/create/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      }
    );

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
    console.log("=== BACKEND SUCCESS RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("================================");

    return data;
  } catch (error) {
    console.error("Error creating property sale:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get property sale details by ID
 */
export async function getPropertySale(
  saleId: string
): Promise<PropertySaleResponse | PropertySaleError> {
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

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/property-sales/${saleId}/`,
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
        message: "Failed to fetch property sale",
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
    console.error("Error fetching property sale:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * List all property sales (for admin/dashboard use)
 */
export async function listPropertySales(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  agent_id?: string;
}): Promise<
  | {
      success: boolean;
      message: string;
      data: {
        count: number;
        results: Array<{
          id: string;
          sale_date: string;
          status: string;
          agent?: {
            id: string;
            name: string;
            email: string;
          };
          total_sale_value: number;
          total_properties: number;
          total_buyers: number;
          created_at: string;
        }>;
      };
    }
  | {
      success: false;
      message: string;
      error: string;
    }
> {
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

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.agent_id) queryParams.append("agent_id", params.agent_id);

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/property-sales/?${queryParams.toString()}`,
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
        message: "Failed to list property sales",
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
    console.error("Error listing property sales:", error);

    return {
      success: false,
      message: "Unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
