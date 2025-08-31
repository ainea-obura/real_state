"use server";

import { getServerSession } from 'next-auth';

import {
    TenantAssignment, TenantAssignmentCreateInput, TenantAssignmentUpdateInput, TenantUser,
} from '@/features/property/tenant-assignment/types';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export const fetchTenantAssignments = async (
  page: number = 1,
  pageSize: number = 10,
  filters: Record<string, string> = {},
  propertyId?: string
): Promise<TenantAssignment[]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    ...filters,
    ...(propertyId ? { property_id: propertyId } : {}),
  });

  const response = await fetch(
    `${API_BASE_URL}/properties/property-tenant?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch tenant assignments");
  const data = await response.json();
  return data.data as TenantAssignment[];
};

export const getTenantAssignment = async (
  id: string
): Promise<TenantAssignment> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/properties/property-tenant/${id}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch tenant assignment");
  const data = await response.json();
  return data.data as TenantAssignment;
};

export const createTenantAssignment = async (
  input: TenantAssignmentCreateInput
): Promise<TenantAssignment> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/properties/property-tenant/create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );
  if (!response.ok) throw new Error("Failed to create tenant assignment");
  const data = await response.json();
  return data.data as TenantAssignment;
};

export const updateTenantAssignment = async (
  id: string,
  input: TenantAssignmentUpdateInput
): Promise<TenantAssignment> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/properties/property-tenant/${id}/update`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );
  if (!response.ok) throw new Error("Failed to update tenant assignment");
  const data = await response.json();
  return data.data as TenantAssignment;
};

export const deleteTenantAssignment = async (id: string): Promise<void> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/properties/property-tenant/${id}/delete`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to delete tenant assignment");
};

export const vacateTenantAssignment = async (id: string): Promise<{
  error: boolean;
  message: string;
  data?: {
    tenant_name: string;
    property_name: string;
    vacated_date: string;
    assignment_id: string;
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/projects/apartment-tenants/${id}/vacate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  const data = await response.json();
  
  if (!response.ok) {
    // Return error response with custom message
    return {
      error: true,
      message: data.message || `Failed to vacate tenant assignment (${response.status})`,
    };
  }
  
  return data;
};

export const searchTenants = async (
  query: string,
  type: string = "tenant"
): Promise<{
  error: boolean;
  data: {
    count: number;
    results: TenantUser[];
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/projects/tenants/search?q=${encodeURIComponent(
      query
    )}&type=${encodeURIComponent(type)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to search tenants");
  const data = await response.json();
  const options = [];

  if (!data.error) {
    return data.data.results;
  }
  return options;
};

export const searchOwnerAPI = async (
  query: string,
  type: string = "tenant"
): Promise<{
  error: boolean;
  data: {
    count: number;
    results: TenantUser[];
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/projects/tenants/search?q=${encodeURIComponent(
      query
    )}&type=${encodeURIComponent(type)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to search tenants");
  const data = await response.json();
  return data;
};
