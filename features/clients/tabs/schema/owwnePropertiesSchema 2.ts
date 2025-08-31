// Owner Properties Schema - Matches OwnerPropertiesSerializer backend structure

import { z } from 'zod';

// Node types for location hierarchy
export type NodeType =
  | "PROJECT"
  | "BLOCK"
  | "HOUSE"
  | "FLOOR"
  | "UNIT"
  | "ROOM";

// Ownership types
export type OwnershipType =
  | "FULL_BLOCK"
  | "FULL_UNIT"
  | "FULL_HOUSE"
  | "UNKNOWN";

// Payment status types
export type PaymentStatus = "PAID" | "OVERDUE" | "PENDING";

// Priority levels for maintenance issues
export type PriorityLevel = "HIGH" | "MEDIUM" | "LOW";

// Maintenance status types
export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

// Zod validation schemas
export const NodeTypeSchema = z.enum([
  "PROJECT",
  "BLOCK",
  "HOUSE",
  "FLOOR",
  "UNIT",
  "ROOM",
]);
export const OwnershipTypeSchema = z.enum([
  "FULL_BLOCK",
  "FULL_UNIT",
  "FULL_HOUSE",
  "UNKNOWN",
]);
export const PaymentStatusSchema = z.enum(["PAID", "OVERDUE", "PENDING"]);
export const PriorityLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const MaintenanceStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

// Location Node schema
export const LocationNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  node_type: NodeTypeSchema,
  parent: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});

// Property Statistics schema
export const PropertyStatsSchema = z.object({
  total_units: z.number(),
  occupied_units: z.number(),
  vacant_units: z.number(),
  occupancy_rate: z.number(),
  total_rent_income: z.number(),
  monthly_expenses: z.number(),
  net_income: z.number(),
  maintenance_requests: z.number(),
  urgent_issues: z.number(),
  last_inspection: z.string().nullable(),
  next_inspection: z.string().nullable(),
  property_value: z.number(),
  annual_appreciation: z.number(),
  service_cost: z.number(),
  management_cost: z.number(),
});

// Tenant schema
export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  rent_amount: z.number(),
  lease_start: z.string(),
  lease_end: z.string().nullable(),
  payment_status: PaymentStatusSchema,
  last_payment: z.string().nullable(),
  contact: z.string(),
  email: z.string(),
});

// Maintenance Issue schema
export const MaintenanceIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PriorityLevelSchema,
  status: MaintenanceStatusSchema,
  assigned_to: z.string(),
  estimated_cost: z.number(),
  created_at: z.string(),
  due_date: z.string(),
});

// Property Ownership schema
export const PropertyOwnershipSchema = z.object({
  id: z.string(),
  node: LocationNodeSchema,
  created_at: z.string(),
  ownership_type: OwnershipTypeSchema,
  property_stats: PropertyStatsSchema,
  tenants: z.array(TenantSchema),
  maintenance_issues: z.array(MaintenanceIssueSchema),
});

// Portfolio Statistics schema
export const PortfolioStatsSchema = z.object({
  total_properties: z.number(),
  total_units: z.number(),
  total_occupied: z.number(),
  total_vacant: z.number(),
  overall_occupancy: z.number(),
  total_monthly_income: z.number(),
  total_monthly_expenses: z.number(),
  total_net_income: z.number(),
  total_maintenance_requests: z.number(),
  total_urgent_issues: z.number(),
  total_property_value: z.number(),
  average_appreciation: z.number(),
  overdue_payments: z.number(),
  total_tenants: z.number(),
  total_service_cost: z.number(),
  total_management_cost: z.number(),
});

// Owner Properties Response schema
export const OwnerPropertiesResponseSchema = z.object({
  property_ownerships: z.array(PropertyOwnershipSchema),
  portfolio_stats: PortfolioStatsSchema,
});

// API Response wrapper schema
export const OwnerPropertiesApiResponseSchema = z.object({
  error: z.boolean(),
  data: z.object({
    count: z.number(),
    results: z.array(OwnerPropertiesResponseSchema),
  }),
});

