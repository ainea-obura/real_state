"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Types for Contract Data
export interface ContractRequest {
  offer_letter_id: string;
  template_id: string;
  notes?: string;
  variable_values?: Record<string, string | number | boolean>;
  update_offer_letter_status?: boolean; // New field to control status update
}

export interface ContractResponse {
  id: string;
  document_title: string;
  buyer_name: string;
  property_name: string;
  project_name: string;
  template_name: string;
  price_formatted: string;
  down_payment_formatted: string;
  due_date_formatted: string;
  related_offer_letter: {
    id: string;
    document_title: string;
    status: string;
  } | null;
  status: string;
  created_at: string;
  notes: string;
}

export interface CreateContractResponse {
  success: boolean;
  message: string;
  data: ContractResponse;
}

export interface CreateContractError {
  success: false;
  message: string;
  details?: Record<string, string[] | string>;
}

/**
 * Create a new contract from an offer letter
 * @param contractData - The contract data to create
 * @returns Promise with created contract or error
 */
export async function createContract(
  contractData: ContractRequest
): Promise<CreateContractResponse | CreateContractError> {
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
    const response = await fetch(`${API_BASE_URL}/sales/contracts/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contractData),
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
    console.log("=== CREATE CONTRACT API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("====================================");

    return data;
  } catch (error) {
    console.error("Error creating contract:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
