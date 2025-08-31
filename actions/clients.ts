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


