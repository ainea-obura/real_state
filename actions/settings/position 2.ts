"use server";

import { getServerSession } from "next-auth";

import {
  PositionForm,
  PositionTableItem,
  PositionsListResponse,
} from "@/features/settings/schema/position";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// --- Action: fetchPositionTable ---
export interface FetchPositionTableParams {
  page?: number;
  pageSize?: number;
  search?: string;
  showDeleted?: boolean;
  is_dropdown?: boolean;
}

export const fetchPositionTable = async (
  params: FetchPositionTableParams = {}
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize) searchParams.set("page_size", params.pageSize.toString());
  if (params.search) searchParams.set("q", params.search);
  if (params.showDeleted) searchParams.set("show_deleted", params.showDeleted.toString());
  if (params.is_dropdown) searchParams.set("is_dropdown", params.is_dropdown.toString());

  const response = await fetch(
    `${API_BASE_URL}/positions/list?${searchParams.toString()}`,
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
    return { error: true, message: data?.message || "Failed to fetch position table" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from position table API" };
  }
  return data.data;
};

// --- Action: createPosition ---
export const createPosition = async (payload: PositionForm): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/positions/create`,
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
    return { error: true, message: data?.message || "Failed to create position" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from create position API" };
  }
  return data.data;
};

// --- Action: updatePosition ---
export const updatePosition = async (
  positionId: string,
  payload: PositionForm
): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!positionId) {
    return { error: true, message: "'positionId' is required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/positions/${positionId}/update`,
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
    return { error: true, message: data?.message || "Failed to update position" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from update position API" };
  }
  return data.data;
};

// --- Action: deletePosition ---
export const deletePosition = async (positionId: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!positionId) {
    return { error: true, message: "'positionId' is required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/positions/${positionId}/delete`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to delete position" };
  }
  return data;
};

// --- Action: restorePosition ---
export const restorePosition = async (positionId: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!positionId) {
    return { error: true, message: "'positionId' is required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/positions/${positionId}/restore`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to restore position" };
  }
  if (!data || typeof data !== "object" || !data.data) {
    return { error: true, message: "Invalid response from restore position API" };
  }
  return data.data;
};
