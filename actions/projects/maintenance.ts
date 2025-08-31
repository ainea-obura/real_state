"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaintenanceRequest, MaintenanceRequestList } from "@/features/projects/profile/tabs/Components/maintenance/schema";

const API_BASE_URL = process.env.API_BASE_URL;

// List maintenance requests (with optional project_id, pagination)
export async function getMaintenanceList(params: { project_id?: string; page?: number; page_size?: number } = {}): Promise<MaintenanceRequestList> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const searchParams = new URLSearchParams();
  if (params.project_id) searchParams.set("project_id", params.project_id);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.page_size) searchParams.set("page_size", params.page_size.toString());
  const res = await fetch(`${API_BASE_URL}/projects/maintenance?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch maintenance list");
  return res.json();
}

// Get maintenance stats
export async function getMaintenanceStats(params: { project_id?: string } = {}): Promise<any> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const searchParams = new URLSearchParams();
  if (params.project_id) searchParams.set("project_id", params.project_id);
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/stats?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch maintenance stats");
  return res.json();
}

// Create maintenance request
export async function createMaintenanceRequest(data: Omit<MaintenanceRequest, "id" | "created_by" | "created_at">): Promise<MaintenanceRequest> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const response = await res.json();
  
  if (!res.ok) throw new Error(response.message ||"Failed to create maintenance request");
  return response;
}

// Get maintenance request detail
export async function getMaintenanceDetail(id: string): Promise<MaintenanceRequest> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch maintenance detail");
  return res.json();
}

// Update maintenance request
export async function updateMaintenanceRequest(id: string, data: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/${id}/update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update maintenance request");
  return res.json();
}

// Delete maintenance request (soft delete)
export async function deleteMaintenanceRequest(id: string): Promise<void> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/${id}/delete`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete maintenance request");
}

// Update maintenance status
export async function updateMaintenanceStatus(id: string, status: "open" | "in_progress" | "resolved" | "closed"): Promise<MaintenanceRequest> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const res = await fetch(`${API_BASE_URL}/projects/maintenance/${id}/status/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update maintenance status");
  return res.json();
}
