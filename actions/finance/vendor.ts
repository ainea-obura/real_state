"use server";

import { getServerSession } from "next-auth";
import { VendorSchema, VendorListResponseSchema } from "@/features/finance/rendandInvoices/vendors/schema/vendorSchema";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export interface CreateVendorPayload {
  name: string;
  email: string;
  phone: string;
  type: "company" | "individual";
}

export const createVendor = async (
  payload: CreateVendorPayload
): Promise<any> => {
  try {
    // Validate payload with Zod schema
    const parsed = VendorSchema.omit({ id: true, totalExpenses: true, expenseCount: true }).parse(payload);

    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    const response = await fetch(`${API_BASE_URL}/finance/vendors/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: true, message: data.message || "Failed to create vendor" };
    }
    return data;
  } catch (error: any) {
    return { error: true, message: error?.message || "Failed to create vendor" };
  }
};

export const updateVendor = async (
  id: string,
  payload: CreateVendorPayload
): Promise<any> => {
  try {
    // Validate payload with Zod schema
    const parsed = VendorSchema.omit({ id: true, totalExpenses: true, expenseCount: true }).parse(payload);

    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    const response = await fetch(`${API_BASE_URL}/finance/vendors/${id}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: true, message: data.message || "Failed to update vendor" };
    }
    return data;
  } catch (error: any) {
    return { error: true, message: error?.message || "Failed to update vendor" };
  }
};

export const deleteVendor = async (id: string): Promise<any> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;

    const response = await fetch(`${API_BASE_URL}/finance/vendors/${id}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: true, message: data.message || "Failed to delete vendor" };
    }
    return data;
  } catch (error: any) {
    return { error: true, message: error?.message || "Failed to delete vendor" };
  }
};

export const fetchVendorStats = async (): Promise<{
  totalVendors: number;
  totalExpenses: number;
  totalExpenseCount: number;
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/finance/vendors/stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch vendor stats");
  const data = await response.json();
  const stats = data.data || data;

  // Map snake_case to camelCase
  return {
    totalVendors: stats.total_vendors,
    totalExpenses: stats.total_expenses,
    totalExpenseCount: stats.total_expense_count,
  };
};

export interface FetchVendorTableParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isDropdown?: boolean;
}

export const fetchVendorTable = async (
  params: FetchVendorTableParams = {}
): Promise<z.infer<typeof VendorListResponseSchema>["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize) searchParams.set("page_size", params.pageSize.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.isDropdown) searchParams.set("is_dropdown", params.isDropdown.toString());

  const response = await fetch(
    `${API_BASE_URL}/finance/vendors/?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch vendor table");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from vendor table API");

  // Validate and return
  const parsed = VendorListResponseSchema.parse(data);
  return parsed.data;
};
