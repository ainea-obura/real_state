"use server";
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

import {
    CreateServiceAssignmentSchema, ProjectServiceCreate, ProjectServiceOverview,
    ProjectServiceOverviewSchema, ServiceAssignment, ServiceAssignmentListSchema,
} from './services-schemas';

const API_BASE_URL = process.env.API_BASE_URL;

// This function must only be called from the server (e.g., in server actions, getServerSideProps, or API routes).
export const getProjectServiceOverview = async (
  projectId: string
): Promise<ProjectServiceOverview> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/project-services/${projectId}/service-overview`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch project service overview");
  const data = await response.json();
  if (data.isError) throw new Error(data.message || "API error");
  if (!data.data) {
    throw new Error("API response missing 'data' field: " + JSON.stringify(data));
  }
  return ProjectServiceOverviewSchema.parse(data.data);
};

export const createProjectServiceAssignment = async (
  projectId: string,
  payload: ProjectServiceCreate
): Promise<ServiceAssignment[]> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  // Validate payload before sending
  const validatedPayload = CreateServiceAssignmentSchema.parse(payload);
  const response = await fetch(
    `${API_BASE_URL}/project-services/${projectId}/services/create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedPayload),
    }
  );
  // if (!response.ok) throw new Error("Failed to create service assignment");
  const data = await response.json();
  if (data.isError) throw new Error(data.message || "API error");
  if (!data.data) {
    throw new Error("API response missing 'data' field: " + JSON.stringify(data));
  }
  return ServiceAssignmentListSchema.parse(data.data);
};

export const deleteProjectServiceAssignment = async (
  projectId: string,
  assignmentId: string
): Promise<boolean> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(
    `${API_BASE_URL}/project-services/${projectId}/services/${assignmentId}/delete`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error("Failed to delete service assignment");
  const data = await response.json();
  if (data.isError) throw new Error(data.message || "API error");
  return true;
};
