"use server";

import { getServerSession } from "next-auth";

import {
  EnhancedSummaryResponse,
  EnhancedSummaryResponseSchema,
  PerUnitSummaryResponse,
  PerUnitSummaryResponseSchema,
  ProjectSummaryResponse,
  ProjectSummaryResponseSchema,
  PropertySummaryResponse,
  PropertySummaryResponseSchema,
  ReportSummaryResponse,
  ReportSummaryResponseSchema,
  ServicesReportData,
  ServicesReportResponseSchema,
  ServiceSummaryReportFilters,
  ServiceSummaryReportResponse,
  ServiceSummaryReportResponseSchema,
} from "@/features/finance/reports/schema";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

/**
 * Fetch enhanced summary (financial summary)
 */
export const fetchEnhancedSummary = async (dateRange?: {
  from: Date;
  to?: Date;
}): Promise<EnhancedSummaryResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/reports/enhanced-summary/${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch enhanced summary: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  const parsed = EnhancedSummaryResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch enhanced summary");
  }
  return parsed.data;
};

/**
 * Fetch report summary (dashboard totals)
 */
export const fetchReportSummary = async (dateRange?: {
  from: Date;
  to?: Date;
}): Promise<ReportSummaryResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/reports/summary/${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch report summary: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  const parsed = ReportSummaryResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch report summary");
  }
  return parsed.data;
};

/**
 * Fetch property/unit/house breakdown summary
 */
export const fetchPropertySummary = async (dateRange?: {
  from: Date;
  to?: Date;
}): Promise<PropertySummaryResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/reports/property-summary/${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch property summary: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  const parsed = PropertySummaryResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch property summary");
  }
  return parsed.data;
};

/**
 * Fetch project summary report data
 */
export const fetchProjectSummary = async (dateRange?: {
  from: Date;
  to?: Date;
}): Promise<ProjectSummaryResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/reports/project-summary/${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch project summary: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  const parsed = ProjectSummaryResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch project summary");
  }
  return parsed.data;
};

/**
 * Fetch per unit summary report data
 */
export const fetchPerUnitSummary = async (dateRange?: {
  from: Date;
  to?: Date;
}): Promise<PerUnitSummaryResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/reports/per-unit-summary${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  console.log("Fetching per unit summary from:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch per unit summary: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  console.log("Per unit summary API response:", data);

  const parsed = PerUnitSummaryResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch per unit summary");
  }
  return parsed.data;
};

/**
 * Fetch services report data
 */
export const fetchServicesReport = async (): Promise<ServicesReportData> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  const url = `${API_BASE_URL}/reports/services/`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch services report: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();

  // Validate the response with the new schema
  const parsed = ServicesReportResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch services report");
  }

  return parsed.data;
};

/**
 * Fetch service summary report data (new service summary report)
 */
export const fetchServiceSummaryReport = async (
  filters?: ServiceSummaryReportFilters
): Promise<ServiceSummaryReportResponse["data"]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  // Build query parameters
  const params = new URLSearchParams();
  params.append("report_type", "service_summary");

  if (filters?.project) {
    params.append("project", filters.project);
  }
  if (filters?.month) {
    params.append("month", filters.month);
  }
  if (filters?.year) {
    params.append("year", filters.year.toString());
  }

  const url = `${API_BASE_URL}/reports/services/?${params.toString()}`;
  console.log("Fetching service summary report from:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch service summary report: ${response.status} - ${errorText}`
    );
  }
  const data = await response.json();
  console.log("Service summary report API response:", data);

  // Validate the response with the schema
  const parsed = ServiceSummaryReportResponseSchema.parse(data);
  if (parsed.error) {
    throw new Error(parsed.message || "Failed to fetch service summary report");
  }

  return parsed.data;
};

/**
 * Download service summary report as Excel
 */
export const downloadServiceSummaryExcel = async (
  filters?: ServiceSummaryReportFilters
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    if (!token) throw new Error("Authentication required");

    // Build query parameters
    const params = new URLSearchParams();
    params.append("report_type", "service_summary");

    if (filters?.project) {
      params.append("project", filters.project);
    }
    if (filters?.month) {
      params.append("month", filters.month);
    }
    if (filters?.year) {
      params.append("year", filters.year.toString());
    }

    const url = `${API_BASE_URL}/reports/services/?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch service summary report: ${response.status} - ${errorText}`
      );
    }
    
    const data = await response.json();
    const parsed = ServiceSummaryReportResponseSchema.parse(data);
    
    if (parsed.error) {
      throw new Error(parsed.message || "Failed to fetch service summary report");
    }

    // Return the data for client-side Excel export
    return {
      success: true,
      message: "Data fetched successfully",
      data: {
        summary: parsed.data.summary,
        services: parsed.data.services,
        projectBreakdowns: parsed.data.projectBreakdowns,
        appliedFilters: parsed.data.appliedFilters,
      },
    };
  } catch (error) {
    console.error("Error downloading Excel:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to download Excel file",
    };
  }
};
