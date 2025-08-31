"use server";

import { getServerSession } from "next-auth";
import { RentListResponseSchema } from "@/features/management/rent/schema";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export interface FetchRentListParams {
  project?: string;
  block?: string;
  from?: string;
  to?: string;
}

export const fetchRentList = async (
  params: FetchRentListParams = {}
) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.project) searchParams.set("project", params.project);
  if (params.block) searchParams.set("block", params.block);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  const response = await fetch(
    `${API_BASE_URL}/projects/rent/list?${searchParams.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to fetch rent list" };
  }
  try {
    return RentListResponseSchema.parse(data);
  } catch {
    return { error: true, message: "Failed to parse rent list response" };
  }
};
