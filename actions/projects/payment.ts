"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentReportSchema, PaymentReport } from "./paymentSchema";

const API_BASE_URL = process.env.API_BASE_URL;

export async function fetchPaymentReport({
  projectId,
  from,
  to,
}: {
  projectId: string;
  from?: string;
  to?: string;
}): Promise<PaymentReport> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const response = await fetch(
    `${API_BASE_URL}/projects/payments/${projectId}/payment-report?${params.toString()}`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch payment report");
  }
  return PaymentReportSchema.parse(data);
} 