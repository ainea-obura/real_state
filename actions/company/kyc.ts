"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL;

interface KYCDocument {
  id: string;
  document_type: string;
  document_type_display: string;
  document_file: string;
  file_name: string;
  file_size: number;
  file_size_mb: number;
  file_type: string;
  status: string;
  status_display: string;
  reviewed_by?: {
    id: string;
    name: string;
  };
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface KYCCompanyDocuments {
  id: string;
  name: string;
  // Submission details
  submission_status: string;
  submission_status_display: string;
  submission_created_at: string;
  submission_updated_at: string;
  // Document counts
  documents_count: number;
  required_documents_count: number;
  approved_documents_count: number;
  rejected_documents_count: number;
  pending_documents_count: number;
  under_review_documents_count: number;
  is_complete: boolean;
  // Individual documents
  cr12_document?: KYCDocument;
  proof_of_address_document?: KYCDocument;
  board_resolution_document?: KYCDocument;
  kra_pin_document?: KYCDocument;
  certificate_of_incorporation_document?: KYCDocument;
  bank_confirmation_letter_document?: KYCDocument;
  tax_compliance_certificate_document?: KYCDocument;
}

interface ApiResponse<T = undefined> {
  isError: boolean;
  message?: string;
  data?: T;
  details?: string;
  actionRequired?: string;
  redirectUrl?: string;
}

export async function uploadKYCDocuments(
  companyId: string,
  formData: FormData
): Promise<ApiResponse<KYCCompanyDocuments>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    // Submit directly to SasaPay (no MinIO storage)
    console.log("Uploading KYC documents to:", `${API_BASE_URL}/documents/kyc/companies/${companyId}/upload/`);
    console.log("FormData entries:", Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `${value.name} (${value.size} bytes)` : value]));
    
    const response = await fetch(
      `${API_BASE_URL}/documents/kyc/companies/${companyId}/upload/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formData,
      }
    );

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", text);
      return {
        isError: true,
        message: `Server returned ${response.status}: ${response.statusText}. Expected JSON but got ${contentType}`,
      };
    }

    const result = await response.json();

    if (!response.ok) {
      // Check if business onboarding is required
      if (result.action_required === "business_onboarding") {
        return {
          isError: true,
          message: result.message,
          details: result.details,
          actionRequired: "business_onboarding",
          redirectUrl: result.redirect_url,
        };
      }
      
      return {
        isError: true,
        message: result.message || `Failed to upload KYC documents (${response.status})`,
        details: result.details,
      };
    }

    return {
      isError: false,
      message: "KYC documents uploaded successfully",
      data: result.data,
    };
  } catch (error) {
    return {
      isError: true,
      message: error instanceof Error ? error.message : "Failed to upload KYC documents",
    };
  }
}
// Upload KYC documents for a company (all documents at once)
// export async function uploadKYCDocuments(
//   companyId: string,
//   formData: FormData
// ): Promise<ApiResponse<KYCCompanyDocuments>> {
//   try {
//     // Get session and token
//     const session = await getServerSession(authOptions);
//     if (!session?.accessToken) {
//       return {
//         isError: true,
//         message: "Authentication required",
//       };
//     }

//     // The backend expects these specific field names for the 7 KYC documents
//     // formData should contain: cr12, proof_of_address, board_resolution, kra_pin,
//     // certificate_of_incorporation, bank_confirmation_letter, tax_compliance_certificate

//     const response = await fetch(
//       `${API_BASE_URL}/documents/kyc/companies/${companyId}/upload/`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${session.accessToken}`,
//         },
//         body: formData,
//       }
//     );

//     const result = await response.json();

//     if (!response.ok) {
//       return {
//         isError: true,
//         message: result.message || "Failed to upload KYC documents",
//       };
//     }

//     // Revalidate the company data
//     revalidatePath("/", "layout");

//     return {
//       isError: false,
//       message: "KYC documents uploaded successfully",
//       data: result.data,
//     };
//   } catch (error) {
//     return {
//       isError: true,
//       message:
//         error instanceof Error
//           ? error.message
//           : "Failed to upload KYC documents",
//     };
//   }
// }

// Upload individual KYC document
export async function uploadIndividualKYCDocument(
  companyId: string,
  documentType: string,
  file: File
): Promise<ApiResponse<KYCCompanyDocuments>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    // Create FormData for individual document upload
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("document_file", file);

    const response = await fetch(
      `${API_BASE_URL}/documents/kyc/companies/${companyId}/upload-individual/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to upload KYC document",
      };
    }

    // Revalidate the company data
    revalidatePath("/", "layout");

    return {
      isError: false,
      message: "KYC document uploaded successfully",
      data: result.data,
    };
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload KYC document",
    };
  }
}

// Update a single KYC document
export async function updateKYCDocument(
  documentId: string,
  formData: FormData
): Promise<ApiResponse<KYCDocument>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/documents/kyc/documents/${documentId}/update/`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to update KYC document",
      };
    }

    // Revalidate the company data
    revalidatePath("/", "layout");

    return {
      isError: false,
      message: "KYC document updated successfully",
      data: result.data,
    };
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update KYC document",
    };
  }
}

// Get KYC documents for a company with submission details
export async function getKYCCompanyDocuments(
  companyId: string
): Promise<ApiResponse<KYCCompanyDocuments>> {
  try {
    // Get session and token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return {
        isError: true,
        message: "Authentication required",
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/documents/kyc/companies/${companyId}/documents/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        isError: true,
        message: result.message || "Failed to fetch KYC documents",
      };
    }

    return {
      isError: false,
      data: result.data,
    };
  } catch (error) {
    return {
      isError: true,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch KYC documents",
    };
  }
}
