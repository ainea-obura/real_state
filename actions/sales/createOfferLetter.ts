"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Offer Letter Data
export interface OfferLetterRequest {
  property_ids: string[];
  buyer_ids: string[];
  template_id: string;
  offer_price: number;
  down_payment: number;
  due_date: string;
  notes?: string;
}

export interface OfferLetterResponse {
  id: string;
  document_type: string;
  status: string;
  price: string;
  down_payment: string;
  down_payment_percentage: string;
  due_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOfferLetterResponse {
  success: boolean;
  message: string;
  data: OfferLetterResponse;
}

export interface CreateOfferLetterError {
  success: false;
  message: string;
}

/**
 * Create a new offer letter
 * @param offerLetterData - The offer letter data to create
 * @returns Promise with created offer letter or error
 */
export async function createOfferLetter(
  offerLetterData: OfferLetterRequest
): Promise<CreateOfferLetterResponse | CreateOfferLetterError> {
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
      `${API_BASE_URL}/sales/offer-letters/create/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(offerLetterData),
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
    console.log("=== CREATE OFFER LETTER API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("========================================");

    return data;
  } catch (error) {
    console.error("Error creating offer letter:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
