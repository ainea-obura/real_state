"use server";

import { getServerSession } from "next-auth";

import {
  StaffForm,
  StaffTableItem,
  StaffListResponse,
  PositionsDropdownResponse,
} from "@/features/settings/schema/staff";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// --- Action: fetchPositionsForDropdown ---
export const fetchPositionsForDropdown = async (): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/positions/list?is_dropdown=true`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to fetch positions for dropdown" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from positions dropdown API" };
  }
  return data.data;
};

// --- Action: fetchStaffTable ---
export interface FetchStaffTableParams {
  page?: number;
  pageSize?: number;
  search?: string;
  showDeleted?: boolean;
}

export const fetchStaffTable = async (
  params: FetchStaffTableParams = {}
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize) searchParams.set("page_size", params.pageSize.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.showDeleted) searchParams.set("show_deleted", params.showDeleted.toString());

  const response = await fetch(
    `${API_BASE_URL}/staff/list?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to fetch staff table" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from staff table API" };
  }
  return data.data;
};

// --- Action: createStaff ---
export const createStaff = async (payload: StaffForm): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/staff/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to create staff" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from create staff API" };
  }
  return { data: data.data };
};

// --- Action: updateStaff ---
export const updateStaff = async (
  staffId: string,
  payload: StaffForm
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!staffId) {
    return { error: true, message: "'staffId' is required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/staff/${staffId}/update`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to update staff" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from update staff API" };
  }
  return { data: data.data };
};

// --- Action: deleteStaff ---
export async function deleteStaff(staffId: string): Promise<any> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) {
    return { error: true, message: "Authentication required" };
  }
  const res = await fetch(`${API_BASE_URL}/staff/${staffId}/delete`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!res.ok) {
    return { error: true, message: data?.message || "Failed to delete staff member" };
  }
  return data;
}

// Get user permissions details
export async function getUserPermissions(userId: string): Promise<any> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) {
    return { error: true, message: "Authentication required" };
  }
  const res = await fetch(`${API_BASE_URL}/staff/${userId}/permissions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!res.ok) {
    return { error: true, message: data?.message || "Failed to fetch user permissions" };
  }
  return data;
}

// Get current user permissions details
export async function getCurrentUserPermissions(): Promise<any> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const userId = session?.user?.id;
  if (!token) {
    return { error: true, message: "Authentication required" };
  }
  if (!userId) {
    return { error: true, message: "User ID not found in session" };
  }
  return await getUserPermissions(userId);
}
