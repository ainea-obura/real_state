"use server";

import { getServerSession } from 'next-auth';
import { z } from 'zod';

import {
    DocumentCreateApiResponse, DocumentCreateApiResponseSchema, DocumentsApiResponse,
    DocumentsApiResponseSchema,
} from '@/features/management/documents/schema/documentsApiSchemas';
import { DocumentVariablesApiResponse } from '@/features/management/documents/schema/variables';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

// Zod schema for runtime validation (variables)
const DocumentVariableSchema = z.object({
  variable_name: z.string(),
  display_name: z.string(),
  category: z.string(),
  data_type: z.string(),
  is_required: z.boolean(),
  description: z.string(),
});
const DocumentVariablesDataSchema = z.object({
  count: z.number(),
  results: z.array(DocumentVariableSchema),
});
const DocumentVariablesApiResponseSchema = z.object({
  error: z.boolean(),
  message: z.string(),
  data: DocumentVariablesDataSchema,
});

export const fetchDocumentsVaraible =
  async (documentType?: string): Promise<DocumentVariablesApiResponse> => {
    try {
      const session = await getServerSession(authOptions);
      const token = session?.accessToken;
      
      // Build URL with optional document type filter
      let url = `${API_BASE_URL}/documents/variables/`;
      if (documentType) {
        url += `?document_type=${documentType}`;
      }
      
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: true,
          message: errorData.message || "Failed to fetch document variables",
          data: { count: 0, results: [] }
        };
      }
      
      const data = await response.json();
      // Validate shape at runtime
      const parsed = DocumentVariablesApiResponseSchema.parse(data);
      return parsed;
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Failed to fetch document variables",
        data: { count: 0, results: [] }
      };
    }
  };

export const fetchDocuments = async (): Promise<DocumentsApiResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: true,
        message: errorData.message || "Failed to fetch documents",
        data: { count: 0, results: [] }
      };
    }
    
    const data = await response.json();
    // Validate shape at runtime
    const parsed = DocumentsApiResponseSchema.parse(data);
    return parsed;
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch documents",
      data: { count: 0, results: [] }
    };
  }
};

export const createDocument = async (payload: {
  template_title: string;
  template_description?: string;
  template_type: string;
  template_content: string;
  available_variables: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
}): Promise<DocumentCreateApiResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(`${API_BASE_URL}/documents/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: true,
        message: errorData.message || "Failed to create document",
        data: null
      };
    }
    
    const data = await response.json();
    // Validate shape at runtime
    const parsed = DocumentCreateApiResponseSchema.parse(data);
    return parsed;
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to create document",
      data: null
    };
  }
};

export const deleteDocument = async (payload: {
  document_id: string;
}): Promise<DocumentCreateApiResponse> => {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken;
    const response = await fetch(
      `${API_BASE_URL}/documents/templates/${payload.document_id}/delete/`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: true,
        message: errorData.message || "Failed to delete document",
        data: null
      };
    }
    
    const data = await response.json();
    // Validate shape at runtime
    if (data.error) {
      return {
        error: true,
        message: data.message || "Failed to delete document",
        data: null
      };
    }
    return data;
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete document",
      data: null
    };
  }
};
