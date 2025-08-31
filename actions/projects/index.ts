"use server";

import { format } from "date-fns";
import { getServerSession } from "next-auth";

import {
  ProjectApiRequest,
  ProjectFormValues,
} from "@/features/projects/types";
import { authOptions } from "@/lib/auth";
import { CurrencyDropdownResponse } from "@/schema/projects/currency";
import {
  ProjectsResponse,
  ProjectsResponseSchema,
  PropertyDetail,
  PropertyDetailSchema,
} from "@/schema/projects/schema";

const API_BASE_URL = process.env.API_BASE_URL;

const emptyProjectDetail = {
  error: false,
  message: undefined,
  data: {
    count: 0,
    results: {
      id: "",
      node: {
        id: "",
        name: "",
        node_type: "PROJECT" as const,
      },
      project_code: "",
      start_date: null,
      end_date: null,
      status: "planned" as const,
      description: "",
      project_type: "residential" as const,
      location: {
        lat: 0,
        long: 0,
        country: {
          id: "",
          name: "",
        },
        city: {
          id: "",
          name: "",
        },
        area: "",
        address: "",
      },
      is_deleted: false,
      created_at: "",
      structure_count: {
        total_blocks: 0,
        total_houses: 0,
      },
    },
  },
};

interface GetProjectsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  branch?: string;
  is_dropdown?: boolean;
}

export async function getProjects({
  page = 1,
  pageSize = 10,
  status,
  branch,
  is_dropdown = false,
}: GetProjectsParams = {}): Promise<ProjectsResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (status) params.append("status", status);
    if (branch) params.append("branch", branch);

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/projects?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch projects");
    }

    // Parse and validate response
    const data = await response.json();
    const validatedData = ProjectsResponseSchema.parse(data);

    return validatedData;
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Failed to fetch projects",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function createProject(
  data: ProjectFormValues
): Promise<ProjectsResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    // Format dates to YYYY-MM-DD before sending to backend
    const formattedData: ProjectApiRequest = {
      ...data,
      start_date: data.start_date ? format(new Date(data.start_date), "yyyy-MM-dd") : null,
      end_date: data.end_date
        ? format(new Date(data.end_date), "yyyy-MM-dd")
        : null,
    };

    const response = await fetch(`${API_BASE_URL}/projects/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create project");
    }
    const responseData = await response.json();
    const validatedData = ProjectsResponseSchema.parse(responseData);
    // Ensure isError and message are always present
    return {
      error: false,
      message: validatedData.message ?? null,
      data: validatedData.data,
    };
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Failed to create project",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function getProjectDetail(
  projectId: string
): Promise<ProjectsResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return emptyProjectDetail;
    }

    // Make API request
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return emptyProjectDetail;
    }

    // Parse and validate response
    const rawData = await response.json();
    const validatedData = ProjectsResponseSchema.parse(rawData);
    return validatedData;
  } catch (error) {
    return emptyProjectDetail;
  }
}

export async function updateProject(
  data: ProjectFormValues,
  projectId: string
): Promise<ProjectsResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    // Format dates to YYYY-MM-DD before sending to backend
    const formattedData: ProjectApiRequest = {
      ...data,
      start_date: data.start_date ? format(new Date(data.start_date), "yyyy-MM-dd") : null,
      end_date: data.end_date
        ? format(new Date(data.end_date), "yyyy-MM-dd")
        : null,
    };

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/update`,
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
      const error = await response.json();
      throw new Error(error.message || "Failed to create project");
    }
    const responseData = await response.json();
    const validatedData = ProjectsResponseSchema.parse(responseData);
    // Ensure isError and message are always present
    return {
      error: false,
      message: validatedData.message ?? null,
      data: validatedData.data,
    };
  } catch (error) {
    return {
      error: true,
      message:
        error instanceof Error ? error.message : "Failed to create project",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/delete`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create project");
    }
    return;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to delete project");
  }
}

/*
****************************
Property Actions
****************************
*/
export async function createProperty(
  data: PropertyDetail & { project_node_id: string }
): Promise<PropertyDetail> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/properties/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || error.detail || "Failed to create property"
      );
    }

    const responseData = await response.json();
    return PropertyDetailSchema.parse(responseData.data || responseData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to create property");
  }
}

export async function updateProperty(
  propertyId: string,
  data: Partial<PropertyDetail>
): Promise<PropertyDetail> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const response = await fetch(
      `${API_BASE_URL}/properties/${propertyId}/update`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update property");
    }

    const responseData = await response.json();
    return PropertyDetailSchema.parse(responseData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to update property");
  }
}

export async function getCurrencyDropdown(): Promise<CurrencyDropdownResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/finance/currency/dropdown`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to fetch currencies",
        data: [],
      };
    }

    return {
      error: false,
      message: "Currencies fetched successfully",
      data: data,
    };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to fetch currencies");
  }
}
