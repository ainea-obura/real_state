"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const changePasswordAction = async (data: ChangePasswordData) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/change-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to change password");
  }
  
  const responseData = await response.json();
  if (!responseData || typeof responseData !== "object" || !responseData.data)
    throw new Error("Invalid response from change password API");
  
  return responseData.data;
}; 