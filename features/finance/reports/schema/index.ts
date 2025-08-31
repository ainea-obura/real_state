import { z } from "zod";

// TypeScript interfaces for API responses
export interface PropertySummaryItem {
  property_id: string;
  property_name: string;
  total_income: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  total_expense: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  net: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
}

export interface PropertySummaryResponse {
  error: boolean;
  message: string;
  data: {
    count: number;
    results: PropertySummaryItem[];
  };
}

export interface ReportSummaryItem {
  total_income: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  total_expense: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  net_profit: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  paid_rents: string; // String representation of number from backend
  overdue_payments: string; // String representation of number from backend
  properties_managed: string; // String representation of number from backend
}

export interface ReportSummaryResponse {
  error: boolean;
  message: string;
  data: {
    count: number;
    results: ReportSummaryItem[];
  };
}

export interface EnhancedSummaryResponse {
  error: boolean;
  message: string;
  data: {
    totalIncome: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
    totalExpenses: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
    netProfit: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,234")
  };
}

export interface MonthlyBreakdown {
  month: number;
  month_name: string;
  year: number;
  value: string; // Pre-formatted with currency symbol from backend (e.g., "KES 6,000")
}

export interface ProjectOwner {
  name: string;
  email: string;
  phone: string;
  type: "user" | "company";
}

export interface FinancialSummary {
  totalCollections: string; // Pre-formatted with currency symbol from backend (e.g., "KES 1,333")
  totalExpenditures: string; // Pre-formatted with currency symbol from backend (e.g., "KES 6,000")
  balance: string; // Pre-formatted with currency symbol from backend (e.g., "KES -4,667")
  expendituresByService: Record<string, string>; // Service name to amount mapping
}

export interface ProjectService {
  id: string;
  name: string;
  type: "FIXED" | "VARIABLE" | "PERCENTAGE";
  total_cost: string; // Pre-formatted with currency symbol from backend (e.g., "KES 42,000")
  frequency: "MONTHLY" | "WEEKLY" | "ONE_TIME";
  description?: string;
  monthly_breakdown: MonthlyBreakdown[];
}

export interface ProjectSummaryItem {
  id: string;
  name: string;
  unitsCount: number;
  services: ProjectService[];
  owners: ProjectOwner[];
  financial_summary: FinancialSummary;
}

export interface ProjectSummaryResponse {
  error: boolean;
  message: string;
  data: {
    projects: ProjectSummaryItem[];
  };
}

export interface UnitAttachedService {
  id: string;
  name: string;
  cost: string; // Pre-formatted with currency symbol from backend (e.g., "KES 500")
  description?: string;
}

export interface PerUnitSummaryItem {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  rentFee: string; // Pre-formatted with currency symbol from backend (e.g., "KES 123,456")
  serviceCharge: string; // Pre-formatted with currency symbol from backend (e.g., "KES 12,345.6")
  serviceFee: string; // Pre-formatted with currency symbol from backend (e.g., "KES 0")
  totalIncome: string; // Pre-formatted with currency symbol from backend (e.g., "KES 123,456")
  totalExpenses: string; // Pre-formatted with currency symbol from backend (e.g., "KES 0")
  netIncome: string; // Pre-formatted with currency symbol from backend (e.g., "KES 135,801.6")
  occupancyStatus: "OCCUPIED" | "VACANT" | "MAINTENANCE";
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  attachedServices: UnitAttachedService[];
  nodeType?: "UNIT" | "HOUSE"; // Type of property (unit or house)
}

export interface ProjectSummary {
  collectedRent: string; // Pre-formatted with currency symbol from backend (e.g., "KES 123,456")
  serviceCharge: string; // Pre-formatted with currency symbol from backend (e.g., "KES 12,345.6")
  servicesFee: string; // Pre-formatted with currency symbol from backend (e.g., "KES 0")
  net: string; // Pre-formatted with currency symbol from backend (e.g., "KES 135,801.6")
  unitsCount: number;
}

export interface PerUnitSummaryProject {
  id: string;
  name: string;
  summary: ProjectSummary;
}

export interface PerUnitSummaryResponse {
  error: boolean;
  message: string;
  data: {
    units: PerUnitSummaryItem[];
    projects: PerUnitSummaryProject[];
  };
}

// Zod schemas for runtime validation
export const PropertySummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    count: z.number(),
    results: z.array(
      z.object({
        property_id: z.string(),
        property_name: z.string(),
        total_income: z.string(),
        total_expense: z.string(),
        net: z.string(),
      })
    ),
  }),
});

