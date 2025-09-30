import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface SalesSummaryData {
  period: {
    from: string;
    to: string;
  };
  apartment_status: {
    total_units: number;
    available: number;
    sold: number;
    booked: number;
    deposit_paid: number;
    occupancy_rate: string;
  };
  financial_summary: {
    total_sales_value: string;
    total_down_payments: string;
    outstanding_amount: string;
    sales_count: number;
    reservations_count: number;
  };
  sales_by_status: Array<{
    status: string;
    count: number;
  }>;
  recent_activity: {
    sales_this_period: number;
    reservations_this_period: number;
    units_sold_this_period: number;
  };
}

export interface SalesFinancialData {
  period: {
    from: string;
    to: string;
  };
  revenue: {
    total_sales_value: string;
    down_payments_received: string;
    outstanding_revenue: string;
    collection_rate: string;
  };
  monthly_trends: Array<{
    month: string;
    sales_count: number;
    total_value: number;
  }>;
  top_performing_units: Array<{
    property_node__name: string;
    property_node__unit_detail__unit_type: string;
    sales_count: number;
    total_value: number;
  }>;
  summary: {
    total_transactions: number;
    average_sale_value: string;
    total_units_sold: number;
  };
}

export const fetchSalesSummaryReport = async (dateRange?: { from: Date; to?: Date }): Promise<SalesSummaryData> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/sales/reports/sales-summary/${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch sales summary report: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to fetch sales summary report");
  }

  return data.data;
};

export const fetchSalesFinancialReport = async (dateRange?: { from: Date; to?: Date }): Promise<SalesFinancialData> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required");
  }

  const params = new URLSearchParams();
  if (dateRange?.from) {
    params.append("date_from", dateRange.from.toISOString().split("T")[0]);
  }
  if (dateRange?.to) {
    params.append("date_to", dateRange.to.toISOString().split("T")[0]);
  }

  const url = `${API_BASE_URL}/sales/reports/sales-financial/${params.toString() ? `?${params.toString()}` : ""}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch sales financial report: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.message || "Failed to fetch sales financial report");
  }

  return data.data;
};