// Location Node interface
export interface LocationNode {
  id: string;
  name: string;
  node_type: NodeType;
  parent?: {
    id: string;
    name: string;
  } | null;
}

// Property Statistics interface
export interface PropertyStats {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  total_rent_income: number;
  monthly_expenses: number;
  net_income: number;
  maintenance_requests: number;
  urgent_issues: number;
  last_inspection: string | null;
  next_inspection: string | null;
  property_value: number;
  annual_appreciation: number;
  service_cost: number;
  management_cost: number;
}

// Tenant interface
export interface Tenant {
  id: string;
  name: string;
  unit: string;
  rent_amount: number;
  lease_start: string;
  lease_end: string | null;
  payment_status: PaymentStatus;
  last_payment: string | null;
  contact: string;
  email: string;
}

// Maintenance Issue interface
export interface MaintenanceIssue {
  id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: MaintenanceStatus;
  assigned_to: string;
  estimated_cost: number;
  created_at: string;
  due_date: string;
}

// Property Ownership interface
export interface PropertyOwnership {
  id: string;
  node: LocationNode;
  created_at: string;
  ownership_type: OwnershipType;
  property_stats: PropertyStats;
  tenants: Tenant[];
  maintenance_issues: MaintenanceIssue[];
}

// Portfolio Statistics interface
export interface PortfolioStats {
  total_properties: number;
  total_units: number;
  total_occupied: number;
  total_vacant: number;
  overall_occupancy: number;
  total_monthly_income: number;
  total_monthly_expenses: number;
  total_net_income: number;
  total_maintenance_requests: number;
  total_urgent_issues: number;
  total_property_value: number;
  average_appreciation: number;
  overdue_payments: number;
  total_tenants: number;
  total_service_cost: number;
  total_management_cost: number;
}

// Main Owner Properties Response interface
export interface OwnerPropertiesResponse {
  property_ownerships: PropertyOwnership[];
  portfolio_stats: PortfolioStats;
}

// API Response wrapper
export interface OwnerPropertiesApiResponse {
  error: boolean;
  data: {
    count: number;
    results: OwnerPropertiesResponse[];
  };
}

// Search and filter options
export interface OwnerPropertiesFilters {
  search?: string;
  ownership_type?: OwnershipType;
  payment_status?: PaymentStatus;
  maintenance_priority?: PriorityLevel;
  occupancy_rate_min?: number;
  occupancy_rate_max?: number;
  rent_amount_min?: number;
  rent_amount_max?: number;
}

// Sort options
export interface OwnerPropertiesSort {
  field:
    | "name"
    | "created_at"
    | "occupancy_rate"
    | "net_income"
    | "maintenance_requests";
  direction: "asc" | "desc";
}

// Pagination interface
export interface OwnerPropertiesPagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_count: number;
}

// Complete API request interface
export interface OwnerPropertiesRequest {
  owner_id: string;
  filters?: OwnerPropertiesFilters;
  sort?: OwnerPropertiesSort;
  pagination?: OwnerPropertiesPagination;
}

// Utility types for form handling
export interface OwnerPropertiesFormData {
  search: string;
  filters: OwnerPropertiesFilters;
  sort: OwnerPropertiesSort;
}

// Chart data interfaces for analytics
export interface OccupancyChartData {
  property_name: string;
  occupancy_rate: number;
  total_units: number;
  occupied_units: number;
}

export interface IncomeChartData {
  property_name: string;
  total_income: number;
  expenses: number;
  net_income: number;
}

export interface MaintenanceChartData {
  property_name: string;
  total_issues: number;
  urgent_issues: number;
  completed_issues: number;
}

// Dashboard summary cards data
export interface DashboardSummaryCards {
  total_properties: number;
  total_income: number;
  occupancy_rate: number;
  maintenance_requests: number;
}

// All types are already exported above