export const ReportSummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    count: z.number(),
    results: z.array(
      z.object({
        total_income: z.string(),
        total_expense: z.string(),
        net_profit: z.string(),
        paid_rents: z.string(),
        overdue_payments: z.string(),
        properties_managed: z.string(),
      })
    ),
  }),
});

export const EnhancedSummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    totalIncome: z.string(),
    totalExpenses: z.string(),
    netProfit: z.string(),
  }),
});

export const MonthlyBreakdownSchema = z.object({
  month: z.number(),
  month_name: z.string(),
  year: z.number(),
  value: z.string(),
});

export const ProjectOwnerSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  type: z.enum(["user", "company"]),
});

export const FinancialSummarySchema = z.object({
  totalCollections: z.string(),
  totalExpenditures: z.string(),
  balance: z.string(),
  expendituresByService: z.record(z.string(), z.string()),
});

export const ProjectServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["FIXED", "VARIABLE", "PERCENTAGE"]),
  total_cost: z.string(),
  frequency: z.enum(["MONTHLY", "WEEKLY", "ONE_TIME"]),
  description: z.string().optional(),
  monthly_breakdown: z.array(MonthlyBreakdownSchema),
});

export const ProjectSummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    projects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        unitsCount: z.number(),
        services: z.array(ProjectServiceSchema),
        owners: z.array(ProjectOwnerSchema),
        financial_summary: FinancialSummarySchema,
      })
    ),
  }),
});

export const UnitAttachedServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.string(),
  description: z.string().optional(),
});

export const PerUnitSummaryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  rentFee: z.string(),
  serviceCharge: z.string(),
  serviceFee: z.string(),
  totalIncome: z.string(),
  totalExpenses: z.string(),
  netIncome: z.string(),
  occupancyStatus: z.enum(["OCCUPIED", "VACANT", "MAINTENANCE"]),
  tenantName: z.string().nullable().optional(),
  tenantEmail: z.string().nullable().optional(),
  tenantPhone: z.string().nullable().optional(),
  leaseStartDate: z.string().nullable().optional(),
  leaseEndDate: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  ownerPhone: z.string().nullable().optional(),
  attachedServices: z.array(UnitAttachedServiceSchema),
  nodeType: z.enum(["UNIT", "HOUSE"]).optional(),
});

export const ProjectSummarySchema = z.object({
  collectedRent: z.string(),
  serviceCharge: z.string(),
  servicesFee: z.string(),
  net: z.string(),
  unitsCount: z.number(),
});

export const PerUnitSummaryProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: ProjectSummarySchema,
});

export const PerUnitSummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    units: z.array(PerUnitSummaryItemSchema),
    projects: z.array(PerUnitSummaryProjectSchema),
  }),
});

// New Services Report Schema
export const ServicesReportMonthlyBreakdownSchema = z.object({
  month: z.number(),
  month_name: z.string(),
  year: z.number(),
  value: z.string(),
});

export const ServicesReportServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["FIXED", "VARIABLE", "PERCENTAGE"]),
  frequency: z.enum(["MONTHLY", "WEEKLY", "ONE_TIME"]),
  billedTo: z.enum(["OWNER", "TENANT"]),
  description: z.string(),
  monthly_breakdown: z.array(ServicesReportMonthlyBreakdownSchema),
  total_cost: z.string(),
  attached_projects: z.array(z.string()),
});

export const ServicesReportSummarySchema = z.object({
  totalServices: z.number(),
  totalCost: z.string(),
  year: z.number(),
});

export const ServicesReportDataSchema = z.object({
  services: z.array(ServicesReportServiceSchema),
  summary: ServicesReportSummarySchema,
});

export const ServicesReportResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: ServicesReportDataSchema,
});

// TypeScript interfaces for the new services report
export interface ServicesReportMonthlyBreakdown {
  month: number;
  month_name: string;
  year: number;
  value: string;
}

export interface ServicesReportService {
  id: string;
  name: string;
  type: "FIXED" | "VARIABLE" | "PERCENTAGE";
  frequency: "MONTHLY" | "WEEKLY" | "ONE_TIME";
  billedTo: "OWNER" | "TENANT";
  description: string;
  monthly_breakdown: ServicesReportMonthlyBreakdown[];
  total_cost: string;
  attached_projects: string[];
}

export interface ServicesReportSummary {
  totalServices: number;
  totalCost: string;
  year: number;
}

export interface ServicesReportData {
  services: ServicesReportService[];
  summary: ServicesReportSummary;
}

// Service Summary Report exports
export * from "./serviceSummaryReport";
