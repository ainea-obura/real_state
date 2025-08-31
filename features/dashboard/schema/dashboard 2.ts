import { z } from "zod";

// Dashboard Stats Schema
export const DashboardStatsSchema = z.object({
  totalProperties: z.number(),
  fullManagement: z.number(),
  servicesOnly: z.number(),
  occupancyRate: z.number(),
  activeTenants: z.number(),
  activeContracts: z.number(),
  leasesEndingSoon: z.number(),
  expiredLeases: z.number(),
});

// API Response Schema
export const DashboardApiResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    count: z.number(),
    results: z.array(DashboardStatsSchema),
  }),
});

// Revenue Chart Data Schema
export const RevenueChartDataSchema = z.object({
  month: z.string(),
  revenue: z.number(),
  expenses: z.number(),
  netProfit: z.number(),
});

// Property Status Data Schema
export const PropertyStatusDataSchema = z.object({
  status: z.string(),
  count: z.number(),
  color: z.string(),
  percentage: z.number(),
});

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["invoice", "expense", "payment", "payout", "receipt"]),
  title: z.string(),
  amount: z.string(), // Formatted money string with currency
  status: z.enum([
    "paid",
    "pending",
    "overdue",
    "completed",
    "failed",
    "draft",
    "issued",
    "partial",
    "cancelled",
    "waiting_for_approval",
  ]),
  date: z.string(),
  tenant: z.string().optional().nullable(),
  property: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  expense_number: z.string().optional().nullable(),
  payout_number: z.string().optional().nullable(),
});

// Recent Transactions Response Schema
export const RecentTransactionsResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    transactions: z.array(TransactionSchema),
  }),
});

// Alert Schema
export const AlertSchema = z.object({
  id: z.string(),
  type: z.enum([
    "penalty",
    "overdue_invoice",
    "maintenance",
    "expiring",
    "payment",
  ]),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  date: z.string(),
  count: z.number(),
  amount: z.string().optional(),
  days_overdue: z.number().optional(),
  penalty_number: z.string().optional(),
  invoice_number: z.string().optional(),
  tenant_name: z.string().optional(),
  property_name: z.string().optional(),
});

// Alerts Response Schema
export const AlertsResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    alerts: z.array(AlertSchema),
  }),
});

// Financial Summary Schema
export const FinancialSummarySchema = z.object({
  totalReceived: z.string(),
  totalExpenses: z.string(),
  totalPayouts: z.string(),
  netIncome: z.string(),
});

// Finance Chart Data Schema (12 months)
export const FinanceChartDataSchema = z.object({
  month: z.string(),
  expenses: z.number(),
  payouts: z.number(),
});

// Finance Summary Response Schema
export const FinanceSummaryResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    summary: FinancialSummarySchema,
    chartData: z.array(FinanceChartDataSchema),
  }),
  org_account_balance: z.string().optional().nullable(), // <-- Add this line
});

// Occupancy Data Schema
export const OccupancyDataSchema = z.object({
  month: z.string(),
  occupied: z.number(),
  available: z.number(),
  underMaintenance: z.number(),
  total: z.number(),
});

// Quick Action Schema
export const QuickActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  href: z.string(),
  color: z.string(),
});

// Quick Actions Response Schema
export const QuickActionsResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: z.object({
    actions: z.array(QuickActionSchema),
  }),
});

// Dashboard Response Schema
export const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  revenueData: z.array(RevenueChartDataSchema),
  propertyStatusData: z.array(PropertyStatusDataSchema),
  recentTransactions: z.array(TransactionSchema),
  alerts: z.array(AlertSchema),
  financialSummary: FinancialSummarySchema,
  financeChartData: z.array(FinanceChartDataSchema),
  occupancyData: z.array(OccupancyDataSchema),
  quickActions: z.array(QuickActionSchema),
});

// TypeScript types
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type DashboardApiResponse = z.infer<typeof DashboardApiResponseSchema>;
export type RevenueChartData = z.infer<typeof RevenueChartDataSchema>;
export type PropertyStatusData = z.infer<typeof PropertyStatusDataSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type FinancialSummary = z.infer<typeof FinancialSummarySchema>;
export type FinanceChartData = z.infer<typeof FinanceChartDataSchema>;
export type FinanceSummaryResponse = z.infer<
  typeof FinanceSummaryResponseSchema
>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type RecentTransactionsResponse = z.infer<
  typeof RecentTransactionsResponseSchema
>;
export type QuickActionsResponse = z.infer<typeof QuickActionsResponseSchema>;
export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;
export type OccupancyData = z.infer<typeof OccupancyDataSchema>;
export type QuickAction = z.infer<typeof QuickActionSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

