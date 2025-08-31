"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

interface AgentPayoutsQueryParams {
  from_date?: string;
  to_date?: string;
  project_id?: string;
}

interface AgentPayoutsResponse {
  success: boolean;
  message: string;
  data: {
    kpis: {
      accruedUnpaid: number;
      approvedReady: number;
      paidPeriod: number;
      avgCommissionRate: number;
    };
    agentPayouts: Array<{
      id: string;
      agent: {
        name: string;
        phone: string;
        email: string;
      };
      projectName: string;
      propertyInfo: string;
      pending: number;
      paid: number;
      paidDate: string | null;
      expenses: number;
      netPending: number;
      netPaid: number;
    }>;
  };
}

export async function getAgentPayouts(
  params: AgentPayoutsQueryParams
): Promise<AgentPayoutsResponse> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      throw new Error("Authentication required");
    }

    const searchParams = new URLSearchParams();

    if (params.from_date) {
      searchParams.append("from_date", params.from_date);
    }

    if (params.to_date) {
      searchParams.append("to_date", params.to_date);
    }

    if (params.project_id) {
      searchParams.append("project_id", params.project_id);
    }

    const response = await fetch(
      `${
        process.env.API_BASE_URL
      }/sales/reports/agent-payouts/?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching agent payouts:", error);
    throw error;
  }
}
