"use server";

import { getServerSession } from 'next-auth';

import {
    TenantDashboardResponse, TenantDashboardResponseSchema,
} from '@/features/clients/tabs/schema/tenantDashboard';
import { authOptions } from '@/lib/auth';
import { TenantFinanceSummarySchema, TenantFinanceSummary } from '@/features/clients/tabs/schema/tenantOverview';

const API_BASE_URL = process.env.API_BASE_URL;

export const getTenantDashboard = async (
  tenantId: string
): Promise<TenantDashboardResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    // Fetch the full dashboard data from the backend
    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/${tenantId}/dashboard`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch tenant dashboard");
    }

    const data = await res.json();

    // Validate and return the data using Zod schema
    return TenantDashboardResponseSchema.parse(data);
  } catch (error) {
    
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch tenant dashboard",
      data: {
        tenant: {
          id: "",
          email: "",
          first_name: "",
          last_name: "",
          phone: "",
          gender: "",
          type: "tenant",
          is_active: false,
          is_tenant_verified: false,
          created_at: "",
          modified_at: "",
          verification: {
            id: null,
            status: "Not Verified",
            id_number: null,
            category: null,
            document_image: null,
            user_image: null,
            created_at: null,
          },
        },
        property_assignments: [],
        payments: [],
        invoices: [],
        documents: [],
        stats: {
          total_rent_paid: 0,
          total_outstanding: 0,
          active_contracts: 0,
          total_documents: 0,
        },
      },
    };
  }
};

// NEW: Verification status update action
export const updateTenantVerification = async (
  verificationId: string,
  action: "approve" | "reject"
): Promise<{ success: boolean; message: string; newStatus?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    if (action !== "approve" && action !== "reject") {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    const res = await fetch(`${API_BASE_URL}/projects/tenants/verify/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        verification_id: verificationId,
        action: action,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.message || "Failed to update verification status"
      );
    }

    const data = await res.json();

    return {
      success: true,
      message: data.message || `Verification ${action}d successfully`,
      newStatus: action === "approve" ? "approved" : "rejected",
    };
  } catch (error) {
    
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update verification status",
    };
  }
};

// NEW: Register verification for tenant
export const registerTenantVerification = async (
  tenantId: string,
  verificationData: {
    category: string;
    id_number: string;
    document_image?: File;
    user_image?: File;
  }
): Promise<{ success: boolean; message: string; verificationId?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    // Create FormData for file uploads
    const formData = new FormData();
    formData.append("tenant_id", tenantId);
    formData.append("category", verificationData.category);
    formData.append("id_number", verificationData.id_number);

    // Add files if provided
    if (verificationData.document_image) {
      formData.append("document_image", verificationData.document_image);
    }
    if (verificationData.user_image) {
      formData.append("user_image", verificationData.user_image);
    }

    const res = await fetch(`${API_BASE_URL}/projects/tenants/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type for FormData, let the browser set it
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to register verification");
    }

    const data = await res.json();

    return {
      success: true,
      message: data.message || "Verification registered successfully",
      verificationId: data.data?.results?.id,
    };
  } catch (error) {
    
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to register verification",
    };
  }
};

// Helper function to get available actions based on current status
export const getVerificationActions = async (currentStatus: string) => {
  switch (currentStatus?.toLowerCase()) {
    case "rejected":
      return [
        { label: "Approve", action: "approve", variant: "default" as const },
      ];
    case "approved":
      return [
        { label: "Reject", action: "reject", variant: "destructive" as const },
      ];
    case "pending":
      return [
        { label: "Approve", action: "approve", variant: "default" as const },
        { label: "Reject", action: "reject", variant: "destructive" as const },
      ];
    default:
      return [];
  }
};

// NEW: Update verification details for tenant
export const updateTenantVerificationDetails = async (
  verificationId: string,
  updateData: {
    category?: string;
    id_number?: string;
    document_image?: File;
    user_image?: File;
  }
): Promise<{ success: boolean; message: string; verificationId?: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    // Create FormData for file uploads
    const formData = new FormData();
    if (updateData.category) formData.append("category", updateData.category);
    if (updateData.id_number)
      formData.append("id_number", updateData.id_number);
    if (updateData.document_image)
      formData.append("document_image", updateData.document_image);
    if (updateData.user_image)
      formData.append("user_image", updateData.user_image);

    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/verify/${verificationId}/update`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it
        },
        body: formData,
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.message || "Failed to update verification details"
      );
    }

    const data = await res.json();

    return {
      success: true,
      message: data.message || "Verification updated successfully",
      verificationId: data.data?.results?.id || verificationId,
    };
  } catch (error) {
    
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update verification details",
    };
  }
};