// Mock data based on backend models
export const mockDashboardData: DashboardResponse = {
  stats: {
    totalProperties: 48,
    fullManagement: 32,
    servicesOnly: 16,
    occupancyRate: 94.2,
    activeTenants: 156,
    activeContracts: 142,
    leasesEndingSoon: 23,
    expiredLeases: 8,
  },
  revenueData: [
    { month: "Jan", revenue: 85000, expenses: 35000, netProfit: 50000 },
    { month: "Feb", revenue: 92000, expenses: 38000, netProfit: 54000 },
    { month: "Mar", revenue: 88000, expenses: 42000, netProfit: 46000 },
    { month: "Apr", revenue: 95000, expenses: 40000, netProfit: 55000 },
    { month: "May", revenue: 102000, expenses: 45000, netProfit: 57000 },
    { month: "Jun", revenue: 98000, expenses: 43000, netProfit: 55000 },
    { month: "Jul", revenue: 110000, expenses: 47000, netProfit: 63000 },
    { month: "Aug", revenue: 105000, expenses: 44000, netProfit: 61000 },
    { month: "Sep", revenue: 115000, expenses: 46000, netProfit: 69000 },
    { month: "Oct", revenue: 108000, expenses: 48000, netProfit: 60000 },
    { month: "Nov", revenue: 120000, expenses: 50000, netProfit: 70000 },
    { month: "Dec", revenue: 125000, expenses: 45000, netProfit: 80000 },
  ],
  propertyStatusData: [
    { status: "Occupied", count: 32, color: "#10b981", percentage: 66.7 },
    { status: "Available", count: 8, color: "#3b82f6", percentage: 16.7 },
    {
      status: "Under Maintenance",
      count: 5,
      color: "#f59e0b",
      percentage: 10.4,
    },
    { status: "Reserved", count: 3, color: "#8b5cf6", percentage: 6.2 },
  ],
  recentTransactions: [
    {
      id: "1",
      type: "invoice",
      title: "Rent Payment - Unit 101",
      amount: "$2,500",
      status: "paid",
      date: "2024-01-15",
      tenant: "John Smith",
      property: "Sunset Apartments",
      invoice_number: "INV-001",
    },
    {
      id: "2",
      type: "expense",
      title: "Maintenance - HVAC Repair",
      amount: "-$850",
      status: "pending",
      date: "2024-01-14",
      vendor: "ABC Maintenance",
      property: "Sunset Apartments",
      expense_number: "EXP-001",
    },
    {
      id: "3",
      type: "invoice",
      title: "Utility Bill - Unit 203",
      amount: "$180",
      status: "overdue",
      date: "2024-01-13",
      tenant: "Sarah Johnson",
      property: "Sunset Apartments",
      invoice_number: "INV-002",
    },
    {
      id: "4",
      type: "payment",
      title: "Security Deposit - Unit 105",
      amount: "$3,000",
      status: "completed",
      date: "2024-01-12",
      tenant: "Mike Wilson",
      property: "Sunset Apartments",
      receipt_number: "REC-001",
    },
    {
      id: "5",
      type: "payout",
      title: "Owner Payout - Building A",
      amount: "-$15,000",
      status: "completed",
      date: "2024-01-11",
      property: "Sunset Apartments",
      payout_number: "PO-001",
    },
  ],
  alerts: [
    {
      id: "1",
      type: "penalty",
      title: "Late Payment Penalty",
      description: "Penalty for late rent payment",
      priority: "high",
      date: "2024-01-10",
      count: 1,
      amount: "$50.00",
      penalty_number: "PEN-001",
      tenant_name: "John Smith",
      property_name: "Unit 203",
    },
    {
      id: "2",
      type: "overdue_invoice",
      title: "Overdue Invoice",
      description: "Rent payment overdue",
      priority: "high",
      date: "2024-01-12",
      count: 1,
      amount: "$2,500.00",
      days_overdue: 5,
      invoice_number: "INV-002",
      tenant_name: "Sarah Johnson",
      property_name: "Unit 203",
    },
    {
      id: "3",
      type: "maintenance",
      title: "Maintenance Request",
      description: "New maintenance request for Unit 101",
      priority: "medium",
      date: "2024-01-13",
      count: 1,
    },
  ],
  financialSummary: {
    totalReceived: "$68,000",
    totalExpenses: "$41,000",
    totalPayouts: "$22,000",
    netIncome: "$5,000",
  },
  financeChartData: [
    { month: "Jan", expenses: 8000, payouts: 4000 },
    { month: "Feb", expenses: 9000, payouts: 5000 },
    { month: "Mar", expenses: 9500, payouts: 3500 },
    { month: "Apr", expenses: 11000, payouts: 6000 },
    { month: "May", expenses: 10500, payouts: 5500 },
    { month: "Jun", expenses: 12000, payouts: 7000 },
    { month: "Jul", expenses: 11500, payouts: 6500 },
    { month: "Aug", expenses: 12500, payouts: 7500 },
    { month: "Sep", expenses: 13000, payouts: 8000 },
    { month: "Oct", expenses: 13500, payouts: 8500 },
    { month: "Nov", expenses: 14000, payouts: 9000 },
    { month: "Dec", expenses: 14500, payouts: 9500 },
  ],
  occupancyData: [
    {
      month: "Jan",
      occupied: 32,
      available: 8,
      underMaintenance: 5,
      total: 45,
    },
    {
      month: "Feb",
      occupied: 34,
      available: 6,
      underMaintenance: 5,
      total: 45,
    },
    {
      month: "Mar",
      occupied: 35,
      available: 5,
      underMaintenance: 5,
      total: 45,
    },
    {
      month: "Apr",
      occupied: 36,
      available: 4,
      underMaintenance: 5,
      total: 45,
    },
    {
      month: "May",
      occupied: 37,
      available: 3,
      underMaintenance: 5,
      total: 45,
    },
    {
      month: "Jun",
      occupied: 38,
      available: 2,
      underMaintenance: 5,
      total: 45,
    },
  ],
  quickActions: [
    {
      title: "Add Property",
      description: "Register a new property",
      icon: "Building2",
      href: "/projects",
      color: "bg-blue-500",
    },
    {
      title: "Create Invoice",
      description: "Generate new invoice",
      icon: "FileText",
      href: "/finance/rentandinvoices/invoices",
      color: "bg-green-500",
    },
    {
      title: "Add Tenant",
      description: "Register new tenant",
      icon: "Users",
      href: "/clients/tenants",
      color: "bg-purple-500",
    },
    {
      title: "Record Expense",
      description: "Add new expense",
      icon: "Receipt",
      href: "/finance/expenses",
      color: "bg-orange-500",
    },
  ],
};
