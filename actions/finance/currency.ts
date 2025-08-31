"use server";

import { getServerSession } from "next-auth";
import {
  CurrencySchema,
  CurrencyStatsSchema,
} from "@/features/finance/rendandInvoices/currency/schema/schemas";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { error } from "console";

const API_BASE_URL = process.env.API_BASE_URL;

export interface CreateCurrencyPayload {
  name: string;
  code: string;
  symbol: string;
  decimal_places: number;
}

export const createCurrency = async (
  payload: CreateCurrencyPayload
): Promise<any> => {
  // Validate payload with Zod schema (convert camelCase to snake_case for API)
  const parsed = CurrencySchema.omit({
    id: true,
    isDefault: true,
    usageCount: true,
  }).parse({
    ...payload,
    decimalPlaces: payload.decimal_places, // for zod validation
  });

  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/finance/currency/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: parsed.name,
      code: parsed.code,
      symbol: parsed.symbol,
      decimal_places: parsed.decimalPlaces,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to create currency",
    };
  }
  return {
    error: data.error,
    data: data,
  };
};

export const fetchCurrencyStats = async (): Promise<
  z.infer<typeof CurrencyStatsSchema>
> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/finance/currency/stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch currency stats");
  const data = await response.json();
  const stats = data.data || data;

  // Map snake_case to camelCase
  const mapped = {
    totalCurrencies: stats.total_currencies,
    defaultCurrency: stats.default_currency,
    mostUsedCurrency: stats.most_used_currency,
    mostUsedCount: stats.most_used_count,
  };

  return CurrencyStatsSchema.parse(mapped);
};

export interface FetchCurrencyTableParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const fetchCurrencyTable = async (
  params: FetchCurrencyTableParams = {}
): Promise<z.infer<typeof CurrencySchema>[]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize)
    searchParams.set("page_size", params.pageSize.toString());
  if (params.search) searchParams.set("search", params.search);

  const response = await fetch(
    `${API_BASE_URL}/finance/currency?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch currency table");
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.data)
    throw new Error("Invalid response from currency table API");

  if (Array.isArray(data.data.results)) {
    data.data.results = data.data.results.map((item: any) => ({
      ...item,
      decimalPlaces: item.decimal_places,
      isDefault: item.default,
    }));
  }
  return data.data;
};

export const fetchCurrencyById = async (
  id: string
): Promise<z.infer<typeof CurrencySchema>> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/finance/currency/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch currency");
  const data = await response.json();
  const c = data.data || data;
  // Map snake_case to camelCase
  return CurrencySchema.parse({
    ...c,
    decimalPlaces: c.decimal_places,
    isDefault: c.default,
  });
};

export interface UpdateCurrencyPayload {
  name: string;
  code: string;
  symbol: string;
  decimalPlaces: number;
}

export const updateCurrency = async (
  id: string,
  payload: UpdateCurrencyPayload
): Promise<any> => {
  try {
    // Validate payload with Zod schema
    const parsed = CurrencySchema.omit({
      id: true,
      isDefault: true,
      usageCount: true,
    }).parse({
      ...payload,
    });
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/finance/currency/${id}/update`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: parsed.name,
          code: parsed.code,
          symbol: parsed.symbol,
          decimal_places: parsed.decimalPlaces,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Failed to update currency",
      };
    }
    return {
      error: false,
      data: data.data || data,
    };
  } catch (error: any) {
    return {
      error: true,
      message: error?.message || "Failed to update currency",
    };
  }
};

export const deleteCurrency = async (id: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/finance/currency/${id}/delete`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to delete currency",
    };
  }
  return {
    error: data.error,
    data: data,
  };
};

export const setDefaultCurrency = async (id: string): Promise<any> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/finance/currency/${id}/set-default`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return {
      error: true,
      message: data.message || "Failed to set default currency",
    };
  }
  return {
    error: data.error,
    data: data,
  };
};