// Assign tenant to unit/house
export const assignTenantToUnit = async (
  projectId: string,
  payload: {
    property_type: 'BLOCK' | 'HOUSE';
    block?: string;
    floor?: string;
    unit?: string;
    house?: string;
    tenant_user: string;
    contract_start: string;
    contract_end?: string;
    rent_amount: string | number;
    currency?: string;
  }
): Promise<{
  error: boolean;
  message: string;
  data: any;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error('Authentication required');
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/${projectId}/assign-tenant`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to assign tenant');
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to assign tenant',
      data: null,
    };
  }
};

// Fetch all property tenant assignments for a project
export const getAllPropertyTenants = async (
  projectId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: any[];
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error('Authentication required');
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/apartment-tenants/all?project_id=${projectId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch property tenants');
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to fetch property tenants',
      data: null,
    };
  }
};

// Delete a property tenant assignment by ID
export const deletePropertyTenantAssignment = async (
  assignmentId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/apartment-tenants/${assignmentId}/delete`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete tenant assignment");
    }
    return { success: true, message: "Tenant assignment deleted successfully" };
  } catch (error) {
    
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete tenant assignment",
    };
  }
};

// Fetch property stats for a project
export const getPropertyStats = async (
  projectId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: {
      total_tenants: number;
      active_tenants: number;
      inactive_tenants: number;
      total_units: number;
      occupied_units: number;
      available_units: number;
      total_houses: number;
      occupied_houses: number;
      available_houses: number;
    };
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error('Authentication required');
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/property-stats?project_id=${projectId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch property stats');
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to fetch property stats',
      data: null,
    };
  }
};

export const getTenantVerification = async (
  tenantId: string
): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    if (!token) {
      throw new Error("Authentication required");
    }

    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/${tenantId}/overview`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch tenant verification");
    }

    const data = await res.json();
    // The verification is in data.data.results.verification
    return data?.data?.results?.verification || null;
  } catch (error) {
    
    return null;
  }
};

export const getTenantProfile = async (
  tenantId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: any; // or TenantProfile type if defined
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/${tenantId}/profile`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to fetch tenant profile");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch tenant profile",
      data: null,
    };
  }
};

export const getTenantLeaseStats = async (
  tenantId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: {
      total_rent_paid: number;
      active_leases: number;
      total_outstanding: number;
    };
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/${tenantId}/lease-stats`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to fetch tenant lease stats");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch tenant lease stats",
      data: null,
    };
  }
};

// Fetch property assignment details by ID
export const getPropertyAssignmentDetail = async (
  assignmentId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: {
      id: string;
      node: {
        id: string;
        name: string;
        node_type: string;
        parent?: {
          id: string;
          name: string;
        } | null;
      };
      floor?: string;
      block?: string;
      contract_start: string;
      contract_end?: string;
      rent_amount: number;
      currency: string;
      created_at: string;
    };
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/property-assignments/${assignmentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to fetch property assignment details");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch property assignment details",
      data: null,
    };
  }
};

// Fetch all property assignments with filtering options
export const getPropertyAssignments = async (
  filters?: {
    project_id?: string;
    tenant_id?: string;
  }
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: Array<{
      id: string;
      node: {
        id: string;
        name: string;
        node_type: string;
        parent?: {
          id: string;
          name: string;
        } | null;
      };
      floor?: string;
      block?: string;
      contract_start: string;
      contract_end?: string;
      rent_amount: number;
      currency: string;
      created_at: string;
    }>;
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (filters?.project_id) {
      queryParams.append("project_id", filters.project_id);
    }
    if (filters?.tenant_id) {
      queryParams.append("tenant_id", filters.tenant_id);
    }

    const url = `${API_BASE_URL}/projects/property-assignments${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to fetch property assignments");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch property assignments",
      data: null,
    };
  }
};

