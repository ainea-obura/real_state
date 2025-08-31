"use server";

import { getServerSession } from "next-auth";
import { ServiceCardListResponseSchema } from "@/features/management/services/schema";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

export interface FetchServiceCardListParams {
  project?: string;
  block?: string;
}

export const fetchServiceCardList = async (
  params: FetchServiceCardListParams = {}
) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.project) searchParams.set("project", params.project);
  if (params.block) searchParams.set("block", params.block);

  const response = await fetch(
    `${API_BASE_URL}/projects/services/list?${searchParams.toString()}`,
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
    return { error: true, message: data?.message || "Failed to fetch service card list" };
  }
  try {
    return ServiceCardListResponseSchema.parse(data);
  } catch {
    return { error: true, message: "Failed to parse service card list response" };
  }
};
