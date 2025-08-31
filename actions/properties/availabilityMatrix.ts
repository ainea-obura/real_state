"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Types matching our new availability API response
export interface UnitDetail {
  identifier: string;
  size: string;
  unit_type: string;
  sale_price: string | null;
  description: string;
  management_mode: string;
  management_status: string;
  service_charge: string | null;
  currency: string | null;
}

export interface ReservationInfo {
  reservation_id: string;
  status: string;
  end_date: string;
  deposit_fee: string | null;
  created_at: string;
  notes: string;
}

export interface SaleInfo {
  sale_id: string;
  sale_date: string;
  sale_status: string;
  sale_price: string;
  down_payment: string;
  down_payment_percentage: string;
  possession_date: string | null;
  ownership_percentage: string;
}

export interface BuyerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface UnitData {
  id: string;
  name: string;
  node_type: string;
  property_type: string | null;
  unit_detail: UnitDetail;
  status: "available" | "booked" | "deposit_paid" | "sold";
  reservation_info: ReservationInfo | null;
  sale_info: SaleInfo | null;
  buyer_info: BuyerInfo | null;
}

export interface FloorData {
  [floorNumber: string]: UnitData[];
}

export interface BlockData {
  [blockLetter: string]: FloorData;
}

export interface ProjectData {
  id: string;
  name: string;
  node_type: string;
  property_type: string | null;
  project_detail: ProjectDetail | null;
  blocks: BlockData; // Changed from units to blocks
}

export interface ProjectDetail {
  city: string | null;
  area: string | null;
  project_code: string | null;
  address: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  project_type: string;
  management_fee: string | null;
}

export interface AvailabilityMatrixRequest {
  project_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface AvailabilityMatrixResponse {
  success: boolean;
  message: string;
  data?: ProjectData[];
}

export interface AvailabilityMatrixError {
  success: false;
  message: string;
  details?: Record<string, string[] | string>;
}

/**
 * Fetch property availability matrix data
 * @param requestData - Filter parameters
 * @returns Promise with availability matrix data or error
 */
export async function fetchAvailabilityMatrix(
  requestData: AvailabilityMatrixRequest = {}
): Promise<AvailabilityMatrixResponse | AvailabilityMatrixError> {
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
    if (requestData.project_id) {
      queryParams.append("project_id", requestData.project_id);
    }
    if (requestData.from_date) {
      queryParams.append("from_date", requestData.from_date);
    }
    if (requestData.to_date) {
      queryParams.append("to_date", requestData.to_date);
    }

    // Make API request to our new availability endpoint
    const url = `${API_BASE_URL}/sales/availability/${
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
    console.log("=== AVAILABILITY MATRIX API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=========================================");

    return {
      success: true,
      message: "Availability matrix retrieved successfully",
      data: data.data, // Return the nested data directly
    };
  } catch (error) {
    console.error("Error fetching availability matrix:", error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get list of projects for dropdown
 */
export async function fetchProjects(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  message: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    const response = await fetch(`${API_BASE_URL}/sales/availability/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract project list from the response
    const projects =
      data.data?.map((project: ProjectData) => ({
        id: project.id,
        name: project.name,
      })) || [];

    return {
      success: true,
      data: projects,
      message: "Projects retrieved successfully",
    };
  } catch (error) {
    console.error("Error fetching projects:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
