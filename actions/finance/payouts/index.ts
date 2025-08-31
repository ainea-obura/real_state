"use server";

import { getServerSession } from "next-auth";

import {
  PayoutApiResponse,
  PayoutApiResponseSchema,
} from "@/features/finance/rendandInvoices/payouts/schema";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export const fetchPayouts = async ({
  date_from,
  date_to,
}: {
  date_from: string;
  date_to: string;
}): Promise<PayoutApiResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/finance/payouts/?date_from=${date_from}&date_to=${date_to}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch payouts");
  }

  const data = await response.json();

  // Validate the response against the schema
  const validatedData = PayoutApiResponseSchema.parse(data);

  return validatedData;
};

export async function approvePayout({
  payout_id,
  payment_method,
  account,
  amount,
  reference,
  tab,
  paybill_number,
  paybill_option,
}: {
  payout_id: string;
  payment_method: string;
  account: string;
  amount: number;
  reference: string;
  tab: string;
  paybill_number?: string;
  paybill_option?: string;
}) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(
    `${API_BASE_URL}/finance/payouts/${payout_id}/`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        payment_method,
        account,
        amount,
        reference,
        tab,
        paybill_number,
        paybill_option,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to approve payout",
      data: null,
    };
  }

  return {
    error: false,
    message: data.message || "Payout approved successfully",
    data,
  };
};
