"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Property Reservation
export interface CreatePropertyReservationParams {
  property_ids: string[];
  owner_id: string;
  end_date: string;
  deposit_fee?: number;
  notes?: string;
}

export interface PropertyReservationResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    owner: string;
    properties: string[];
    reservation_date: string;
    end_date: string;
    deposit_fee: number | null;
    notes: string;
    created_at: string;
    updated_at: string;
  };
}

export interface PropertyReservationError {
  success: false;
  message: string;
}

/**
 * Create a new property reservation
 * This handles the complete reservation flow from the frontend modal
 */
export async function createPropertyReservation(
  params: CreatePropertyReservationParams
): Promise<PropertyReservationResponse | PropertyReservationError> {
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
      `${API_BASE_URL}/sales/property-reservations/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating property reservation:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Network error occurred",
    };
  }
}
