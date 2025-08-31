"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Document Template Data
export interface DocumentTemplate {
  id: number;
  name: string;
}

export interface DocumentTemplateListResponse {
  error: boolean;
  message: string;
  data: {
    count: number;
    results: DocumentTemplate[];
  };
}

export interface DocumentTemplateError {
  error: true;
  message: string;
}

/**
 * Fetch all document templates by type
 * @param documentType - The type of document templates to fetch (rent, offer_letter, sales_agreement)
 * @returns Promise with template list or error
 */
export async function getAllTemplates(
  documentType: "rent" | "offer_letter" | "sales_agreement" = "rent"
): Promise<DocumentTemplateListResponse | DocumentTemplateError> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        error: true,
        message: "Authentication required",
      };
    }

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/document-templates/?document_type=${documentType}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error response:", errorData);

      return {
        error: true,
        message:
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse successful response
    const data = await response.json();
    console.log("=== DOCUMENT TEMPLATES API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("======================================");

    return data;
  } catch (error) {
    console.error("Error fetching document templates:", error);

    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
