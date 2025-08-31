"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// API 1: Get all groups
export async function getGroupsAction() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/roles/groups`, {
      method: "GET",
      headers,
    });

    if (!res.ok) throw new Error("Failed to fetch groups");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while fetching groups: ${error}`,
    };
  }
}

// API 2: Get permissions for a specific group
export async function getGroupPermissionsAction(groupId: number) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/roles/groups/${groupId}/permissions`,
      {
        method: "GET",
        headers,
      }
    );

    if (!res.ok) throw new Error("Failed to fetch group permissions");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while fetching group permissions: ${error}`,
    };
  }
}

// Create a new group
export async function createGroupAction(groupData: {
  name: string;
  description?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/roles/groups/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(groupData),
    });

    if (!res.ok) throw new Error("Failed to create group");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while creating group: ${error}`,
    };
  }
}

// Update group permissions
export async function updateGroupPermissionsAction(
  groupId: number,
  permissionIds: number[]
) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/roles/groups/update-permissions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          group_id: groupId,
          permission_ids: permissionIds,
        }),
      }
    );

    if (!res.ok) throw new Error("Failed to update group permissions");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while updating group permissions: ${error}`,
    };
  }
}

// Assign roles and permissions to a user
export async function assignUserRolesAction(
  userId: string,
  groupsToAdd: number[],
  groupsToRemove: number[],
  permissionsToAdd: number[],
  permissionsToRemove: number[]
) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/roles/users/${userId}/assign`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          groups_to_add: groupsToAdd,
          groups_to_remove: groupsToRemove,
          permissions_to_add: permissionsToAdd,
          permissions_to_remove: permissionsToRemove,
        }),
      }
    );

    if (!res.ok) throw new Error("Failed to assign roles to user");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while assigning roles: ${error}`,
    };
  }
}

// Get all available permissions
export async function getAllPermissionsAction() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/roles/permissions`, {
      method: "GET",
      headers,
    });

    if (!res.ok) throw new Error("Failed to fetch permissions");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while fetching permissions: ${error}`,
    };
  }
}

// Delete a group (if needed)
export async function deleteGroupAction(groupId: number) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/roles/groups/${groupId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    if (!res.ok) throw new Error("Failed to delete group");
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while deleting group: ${error}`,
    };
  }
}
