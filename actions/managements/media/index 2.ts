"use server";

import { getServerSession } from 'next-auth';

import {
    MediaProjectsResponseSchema, MediaReadAllResponseSchema,
} from '@/features/management/media/schema';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export interface FetchMediaProjectsParams {
  q: string;
}

export const fetchMediaProjects = async (
  params: FetchMediaProjectsParams = {
    q: "",
  }
) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);

  const response = await fetch(
    `${API_BASE_URL}/projects/media/search-projects?${searchParams.toString()}`,
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
    return { error: true, message: data?.message || "Failed to fetch project list" };
  }
  try {
    return MediaProjectsResponseSchema.parse(data);
  } catch {
    return { error: true, message: "Failed to parse project list response" };
  }
};

export const fetchMediaForProject = async () => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/projects/media/`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to fetch media list" };
  }
  try {
    return MediaReadAllResponseSchema.parse(data);
  } catch {
    return { error: true, message: "Failed to parse media list response" };
  }
};

export const deleteMedia = async (id: string) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const response = await fetch(`${API_BASE_URL}/projects/media/${id}/delete/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  return data;
};

export interface CreateMediaPayload {
  project: string;
  files: File[];
  block?: string;
  unit?: string;
  house?: string;
}

export const createMedia = async (payload: CreateMediaPayload) => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const formData = new FormData();
  formData.append("project", payload.project);
  if (payload.block) formData.append("block", payload.block);
  if (payload.unit) formData.append("unit", payload.unit);
  if (payload.house) formData.append("house", payload.house);
  payload.files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE_URL}/projects/media/upload/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // 'Content-Type' is NOT set here; browser will set it for FormData
      Accept: "application/json",
    },
    body: formData,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }
  if (!response.ok) {
    return { error: true, message: data?.message || "Failed to create media" };
  }
  return data;
};
