"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export interface SearchProjectsParams {
  q: string;
  page?: number;
  page_size?: number;
}

export interface SearchOwnersParams {
  q: string;
  type?: "owner" | "agent" | "staff";
  page?: number;
  page_size?: number;
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  node_type: string;
  property_type: string | null;
  project_detail: {
    city: string | null;
    area: string | null;
    project_code: string | null;
    address: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    description: string;
    project_type: string;
    management_fee: number;
  } | null;
  city_name: string | null;
  has_blocks: boolean;
  has_houses: boolean;
}

export interface OwnerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  avatar: string | null;
  type: string;
  account_type_display: string;
  city_name: string | null;
  address: string | null;
  is_verified: boolean;
  is_owner_verified: boolean;
  // Staff-specific fields
  position_name?: string | null;
  sales_person_data?: {
    employee_id: string;
    total_sales: number;
    total_collection_rate: number;
    total_commission_earned: number;
    commission_paid: number;
    commission_pending: number;
    is_available: boolean;
    is_active: boolean;
  } | null;
  assigned_projects_count?: number;
  availability_status?: {
    is_available: boolean;
    is_active: boolean;
    current_workload: number;
    max_workload: number;
  } | null;
  performance_metrics?: {
    rating: number;
    properties_sold: number;
    active_contracts: number;
    completion_rate: number;
    total_commission: number;
    pending_commission: number;
  } | null;
}

export interface ProjectSearchResponse {
  error: boolean;
  message: string;
  data: {
    count: number;
    results: ProjectSearchResult[];
  };
}

export interface AssignSalesPersonParams {
  salesItemId: string;
  staffId: string;
  commissionType: "percentage" | "fixed";
  commissionAmount: string;
  paymentSetting: "per_payment" | "per_project_completion";
  notes?: string;
}

export interface AssignSalesPersonResponse {
  success: boolean;
  message: string;
  data: {
    sale_id: string;
    sale_item_id: string;
    sales_person_id: string;
    sales_person_name: string;
    commission_type: string;
    commission_amount: string;
    payment_setting: string;
    notes: string;
    assigned_at: string;
  };
}

export interface RemoveSalesPersonResponse {
  success: boolean;
  message: string;
  data: {
    sale_id: string;
    sale_item_id: string;
    removed_sales_person_id: string;
    removed_sales_person_name: string;
    removed_at: string;
  };
}

export interface OwnerSearchResponse {
  error: boolean;
  message: string;
  data: {
    count: number;
    results: OwnerSearchResult[];
  };
}

export interface ProjectStructureResponse {
  error: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    node_type: string;
    property_type: string | null;
    project_detail: {
      city: string | null;
      area: string | null;
      project_code: string | null;
      address: string;
      start_date: string | null;
      end_date: string | null;
      status: string;
      description: string;
      project_type: string;
      management_fee: number;
    } | null;
    blocks: Array<{
      id: string;
      name: string;
      node_type: string;
      block_detail: {
        name: string;
        description: string;
      } | null;
      floors: Array<{
        id: string;
        name: string;
        node_type: string;
        floor_detail: {
          number: number;
          description: string;
        } | null;
        units: Array<{
          id: string;
          name: string;
          node_type: string;
          unit_detail: {
            identifier: string;
            size: string;
            unit_type: string | null;
            sale_price: number | null;
            rental_price: number | null;
            deposit: number | null;
            status: string;
            description: string;
            management_mode: string;
            management_status: string;
            service_charge: number | null;
          } | null;
        }>;
      }>;
    }>;
    houses: Array<{
      id: string;
      name: string;
      node_type: string;
      house_detail: {
        name: string;
        management_mode: string | null;
        service_charge: number | null;
      } | null;
    }>;
  };
}

export async function searchProjects(
  params: SearchProjectsParams = { q: "" }
): Promise<ProjectSearchResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.page_size)
      searchParams.set("page_size", params.page_size.toString());

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/projects/search/?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to search projects");
    }

    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Failed to search projects",
      data: { count: 0, results: [] },
    };
  }
}

export async function getProjectStructure(
  projectId: string,
  includeInactive: boolean = false
): Promise<ProjectStructureResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.set("include_inactive", "true");

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/projects/${projectId}/structure/?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get project structure");
    }

    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get project structure",
      data: {} as ProjectStructureResponse["data"],
    };
  }
}

export async function searchOwners(
  params: SearchOwnersParams = { q: "" }
): Promise<OwnerSearchResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.type) searchParams.set("type", params.type);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.page_size)
      searchParams.set("page_size", params.page_size.toString());

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/owners/search/?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to search owners");
    }

    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Failed to search owners",
      data: { count: 0, results: [] },
    };
  }
}

export async function searchAgents(
  params: Omit<SearchOwnersParams, "type"> = { q: "" }
): Promise<OwnerSearchResponse> {
  return searchOwners({ ...params, type: "agent" });
}

// Payment Plan Templates API
export const fetchPaymentPlanTemplates = async (params?: {
  category?: string;
  property_price?: number;
  featured?: boolean;
  page?: number;
  page_size?: number;
}) => {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.append("category", params.category);
    if (params?.property_price)
      queryParams.append("property_price", params.property_price.toString());
    if (params?.featured)
      queryParams.append("featured", params.featured.toString());
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());

    // Make API request using the same pattern as other functions
    const response = await fetch(
      `${API_BASE_URL}/sales/templates/payment-plans/?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to fetch payment plan templates"
      );
    }

    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching payment plan templates:", error);
    throw error;
  }
};

// Assign Sales Person API
export async function assignSalesPerson(
  params: AssignSalesPersonParams
): Promise<AssignSalesPersonResponse | { error: true; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "Authentication required" };
    }

    const response = await fetch(`${API_BASE_URL}/sales/assign-sales-person/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: true,
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error assigning sales person:", error);
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// Remove Sales Person API
export async function removeSalesPerson(
  params: { salesItemId: string }
): Promise<RemoveSalesPersonResponse | { error: true; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "Authentication required" };
    }

    const response = await fetch(`${API_BASE_URL}/sales/remove-sales-person/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: true,
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error removing sales person:", error);
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Network error occurred",
    };
  }
}
