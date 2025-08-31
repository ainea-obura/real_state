import { AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
    getKYCCompanyDocuments, updateKYCDocument, uploadIndividualKYCDocument, uploadKYCDocuments,
} from '@/actions/company/kyc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types from the KYC action
interface KYCDocument {
  id: string;
  company: string;
  kyc_submission?: string;
  document_type: string;
  document_type_display: string;
  document_file: string;
  file_name: string;
  file_size: number;
  file_size_mb: number;
  file_type: string;
  status: string;
  status_display: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejected_by_name?: string;
  resubmitted_at?: string;
  previous_version?: string;
  created_at: string;
  updated_at: string;
  // Director fields
  is_director_document: boolean;
  director_number?: number;
  director_document_type?: string;
  display_name?: string;
}

interface KYCCompanyDocuments {
  id: string;
  name: string;
  submission_status: string;
  submission_status_display: string;
  submission_created_at?: string;
  submission_updated_at?: string;
  documents_count: number;
  required_documents_count: number;
  approved_documents_count: number;
  rejected_documents_count: number;
  pending_documents_count: number;
  under_review_documents_count: number;
  is_complete: boolean;
  // Company KYC documents
  cr12_document?: KYCDocument;
  proof_of_address_document?: KYCDocument;
  board_resolution_document?: KYCDocument;
  kra_pin_document?: KYCDocument;
  certificate_of_incorporation_document?: KYCDocument;
  bank_confirmation_letter_document?: KYCDocument;
  tax_compliance_certificate_document?: KYCDocument;
  // Director KYC documents - dynamic array structure
  directors: Array<{
    director_number: number;
    id_card_front?: KYCDocument;
    id_card_back?: KYCDocument;
    kra_pin?: KYCDocument;
    documents: KYCDocument[];
  }>;
  // All KYC documents as a flat list
  all_documents: KYCDocument[];
}

export function useKYCCompanyDocuments(companyId: string) {
  return useQuery({
    queryKey: ["kyc", "company", companyId],
    queryFn: async (): Promise<KYCCompanyDocuments> => {
      const response = await getKYCCompanyDocuments(companyId);
      if (response.isError) {
        throw new Error(response.message || "Failed to fetch KYC documents");
      }
      return response.data!;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useKYCUpload(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData): Promise<KYCCompanyDocuments> => {
      const response = await uploadKYCDocuments(companyId, formData);
      if (response.isError) {
        throw new Error(response.message || "Failed to upload KYC documents");
      }
      return response.data!;
    },
    onSuccess: () => {
      // Invalidate and refetch KYC data
      queryClient.invalidateQueries({
        queryKey: ["kyc", "company", companyId],
      });

      toast.success("KYC documents uploaded successfully!", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCircle size={20} className="text-white" />,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload KYC documents", {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });
}

export function useKYCDocumentUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      file,
    }: {
      documentId: string;
      file: File;
    }): Promise<KYCDocument> => {
      const formData = new FormData();
      formData.append("document_file", file);

      const response = await updateKYCDocument(documentId, formData);
      if (response.isError) {
        throw new Error(response.message || "Failed to update KYC document");
      }
      return response.data!;
    },
    onSuccess: (updatedDocument) => {
      // Invalidate all KYC queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: ["kyc"],
      });

      toast.success("Document updated successfully!", {
        className: "bg-green-600 text-white rounded-lg shadow-lg",
        icon: <CheckCircle size={20} className="text-white" />,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update document", {
        className: "bg-red-600 text-white rounded-lg shadow-lg",
        icon: <AlertTriangle size={20} className="text-white" />,
      });
    },
  });
}

// Helper function to prepare form data for KYC upload
export function prepareKYCFormData(data: Record<string, File>): FormData {
  const formData = new FormData();

  // Map frontend field names to backend expected field names
  const fieldMapping = {
    cr12: "cr12",
    proofOfAddress: "proof_of_address",
    boardResolution: "board_resolution",
    kraPin: "kra_pin",
    certificateOfIncorporation: "certificate_of_incorporation",
    bankConfirmationLetter: "bank_confirmation_letter",
    taxComplianceCertificate: "tax_compliance_certificate",
  };

  console.log("🔍 Preparing form data from:", data);

  Object.entries(data).forEach(([key, file]) => {
    console.log(`🔍 Processing ${key}:`, file);

    // Additional validation to ensure only valid files are sent
    if (
      file &&
      file instanceof File &&
      file.size > 0 &&
      file.name &&
      file.name.trim() !== ""
    ) {
      const backendFieldName = fieldMapping[key as keyof typeof fieldMapping];
      if (backendFieldName) {
        formData.append(backendFieldName, file);
        console.log(
          `✅ Added to FormData: ${backendFieldName} = ${file.name} (${file.size} bytes)`
        );
      } else {
        console.log(`❌ No mapping found for: ${key}`);
      }
    } else {
      console.log(`❌ Skipped invalid file for ${key}:`, file);
    }
  });

  console.log(
    "📦 FormData entries:",
    Array.from(formData.entries()).map(
      ([key, value]) => `${key}: ${value instanceof File ? value.name : value}`
    )
  );

  return formData;
}
