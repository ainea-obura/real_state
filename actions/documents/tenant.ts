"use server"
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

export type TenantDocument = {
  id: string;
  template_title_snapshot: string;
  status: string;
  created_at: string;
  document_url: string;
  property_tenant: string;
  property_path: string;
};

export type FetchTenantDocumentsResponse = {
  count: number;
  results: TenantDocument[];
};

export const fetchTenantDocuments = async (userId: string): Promise<FetchTenantDocumentsResponse> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/documents/tenant-documents/?user_id=${userId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch tenant documents');
  }
  const data = await response.json();
  return data.data || { count: 0, results: [] };
};

export const updateTenantDocumentStatus = async (id: string, status: string): Promise<TenantDocument> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  const response = await fetch(`${API_BASE_URL}/documents/tenant-documents/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update document status');
  }
  const data = await response.json();
  return data;
};

export const uploadSignedDocument = async (agreementId: string, file: File): Promise<TenantDocument> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  const formData = new FormData();
  formData.append('agreement_id', agreementId);
  formData.append('signed_file', file);
  
  const response = await fetch(`${API_BASE_URL}/documents/tenant-documents/sign/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload signed document');
  }
  
  const data = await response.json();
  return data.data;
};
