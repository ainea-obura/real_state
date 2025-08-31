"use server";

import { getServerSession } from 'next-auth';
import { z } from 'zod';

import {
    OwnerDashboardResponse, OwnerDashboardResponseSchema,
} from '@/features/clients/tabs/schema/ownerDashboardSchema';
import {
    OwnerIncomeApiResponse, OwnerIncomeApiResponseSchema,
} from '@/features/clients/tabs/schema/ownerIncomeSchema';
import { OwnerInvoiceApiResponse } from '@/features/clients/tabs/schema/ownerInvoiceSchema';
import {
    OwnerPropertiesApiResponseSchema,
} from '@/features/clients/tabs/schema/ownerPropertiesSchema';
import {
    ProjectOwnersRead, ProjectOwnersReadSchema,
} from '@/features/projects/profile/tabs/Components/schema/porjectOwnersReadSchema';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

/**
 * Fetch comprehensive owner dashboard data using the new simplified API
 */
export async function getOwnerDashboard(
  ownerId: string
): Promise<OwnerDashboardResponse> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    // Fetch owner dashboard data from the new simplified endpoint
    const response = await fetch(`${API_BASE_URL}/projects/owners/${ownerId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw response;
    }

    const data = await response.json();
    const validatedData = OwnerDashboardResponseSchema.parse(data);

    // Return the data as-is since it already matches our schema structure
    return validatedData;
  } catch (error) {
    
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch owner dashboard data",
      data: {
        count: 0,
        results: [
          {
            owner: {
              id: "",
              email: "",
              first_name: "",
              last_name: "",
              phone: "",
              gender: "",
              type: "owner" as const,
              is_active: false,
              is_owner_verified: false,
              created_at: "",
              modified_at: "",
            },
            stats: {
              total_income: "0",
              total_outstanding: "0",
              owned_properties: "0",
              pending_invoices: "0",
              occupancy_rate: "0",
              total_service_cost: "0",
              total_management_cost: "0",
            },
          },
        ],
      },
    };
  }
}

/**
 * Fetch comprehensive owner properties data including portfolio stats, property ownerships, tenants, and maintenance data
 */
export async function getOwnerPropertiesDetailsTab(
  ownerId: string
): Promise<z.infer<typeof OwnerPropertiesApiResponseSchema>> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    // Fetch owner properties data from the new endpoint
    const response = await fetch(
      `${API_BASE_URL}/projects/owners/${ownerId}/properties`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw response;
    }

    const rawData = await response.json();

    // Validate the complete API response structure
    const validatedData = OwnerPropertiesApiResponseSchema.parse(rawData);

    return validatedData;
  } catch (error) {
    

    // Return empty data structure on error (matching the schema)
    return {
      error: true,
      data: {
        count: 0,
        results: [
          {
            summary: {
              total_properties: 0,
              active_tenants: 0,
              occupancy_rate: 0,
              total_maintenance: 0,
              total_emergency_maintenance: 0,
            },
            properties: [],
          },
        ],
      },
    };
  }
}

/**
 * Fetch comprehensive owner income data including stats, transactions, management fees, monthly breakdown, and pending payments
 */
export async function getOwnerIncomeDetail(
  ownerId: string
): Promise<OwnerIncomeApiResponse> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      return {
        error: true,
        message: "Authentication required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    if (!ownerId || ownerId === "undefined") {
      return {
        error: true,
        message: "Owner ID is required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    // Fetch owner income data from the new endpoint
    const response = await fetch(
      `${API_BASE_URL}/projects/owners/${ownerId}/income-detail`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = "Failed to fetch owner income data";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }

      return {
        error: true,
        message: errorMessage,
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const rawData = await response.json();

    // Validate the complete API response structure
    const validatedData = OwnerIncomeApiResponseSchema.parse(rawData);

    // Return the validated data
    return validatedData;
  } catch (error) {
    

    // Return empty data structure on error
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch owner income data",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function getOwnerInvoices(
  ownerId: string
): Promise<OwnerInvoiceApiResponse> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      return {
        error: true,
        data: {
          total_outstanding: "0",
          total_paid: "0",
          total_invoices: 0,
          total_receipts: 0,
          invoices: [],
        },
      };
    }

    

    if (!ownerId || ownerId === "undefined") {
      return {
        error: true,
        data: {
          total_outstanding: "0",
          total_paid: "0",
          total_invoices: 0,
          total_receipts: 0,
          invoices: [],
        },
      };
    }

    // Fetch owner invoice data from the correct endpoint
    const response = await fetch(
      `${API_BASE_URL}/projects/owners/${ownerId}/invoices`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        error: true,
        data: {
          total_outstanding: "0",
          total_paid: "0",
          total_invoices: 0,
          total_receipts: 0,
          invoices: [],
        },
      };
    }

    const rawData = await response.json();

    // If you have a Zod schema for validation, use it here:
    // const validatedData = OwnerInvoiceApiResponseSchema.parse(rawData);
    // return validatedData;
    // For now, just return the rawData as OwnerInvoiceApiResponse
    return rawData as OwnerInvoiceApiResponse;
  } catch (error) {
    
    return {
      error: true,
      data: {
        total_outstanding: "0",
        total_paid: "0",
        total_invoices: 0,
        total_receipts: 0,
        invoices: [],
      },
    };
  }
}

/**
 * Fetch project owners data for a specific project
 */
export async function getProjectOwners(
  projectDetailId: string
): Promise<ProjectOwnersRead> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    if (!projectDetailId || projectDetailId === "undefined") {
      throw new Error("Project Detail ID is required");
    }

    // Fetch project owners data from the API
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectDetailId}/owners`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        error: true,
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const rawData = await response.json();

    // Validate the complete API response structure
    const validatedData = ProjectOwnersReadSchema.parse(rawData);

    // Return the validated data
    return validatedData;
  } catch (error) {
    

    // Return empty data structure on error
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

/**
 * Fetch project owners data with error handling and fallback
 */
export async function getProjectOwnersWithFallback(
  projectDetailId: string
): Promise<ProjectOwnersRead> {
  try {
    const data = await getProjectOwners(projectDetailId);

    // If the API call was successful but returned no data, provide fallback
    if (!data.error && data.data.results.length === 0) {
      return {
        error: false,
        data: {
          count: 0,
          results: [
            {
              project_owners: [],
            },
          ],
        },
      };
    }

    return data;
  } catch (error) {
    

    return {
      error: true,
      data: {
        count: 0,
        results: [
          {
            project_owners: [],
          },
        ],
      },
    };
  }
}

/**
 * Assign owner to properties - handles houses and units with proper structure
 */
export async function assignOwnerToProperties(
  assignmentData: {
    owner_id: string;

    properties?: Array<
      | {
          house_id: string;
          type: "HOUSE";
        }
      | {
          unit_id: string;
          type: "UNIT";
        }
    >;
    houses?: Array<{
      house_id: string;
      type: "HOUSE";
    }>;
  },
  project_id: string
): Promise<{
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      return {
        success: false,
        message: "Authentication required",
        error: "Authentication required",
      };
    }

    if (!assignmentData.owner_id) {
      return {
        success: false,
        message: "Owner ID is required",
        error: "Owner ID is required",
      };
    }

    // Prepare the request payload based on the data structure
    let payload;

    if (assignmentData.properties) {
      // Single properties array (either all houses or all units)
      payload = {
        owner_id: assignmentData.owner_id,
        properties: assignmentData.properties,
      };
    } else if (assignmentData.houses) {
      // Mixed selection - separate houses and units
      payload = {
        owner_id: assignmentData.owner_id,
        houses: assignmentData.houses,
      };
    } else {
      return {
        success: false,
        message: "Invalid assignment data structure",
        error: "Invalid assignment data structure",
      };
    }

    // Send the assignment request to the backend
    const response = await fetch(
      `${API_BASE_URL}/projects/${project_id}/owners/assign`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to assign owner to properties";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: "Owner assigned to properties successfully",
      data: data,
    };
  } catch (error) {
    
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function deletePropertyOwnership(
  nodeId: string,
  projectDetailId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}> {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectDetailId}/owners/${nodeId}/delete`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to delete property ownership",
      };
    }

    return {
      success: true,
      message: data.message || "Property ownership deleted successfully",
      data: data.data,
    };
  } catch (error) {
    
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
