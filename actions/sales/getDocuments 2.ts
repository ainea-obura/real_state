"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Document Data
export interface Buyer {
  name: string;
  phone: string;
  email: string;
}

export interface Property {
  project: string;
  block?: string;
  floor?: string;
  unit?: string;
  houseName?: string;
}

export interface OfferLetter {
  documentLink: string;
  dueDate: string;
  status: "active" | "expired" | "accepted" | "rejected";
  documentName: string;
}

export interface Agreement {
  documentLink: string;
  status: "draft" | "pending" | "signed" | "expired";
  documentName: string;
}

export interface SalesDocument {
  id: string;
  buyer: Buyer;
  property: Property;
  offerLetter: OfferLetter | null;
  agreement: Agreement | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetDocumentsResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: SalesDocument[];
  };
}

export interface GetDocumentsError {
  success: false;
  message: string;
}

export interface GetDocumentsParams {
  search?: string;
  document_type?: "offer_letter" | "contract";
  status?: "active" | "signed" | "expired";
  page?: number;
  page_size?: number;
}

/**
 * Get sales documents list grouped by property + owner
 * @param params - Optional search and filter parameters
 * @returns Promise with documents list or error
 */
export async function getDocuments(
  params?: GetDocumentsParams
): Promise<GetDocumentsResponse | GetDocumentsError> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params?.search) {
      queryParams.append("search", params.search);
    }

    if (params?.document_type) {
      queryParams.append("document_type", params.document_type);
    }

    if (params?.status) {
      queryParams.append("status", params.status);
    }

    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }

    if (params?.page_size) {
      queryParams.append("page_size", params.page_size.toString());
    }

    // Make API request
    const url = `${API_BASE_URL}/sales/documents/list/${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error response:", errorData);

      return {
        success: false,
        message:
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log("=== GET DOCUMENTS API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("==================================");

    return data;
  } catch (error) {
    console.error("Error getting documents:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
