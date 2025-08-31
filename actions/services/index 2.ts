"use server";

import { getServerSession } from 'next-auth';

import {
    ServiceApiRequest, ServiceFormValues, ServicesListResponse, servicesListResponseSchema,
} from '@/features/services/schema/serviceSchema';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

const emptyServicesResponse = {
  isError: false,
  message: null,
  data: {
    count: 0,
    results: [],
  },
};

interface GetServicesParams {
  page?: number;
  pageSize?: number;
  pricing_type?: string;
  is_active?: boolean;
  is_dropdown?: boolean;
}

export async function getServices({
  page = 1,
  pageSize = 50,
  pricing_type,
  is_active,
  is_dropdown,
}: GetServicesParams = {}): Promise<ServicesListResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (pricing_type) params.append("pricing_type", pricing_type);
    if (is_active !== undefined)
      params.append("is_active", is_active.toString());
    if (is_dropdown !== undefined)
      params.append("is_dropdown", is_dropdown.toString());

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/services?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        isError: true,
        message: error.message || "Failed to fetch services",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    // Parse and validate response
    const data = await response.json();
    try {
      const validatedData = servicesListResponseSchema.parse(data);
      return validatedData;
    } catch {
      return {
        isError: true,
        message: "Failed to parse services response",
        data: {
          count: 0,
          results: [],
        },
      };
    }
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error ? error.message : "Failed to fetch services",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function createService(
  data: ServiceFormValues
): Promise<ServicesListResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    // Format data for backend (remove currency field)
    const formattedData: ServiceApiRequest = {
      name: data.name,
      description: data.description || "",
      pricing_type: data.pricing_type,
      base_price: data.base_price,
      percentage_rate: data.percentage_rate,
      currency: data.currency!,
      frequency: data.frequency,
      billed_to: data.billed_to,
    };

    const response = await fetch(`${API_BASE_URL}/services/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        isError: true,
        message: error.message || "Failed to create service",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const responseData = await response.json();
    try {
      const validatedData = servicesListResponseSchema.parse(responseData);
      return {
        isError: false,
        message: validatedData.message ?? null,
        data: validatedData.data,
      };
    } catch {
      return {
        isError: true,
        message: "Failed to parse create service response",
        data: {
          count: 0,
          results: [],
        },
      };
    }
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error ? error.message : "Failed to create service",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function getServiceDetail(
  serviceId: string
): Promise<ServicesListResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return emptyServicesResponse;
    }

    // Make API request
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return emptyServicesResponse;
    }

    // Parse and validate response
    const rawData = await response.json();
    const validatedData = servicesListResponseSchema.parse(rawData);
    return validatedData;
  } catch (error) {
    
    return emptyServicesResponse;
  }
}

export async function updateService(
  data: ServiceFormValues,
  serviceId: string
): Promise<ServicesListResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    // Format data for backend (remove currency field)
    const formattedData: ServiceApiRequest = {
      name: data.name,
      description: data.description || "",
      pricing_type: data.pricing_type,
      base_price: data.base_price,
      percentage_rate: data.percentage_rate,
      currency: data.currency || "KES",
      frequency: data.frequency,
      billed_to: data.billed_to,
    };

    const response = await fetch(
      `${API_BASE_URL}/services/${serviceId}/update/`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(formattedData),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        isError: true,
        message: error.message || "Failed to update service",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const responseData = await response.json();
    try {
      const validatedData = servicesListResponseSchema.parse(responseData);
      return {
        isError: false,
        message: validatedData.message ?? null,
        data: validatedData.data,
      };
    } catch {
      return {
        isError: true,
        message: "Failed to parse update service response",
        data: {
          count: 0,
          results: [],
        },
      };
    }
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error ? error.message : "Failed to update service",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function deleteService(serviceId: string): Promise<any> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: true, message: "Authentication required" };
    }

    const response = await fetch(
      `${API_BASE_URL}/services/${serviceId}/delete/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { error: true, message: error.message || "Failed to delete service" };
    }
    return;
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Failed to delete service" };
  }
}
