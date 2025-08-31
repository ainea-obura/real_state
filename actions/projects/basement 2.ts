"use server";

import { getServerSession } from 'next-auth';
import { assignmentSchema, AssignmentPayload } from '@/features/projects/profile/tabs/Components/basement/assignmentSchema';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export type AssignSlotsPayload = {
  unit_id: string;
  slot_ids: string[];
};

export async function assignSlotToUnits({ unit_id, slot_ids }: AssignSlotsPayload) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: 'Authentication required',
      data: null,
    };
  }
  const res = await fetch(`${API_BASE_URL}/projects/basement/assign-slots-to-unit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ unit_id, slot_ids }),
  });
  let responseData: unknown;
  try {
    responseData = await res.json();
  } catch (e) {
    responseData = null;
  }
  return responseData;
}

// Fetch all slot assignments for a project
type SlotAssignmentSlot = {
  slot_id: string;
  slot_name: string;
  assigned_at: string;
};
export type SlotAssignmentGroup = {
  unit_id: string;
  unit_name: string;
  slots: SlotAssignmentSlot[];
};

export async function fetchSlotAssignments(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: 'Authentication required',
      data: null,
    };
  }
  const res = await fetch(`${API_BASE_URL}/projects/basement/list-slot-assignments?project_id=${projectId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  });
  let responseData: unknown;
  try {
    responseData = await res.json();
  } catch {
    return {
      error: true,
      message: 'Invalid response from server',
      data: null,
    };
  }
  if (!res.ok) {
    return {
      error: true,
      message: (responseData as any)?.message || 'Failed to fetch slot assignments',
      data: (responseData as any)?.data || null,
    };
  }
  return responseData;
}

export async function deleteSlotAssignment({ slot_id, unit_id }: { slot_id: string; unit_id: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: 'Authentication required',
      data: null,
    };
  }
  const res = await fetch(`${API_BASE_URL}/projects/basement/delete-slot-assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ slot_id, unit_id }),
  });
  let responseData: unknown;
  try {
    responseData = await res.json();
  } catch {
    return {
      error: true,
      message: 'Invalid response from server',
      data: null,
    };
  }
  if (!res.ok) {
    return {
      error: true,
      message: (responseData as any)?.message || 'Failed to delete slot assignment',
      data: (responseData as any)?.data || null,
    };
  }
  return responseData;
}

export async function deleteAllUnitAssignments({ unit_id }: { unit_id: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: 'Authentication required',
      data: null,
    };
  }
  const res = await fetch(`${API_BASE_URL}/projects/basement/delete-all-unit-assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ unit_id }),
  });
  let responseData: unknown;
  try {
    responseData = await res.json();
  } catch {
    return {
      error: true,
      message: 'Invalid response from server',
      data: null,
    };
  }
  if (!res.ok) {
    return {
      error: true,
      message: (responseData as any)?.message || 'Failed to delete all assignments',
      data: (responseData as any)?.data || null,
    };
  }
  return responseData;
}
