"use server";

import { getServerSession } from 'next-auth';
import z from 'zod';

import {
    BlockFormData, RoomFormData,
} from '@/features/projects/profile/tabs/Components/schema/AddStructureSchema';
import {
    HouseArrayFormData,
} from '@/features/projects/profile/tabs/Components/schema/HouseArraySchema';
import {
    StructureApiResponse, StructureApiResponseSchema,
} from '@/features/projects/profile/tabs/Components/schema/projectStructureSchema';
import { RoomSchema } from '@/features/projects/profile/tabs/Components/schema/roomStructureView';
import {
    unitSchemaStructure,
} from '@/features/projects/profile/tabs/Components/schema/unitSchemaStructure';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;
export async function getProjectStructure(
  projectId: string
): Promise<StructureApiResponse> {
  // 1) Auth check
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  // 2) Fetch
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/tree`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    // server-side error
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  // 3) Parse JSON
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  // 4) Validate with Zod
  const parsed = StructureApiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  // 5) All good
  return parsed.data;
}

// create block Srtuctre
export async function createBlockStructure(
  data: BlockFormData,
  projectId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: [],
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/blocks/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
  return parsed.data;
}

// create house Srtuctre
export async function createHouseStructure(
  data: HouseArrayFormData,
  projectId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: [],
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/villas/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
  return parsed.data;
}

export async function createUnitStructure(
  data: z.infer<typeof unitSchemaStructure>,
  projectId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: "Authentication required",
      data: [],
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/apartment/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    // Try to get error message from response
    let errorMessage = "Failed to create apartment";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If parsing fails, use status text
      errorMessage = res.statusText || errorMessage;
    }

    return {
      error: true,
      message: errorMessage,
      data: [],
    };
  }
  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    return {
      error: true,
      message: "Invalid response format from server",
      data: {
        count: 0,
        results: [],
      },
    };
  }
  return parsed.data;
}

export async function createRoomStructure(
  data: RoomFormData,
  projectId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      message: "Authentication required",
      data: [],
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/rooms/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    // Try to get error message from response
    let errorMessage = "Failed to create apartment";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If parsing fails, use status text
      errorMessage = res.statusText || errorMessage;
    }

    return {
      error: true,
      message: errorMessage,
      data: [],
    };
  }

  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    return {
      error: true,
      message: "Invalid response format from server",
      data: {
        count: 0,
        results: [],
      },
    };
  }
  return parsed.data;
}

export async function createBasementStructure(
  data: { name: string; slots: number }[],
  projectId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: [],
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/basements/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
  return parsed.data;
}

export async function deleteNode(
  nodeId: string,
  type: "BLOCK" | "FLOOR" | "UNIT" | "ROOM" | "HOUSE" | "BASEMENT",
  projectId: string
): Promise<StructureApiResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/node/delete`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        id: nodeId,
        node_type: type,
      }),
    }
  );
  if (!res.ok) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }
  const responseData = await res.json();
  return responseData;
}

// Edit Block
export async function editBlockStructure(
  data: { name: string; floors: number },
  projectId: string,
  blockId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    throw new Error("Authentication required");
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/blocks/${blockId}/edit`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    // Try to get error message from response
    let errorMessage = "Failed to update block";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If parsing fails, use status text
      errorMessage = res.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const responseData = await res.json();
  const parsed = StructureApiResponseSchema.safeParse(responseData);
  if (!parsed.success) {
    throw new Error("Invalid response format from server");
  }
  return parsed.data;
}

// Edit House/Villa
export async function editHouseStructure(
  data: {
    name: string;
    floors: number;
    management_mode?: string;
    service_charge?: number;
  },
  projectId: string,
  villaId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    throw new Error("Authentication required");
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/houses/${villaId}/edit`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    // Try to get error message from response
    let errorMessage = "Failed to update house";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If we can't parse the error response, use the default message
    }
    throw new Error(errorMessage);
  }

  const responseData = await res.json();
  return responseData;
}

// Edit Unit/Apartment
export async function editUnitStructure(
  data: z.infer<typeof unitSchemaStructure>,
  projectId: string,
  apartmentId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: true, data: [] };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/apartment/${apartmentId}/edit`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    return { error: true, data: [] };
  }
  const responseData = await res.json();
  return responseData;
}

// Edit Room
export async function editRoomStructure(
  data: z.infer<typeof RoomSchema>,
  projectId: string,
  roomId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: true, data: [] };
  }
  const res = await fetch(
    `${API_BASE_URL}/projects/${projectId}/structure/rooms/${roomId}/edit`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    return { error: true, data: [] };
  }
  const responseData = await res.json();
  return responseData;
}

// Bulk Upload Structure from Excel
export async function bulkUploadStructure(
  data: Array<{
    block_house_name: string;
    floor: number;
    units: number | string;
  }>,
  projectId: string
): Promise<StructureApiResponse & { message?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return {
      error: true,
      data: {
        count: 0,
        results: [],
      },
    };
  }

  try {
    console.log('🚀 Frontend: Starting bulk upload');
    console.log('🚀 Frontend: Project ID:', projectId);
    console.log('🚀 Frontend: Project ID type:', typeof projectId);
    console.log('🚀 Frontend: Data to send:', data);
    console.log('🚀 Frontend: Data type:', typeof data);
    console.log('🚀 Frontend: Data length:', data.length);
    console.log('🚀 Frontend: JSON stringified:', JSON.stringify(data));
    
    const apiUrl = `${API_BASE_URL}/projects/${projectId}/structure/bulk-upload`;
    console.log('🚀 Frontend: Full API URL:', apiUrl);
    
    const res = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!res.ok) {
      // Try to get error message from response
      let errorMessage = "Failed to bulk upload structure";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If parsing fails, use status text
        errorMessage = res.statusText || errorMessage;
      }

      return {
        error: true,
        message: errorMessage,
        data: {
          count: 0,
          results: [],
        },
      };
    }

    const responseData = await res.json();
    const parsed = StructureApiResponseSchema.safeParse(responseData);
    if (!parsed.success) {
      return {
        error: true,
        message: "Invalid response format from server",
        data: {
          count: 0,
          results: [],
        },
      };
    }

    return parsed.data;
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Network error occurred",
      data: {
        count: 0,
        results: [],
      },
    };
  }
}
