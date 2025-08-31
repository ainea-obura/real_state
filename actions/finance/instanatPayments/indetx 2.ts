"use server";

const API_BASE_URL = process.env.API_BASE_URL;

// --- Action: fetchInstantPaymentNotifications ---
export interface FetchInstantPaymentNotificationsParams {
  search_query?: string;
}

export interface InstantPaymentNotification {
  id: string;
  created_at: string;
  updated_at: string;
  merchant_code: string;
  business_short_code: string;
  invoice_number: string;
  payment_method: string;
  trans_id: string;
  third_party_trans_id: string;
  full_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  transaction_type: string;
  msisdn: string;
  org_account_balance: string;
  trans_amount: string;
  trans_time: string;
  bill_ref_number: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_for: string | null;
  verified_for_invoice: string | null;
}

export const fetchInstantPaymentNotifications = async (
  params: FetchInstantPaymentNotificationsParams = {}
): Promise<{
  error: boolean;
  message?: string;
  data?: InstantPaymentNotification[];
}> => {
  const searchParams = new URLSearchParams();
  if (params.search_query) {
    searchParams.set("search_query", params.search_query);
  }

  const response = await fetch(
    `${API_BASE_URL}/finance/instant-payment-notification/instant-payment-notification/?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return {
      error: data.error || false,
      message: data.message || "Failed to fetch instant payment notifications",
    };
  }

  return {
    error: false,
    data,
  };
};
