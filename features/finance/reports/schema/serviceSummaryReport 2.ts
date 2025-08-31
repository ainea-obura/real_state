import { z } from "zod";

// Monthly breakdown data for each service
export const ServiceSummaryMonthlyDataSchema = z.object({
  month: z.number(),
  month_name: z.string(),
  year: z.number(),
  value: z.string(),
});

// Project data structure
export const ServiceSummaryProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// Individual service data structure
export const ServiceSummaryServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  frequency: z.string(),
  billedTo: z.string(),
  description: z.string(),
  monthly_breakdown: z.array(ServiceSummaryMonthlyDataSchema),
  total: z.number(),
  attached_projects: z.array(ServiceSummaryProjectSchema),
});

// Project breakdown for summary cards
export const ServiceSummaryProjectBreakdownSchema = z.object({
  project: z.string(),
  project_id: z.string(),
  amount: z.string(),
});

// Financial summary data
export const ServiceSummaryFinancialSummarySchema = z.object({
  totalCollected: z.string(),
  totalExpense: z.string(),
  totalManagementFee: z.string(),
  balance: z.string(),
});

// Project breakdowns for all financial categories
export const ServiceSummaryProjectBreakdownsSchema = z.object({
  collections: z.array(ServiceSummaryProjectBreakdownSchema),
  expenses: z.array(ServiceSummaryProjectBreakdownSchema),
  managementFees: z.array(ServiceSummaryProjectBreakdownSchema),
  balance: z.array(ServiceSummaryProjectBreakdownSchema),
});

// Current month information
export const ServiceSummaryCurrentMonthSchema = z.object({
  month: z.number(),
  month_name: z.string(),
  year: z.number(),
});

// Applied filters information
export const ServiceSummaryAppliedFiltersSchema = z.object({
  project: z.string(),
  month: z.string(),
  year: z.number(),
});

// Main data structure
export const ServiceSummaryReportDataSchema = z.object({
  services: z.array(ServiceSummaryServiceSchema),
  summary: ServiceSummaryFinancialSummarySchema,
  projectBreakdowns: ServiceSummaryProjectBreakdownsSchema,
  currentMonth: ServiceSummaryCurrentMonthSchema,
  appliedFilters: ServiceSummaryAppliedFiltersSchema,
});

// Full API response structure
export const ServiceSummaryReportResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: ServiceSummaryReportDataSchema,
});

// TypeScript interfaces
export interface ServiceSummaryMonthlyData {
  month: number;
  month_name: string;
  year: number;
  value: string;
}

export interface ServiceSummaryProject {
  id: string;
  name: string;
}

export interface ServiceSummaryService {
  id: string;
  name: string;
  type: string;
  frequency: string;
  billedTo: string;
  description: string;
  monthly_breakdown: ServiceSummaryMonthlyData[];
  total: number;
  attached_projects: ServiceSummaryProject[];
}

export interface ServiceSummaryProjectBreakdown {
  project: string;
  project_id: string;
  amount: string;
}

export interface ServiceSummaryFinancialSummary {
  totalCollected: string;
  totalExpense: string;
  totalManagementFee: string;
  balance: string;
}

export interface ServiceSummaryProjectBreakdowns {
  collections: ServiceSummaryProjectBreakdown[];
  expenses: ServiceSummaryProjectBreakdown[];
  managementFees: ServiceSummaryProjectBreakdown[];
  balance: ServiceSummaryProjectBreakdown[];
}

export interface ServiceSummaryCurrentMonth {
  month: number;
  month_name: string;
  year: number;
}

export interface ServiceSummaryAppliedFilters {
  project: string;
  month: string;
  year: number;
}

export interface ServiceSummaryReportData {
  services: ServiceSummaryService[];
  summary: ServiceSummaryFinancialSummary;
  projectBreakdowns: ServiceSummaryProjectBreakdowns;
  currentMonth: ServiceSummaryCurrentMonth;
  appliedFilters: ServiceSummaryAppliedFilters;
}

export interface ServiceSummaryReportResponse {
  error: boolean;
  message: string;
  data: ServiceSummaryReportData;
}

// Request filters interface
export interface ServiceSummaryReportFilters {
  project?: string;
  month?: string;
  year?: number;
}