// Fetch property assignments for a specific tenant
export const getTenantPropertyAssignments = async (
  tenantId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: Array<{
      id: string;
      node: {
        id: string;
        name: string;
        node_type: string;
        parent?: {
          id: string;
          name: string;
        } | null;
      };
      floor?: string;
      block?: string;
      contract_start: string;
      contract_end?: string;
      rent_amount: number;
      currency: string;
      created_at: string;
    }>;
  } | null;
}> => {
  return getPropertyAssignments({ tenant_id: tenantId });
};

// Fetch property assignments for a specific project
export const getProjectPropertyAssignments = async (
  projectId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    count: number;
    results: Array<{
      id: string;
      node: {
        id: string;
        name: string;
        node_type: string;
        parent?: {
          id: string;
          name: string;
        } | null;
      };
      floor?: string;
      block?: string;
      contract_start: string;
      contract_end?: string;
      rent_amount: number;
      currency: string;
      created_at: string;
    }>;
  } | null;
}> => {
  return getPropertyAssignments({ project_id: projectId });
};

// Update property assignment details
export const updatePropertyAssignment = async (
  assignmentId: string,
  updateData: {
    contract_start?: string;
    contract_end?: string;
    rent_amount?: number;
    currency?: string;
  }
): Promise<{
  error: boolean;
  message: string;
  data: any;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/apartment-tenants/${assignmentId}/update`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update property assignment");
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to update property assignment",
      data: null,
    };
  }
};

// Delete property assignment
export const deletePropertyAssignment = async (
  assignmentId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/apartment-tenants/${assignmentId}/delete`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete property assignment");
    }
    return { success: true, message: "Property assignment deleted successfully" };
  } catch (error) {
    
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete property assignment",
    };
  }
};

// Create new property assignment
export const createPropertyAssignment = async (
  assignmentData: {
    node: string;
    tenant_user: string;
    contract_start: string;
    contract_end?: string;
    rent_amount: number;
    currency?: string;
  }
): Promise<{
  error: boolean;
  message: string;
  data: any;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/apartment-tenants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignmentData),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to create property assignment");
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to create property assignment",
      data: null,
    };
  }
};

// Fetch property assignment stats for a tenant
export const getTenantPropertyAssignmentStats = async (
  tenantId: string
): Promise<{
  error: boolean;
  message?: string;
  data: {
    uniqueProperties: number;
    longestTenure: string;
    leaseRenewals: number;
    mostRecentStart: string;
  } | null;
}> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/property-assignments/tenant/stats?tenant_id=${tenantId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch property assignment stats");
    }
    return data;
  } catch (error) {
    
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch property assignment stats",
      data: null,
    };
  }
};

export const getTenantFinanceSummary = async (
  tenantId: string
): Promise<TenantFinanceSummary | { error: true; message: string }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) {
      throw new Error('Authentication required');
    }
    const res = await fetch(
      `${API_BASE_URL}/projects/tenants/${tenantId}/finance-summary`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch tenant finance summary');
    }
    const data = await res.json();
    
    if (!data.data) {
      return { error: true, message: "No finance summary available" };
    }
    return TenantFinanceSummarySchema.parse(data.data);
  } catch (error) {
    
    return {
      error: true,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to fetch tenant finance summary',
    };
  }
};
