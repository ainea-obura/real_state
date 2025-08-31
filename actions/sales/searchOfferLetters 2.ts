"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Offer Letter Search Request
export interface OfferLetterSearchRequest {
  owner_ids: string[];
  property_ids: string[];
}

// Types for Offer Letter Search Response
export interface OfferLetterSearchResult {
  id: string;
  document_title: string;
  buyer_name: string;
  property_name: string;
  project_name: string;
  price_formatted: string;
  down_payment_formatted: string;
  due_date_formatted: string;
}

export interface OfferLetterSearchResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: OfferLetterSearchResult[];
  };
}

export interface OfferLetterSearchError {
  success: false;
  message: string;
}

/**
 * Search for existing offer letters by owner IDs and property IDs
 * @param searchData - The search criteria (owner IDs and property IDs)
 * @returns Promise with search results or error
 */
export async function searchOfferLetters(
  searchData: OfferLetterSearchRequest
): Promise<OfferLetterSearchResponse | OfferLetterSearchError> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/sales/offer-letters/search/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchData),
      }
    );

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
    console.log("=== SEARCH OFFER LETTERS API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=========================================");

    return data;
  } catch (error) {
    console.error("Error searching offer letters:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
