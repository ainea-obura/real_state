"use server";

import { getServerSession } from 'next-auth';

import {
    ClientDetailResponse, ClientDetailResponseSchema, ClientFormValues, ClientsResponse,
    ClientsResponseSchema,
} from '@/features/clients/types';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// --- TENANTS ---
export const getTenants = async (
  page: number,
  pageSize: number,
  filters: Record<string, string> = {}
): Promise<ClientsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...filters,
  });
  const response = await fetch(
    `${API_BASE_URL}/projects/tenants?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  if (!response.ok) throw new Error("Failed to fetch tenants");
  const data = await response.json();
  return ClientsResponseSchema.parse(data);
};

export const getTenantById = async (
  id: string
): Promise<ClientDetailResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/tenants/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch tenant");
  const data = await response.json();
  return ClientDetailResponseSchema.parse(data);
};

export const createTenant = async (
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/projects/tenants/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    if (!response.ok){
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to create tenant",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to create tenant",
      data: null as any
    };
  }
};

export const updateTenant = async (
  id: string,
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/projects/tenants/${id}/update`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to update tenant",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to update tenant",
      data: null as any
    };
  }
};

export const deleteTenant = async (id: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/tenants/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: true, message: data.message || "Failed to delete tenant" };
  }
  return;
};

// --- OWNERS ---
export const getOwners = async (
  page: number,
  pageSize: number,
  filters: Record<string, string> = {}
): Promise<ClientsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...filters,
  });
  const response = await fetch(
    `${API_BASE_URL}/projects/owners?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch owners");
  const data = await response.json();
  return ClientsResponseSchema.parse(data);
};

export const getOwnerById = async (
  id: string
): Promise<ClientDetailResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/owners/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch owner");
  const data = await response.json();
  return ClientDetailResponseSchema.parse(data);
};

export const createOwner = async (
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/projects/owners/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to create owner",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to create owner",
      data: null as any
    };
  }
};

export const updateOwner = async (
  id: string,
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/projects/owners/${id}/update`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to update owner",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to update owner",
      data: null as any
    };
  }
};

export const deleteOwner = async (id: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/owners/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: true, message: data.message || "Failed to delete owner" };
  }
  return;
};

// --- AGENCIES ---
export const getAgencies = async (
  page: number,
  pageSize: number,
  filters: Record<string, string> = {}
): Promise<ClientsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...filters,
  });
  const response = await fetch(
    `${API_BASE_URL}/projects/agencies?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch agencies");
  const data = await response.json();
  return ClientsResponseSchema.parse(data);
};

export const getAgencyById = async (
  id: string
): Promise<ClientDetailResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/agencies/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch agency");
  const data = await response.json();
  return ClientDetailResponseSchema.parse(data);
};

export const createAgency = async (
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/projects/agencies/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to create agency",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to create agency",
      data: null as any
    };
  }
};

export const updateAgency = async (
  id: string,
  values: ClientFormValues
): Promise<ClientDetailResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/projects/agencies/${id}/update`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      return { 
        error: true, 
        message: data.message || "Failed to update agency",
        data: null as any
      };
    }
    const data = await response.json();
    return ClientDetailResponseSchema.parse(data);
  } catch (error) {
    return { 
      error: true, 
      message: "Failed to update agency",
      data: null as any
    };
  }
};

export const deleteAgency = async (id: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/projects/agencies/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: true, message: data.message || "Failed to delete agency" };
  }
  return;
};


// --- VERIFICATION DOCUMENTS ---

export const listVerificationDocuments = async (
  userId: string,
  userType: string
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams({ user_id: userId, user_type: userType });
  const response = await fetch(
    `${API_BASE_URL}/projects/verification/list?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: true, message: data.message || "Failed to fetch verification documents" };
  }
  return response.json();
};

export const uploadVerificationDocument = async (
  userId: string,
  userType: string,
  category: string,
  idNumber: string,
  documentImage: File,
  userImage?: File
): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("user_type", userType);
    formData.append("category", category);
    formData.append("id_number", idNumber);
    formData.append("document_image", documentImage);
    if (userImage) formData.append("user_image", userImage);
    const response = await fetch(`${API_BASE_URL}/projects/verification/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      return { error: true, message: data.message || "Failed to upload verification document" };
    }
    return response.json();
  } catch (error) {
    return { error: true, message: "Failed to upload verification document" };
  }
};

export const updateVerificationStatus = async (
  verificationId: string,
  action: "approve" | "reject" | "expire",
  userType: string
): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/projects/verification/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verification_id: verificationId,
        action,
        user_type: userType,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return { error: true, message: data.message || "Failed to update verification status" };
    }
    return data;
  } catch (error) {
    return { error: true, message: "Failed to update verification status" };
  }
};

// --- BULK UPLOAD CLIENTS ---
export interface BulkClientUploadData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  type: string;
  project_name: string;
  house_number: string;
}

export interface BulkClientUploadResponse {
  error: boolean;
  message?: string;
  data?: {
    count: number;
    results: Array<{
      type: string;
      success: boolean;
      data?: any;
      error?: string;
    }>;
  };
}

export const deleteTenantWithValidation = async (tenantId: string): Promise<ApiResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    
    if (!token) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const apiUrl = `${API_BASE_URL}/projects/tenants/${tenantId}/delete`;
    
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to delete tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        errorMessage = response.statusText || errorMessage;
      }

      return {
        isError: true,
        message: errorMessage,
      };
    }

    const responseData = await response.json();
    return {
      isError: false,
      message: responseData.message || "Tenant deleted successfully",
    };
  } catch (error) {
    console.error('Delete tenant error:', error);
    return {
      isError: true,
      message: "Failed to delete tenant",
    };
  }
};

export const bulkUploadClients = async (
  data: BulkClientUploadData[]
): Promise<BulkClientUploadResponse> => {
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

    console.log('🚀 Frontend: Starting bulk client upload');
    console.log('🚀 Frontend: Data to send:', data);
    console.log('🚀 Frontend: Data length:', data.length);
    console.log('🚀 Frontend: API_BASE_URL:', API_BASE_URL);
    console.log('🚀 Frontend: Token exists:', !!token);
    
    const apiUrl = `${API_BASE_URL}/projects/clients/bulk-upload`;
    console.log('🚀 Frontend: Full API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = "Failed to bulk upload clients";
      console.log('❌ Frontend: Response not OK, status:', response.status);
      console.log('❌ Frontend: Response statusText:', response.statusText);
      
      try {
        const errorData = await response.json();
        console.log('❌ Frontend: Error data:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.log('❌ Frontend: Failed to parse error response:', parseError);
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

    const responseData = await response.json();
    console.log('✅ Frontend: Success response:', responseData);
    return responseData;
  } catch (error) {
    console.error('Bulk upload error:', error);
    return {
      error: true,
      message: "Failed to upload clients",
      data: {
        count: 0,
        results: [],
      },
    };
  }
};


