"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

interface ApiResponse<T = undefined> {
  error: boolean;
  message?: string;
  data?: T;
}

export async function getUserAccounts(userId: string): Promise<ApiResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "No access token available" };
    }

    const response = await fetch(`${API_BASE_URL}/accounts?user_id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: true, message: data.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return { error: false, message: "Accounts fetched successfully", data };
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Failed to fetch accounts" };
  }
}

export async function createAccount(accountData: any): Promise<ApiResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "No access token available" };
    }

    const response = await fetch(`${API_BASE_URL}/accounts/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: true, message: data.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return { error: false, message: "Account created successfully", data };
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Failed to create account" };
  }
}

export async function updateAccount(accountId: string, accountData: any): Promise<ApiResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "No access token available" };
    }

    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: true, message: data.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return { error: false, message: "Account updated successfully", data };
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Failed to update account" };
  }
}

export async function deleteAccount(accountId: string, userId: string): Promise<ApiResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "No access token available" };
    }

    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/delete?user_id=${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      // Try to parse error response as JSON, fallback to text if it fails
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          // Keep the default error message
        }
      }
      return { error: true, message: errorMessage };
    }

    // Try to parse success response as JSON, but don't fail if it's empty
    let data;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = { message: "Account deleted successfully" };
      }
    } catch {
      data = { message: "Account deleted successfully" };
    }

    return { error: false, message: data.message || "Account deleted successfully", data };
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Failed to delete account" };
  }
} 