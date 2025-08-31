"use server";

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { authOptions } from '@/lib/auth';
import { BranchListResponse, BranchListResponseSchema } from '@/schema/company/schema';

const API_BASE_URL = process.env.API_BASE_URL;

interface Company {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
  };
  postal_code?: string;
  logo?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
}

interface ApiResponse<T = undefined> {
  isError: boolean;
  message?: string;
  data?: T;
}

export interface CreateCompanyData {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  postalCode?: string;
  logo: File;
}

export async function createCompany(
  data: FormData
): Promise<ApiResponse<Company>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const response = await fetch(`${API_BASE_URL}/companies/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: data,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to create company",
      }
    }

    // Revalidate the company data
    revalidatePath("/", "layout");

    return {
      isError: false,
      message: "Company created successfully",
      data: result.data,
    };
  } catch (error) {
    
    return {
      isError: true,
      message:
        error instanceof Error ? error.message : "Failed to create company",
    };
  }
}

export async function getCompanyDetails(
  companyId: string
): Promise<ApiResponse<Company>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const response = await fetch(`${API_BASE_URL}/companies/${companyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch company details");
    }

    return {
      isError: false,
      data: result.data,
    };
  } catch (error) {
    
    return {
      isError: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch company details",
    };
  }
}

export async function getCurrentUserCompany(): Promise<ApiResponse<Company>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    // Use the new endpoint that gets company by current user
    const response = await fetch(`${API_BASE_URL}/companies/current/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to fetch company details",
      };
    }

    return {
      isError: false,
      data: result.data,
    };
  } catch (error) {
    
    return {
      isError: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch company details",
    };
  }
}

export async function getCompanyBranches({
  companyId,
}: {
  companyId: string;
}): Promise<BranchListResponse> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const res = await fetch(`${API_BASE_URL}/companies/${companyId}/branches/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to fetch company branches");
  }

  const data = BranchListResponseSchema.parse(await res.json());
  return data;
}

export async function updateCompany(
  companyId: string,
  data: FormData
): Promise<ApiResponse<Company>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/update/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: data,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to update company",
      };
    }

    // Revalidate the company data
    revalidatePath("/", "layout");

    return {
      isError: false,
      message: "Company updated successfully",
      data: result.data,
    };
  } catch (error) {
    
    return {
      isError: true,
      message:
        error instanceof Error ? error.message : "Failed to update company",
    };
  }
}
