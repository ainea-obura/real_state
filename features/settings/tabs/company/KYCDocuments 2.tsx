"use client";

import {
    AlertCircle, AlertTriangle, Building2, CheckCircle, Clock, Edit3, FileText, Shield, Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
    confirmBusinessOnboardingOTP, getBusinessOnboarding, submitKYCToSasaPay,
} from '@/actions/settings/bussinesOnBoading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';

import BusinessOnboardingModal from './BusinessOnboardingModal';
import { useKYCCompanyDocuments, useKYCDocumentUpdate } from './useKYC';

// Add ClockIcon alias
const ClockIcon = Clock;

// KYC Document Status Component
const KYCDocumentStatus = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          label: "Approved",
        };
      case "rejected":
        return {
          icon: AlertTriangle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "Rejected",
        };
      case "pending":
        return {
          icon: ClockIcon,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          label: "Pending Review",
        };
      case "under_review":
        return {
          icon: ClockIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          label: "Under Review",
        };
      case "submitted":
        return {
          icon: CheckCircle,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          label: "Submitted",
        };
      case "partially_approved":
        return {
          icon: CheckCircle,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          label: "Partially Approved",
        };
      case "draft":
        return {
          icon: FileText,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: "Draft",
        };
      default:
        return {
          icon: Upload,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          label: "Not Uploaded",
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}
    >
      <IconComponent className={`w-4 h-4 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
};

// KYC Document Card Component
const KYCDocumentCard = ({
  document,
  title,
  description,
  onUpdate,
  isDirectorDocument,
  directorNumber,
  directorDocumentType,
}: {
  document?: {
    id: string;
    status: string;
    file_name: string;
    file_size: number;
    file_type: string;
    created_at: string;
    review_notes?: string;
    rejection_reason?: string;
  };
  title: string;
  description: string;
  onUpdate?: (
    documentId: string,
    file: File,
    documentTitle: string
  ) => Promise<void>;
  isDirectorDocument?: boolean;
  directorNumber?: number;
  directorDocumentType?: string;
}) => {
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileUpdate = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && document && onUpdate) {
      try {
        await onUpdate(document.id, file, title);
      } catch {
        toast.error("Failed to update document");
      }
    }
  };

  if (!document) {
    return (
      <div className="bg-gray-50/50 p-4 border-2 border-gray-200 border-dashed rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 rounded-lg w-10 h-10">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
            <p className="text-gray-500 text-xs">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white hover:shadow-md p-4 border border-gray-200 rounded-lg transition-shadow duration-200">
      <div className="flex items-start gap-3">
        <div className="flex flex-shrink-0 justify-center items-center bg-blue-50 rounded-lg w-10 h-10">
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">
                {title}
              </h4>
              <p className="mt-0.5 text-gray-500 text-xs">{description}</p>

              {/* Director Badge */}
              {isDirectorDocument && directorNumber && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="inline-flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full font-medium text-purple-800 text-xs">
                    <span className="bg-purple-500 rounded-full w-2 h-2"></span>
                    Director {directorNumber}
                  </div>
                  {directorDocumentType && (
                    <div className="inline-flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full font-medium text-blue-800 text-xs">
                      {directorDocumentType
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                  )}
                </div>
              )}
            </div>
            {onUpdate && (
              <div className="flex-shrink-0">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpdate}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded font-medium text-blue-600 hover:text-blue-700 text-xs transition-colors duration-200">
                    <Edit3 className="w-3 h-3" />
                    Update
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <span className="flex-shrink-0 font-medium">File:</span>
              <span className="truncate">{document.file_name}</span>
            </div>
            <div className="flex items-center gap-4 text-gray-500 text-xs">
              <span className="flex-shrink-0">
                Size: {formatFileSize(document.file_size)}
              </span>
              <span className="flex-shrink-0">Type: {document.file_type}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <ClockIcon className="flex-shrink-0 w-3 h-3" />
              <span>Uploaded: {formatDate(document.created_at)}</span>
            </div>

            {/* Status-specific information */}
            {document.status === "approved" && (
              <div className="bg-green-50 mt-2 p-2 rounded text-green-700 text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="flex-shrink-0 w-3 h-3" />
                  <span className="font-medium">Document Approved</span>
                </div>
                {document.review_notes && (
                  <span>Notes: {document.review_notes}</span>
                )}
              </div>
            )}

            {document.status === "rejected" && (
              <div className="bg-red-50 mt-2 p-2 rounded text-red-700 text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="flex-shrink-0 w-3 h-3" />
                  <span className="font-medium">Document Rejected</span>
                </div>
                {document.rejection_reason && (
                  <span>Reason: {document.rejection_reason}</span>
                )}
                <div className="mt-2 text-xs">
                  <span className="font-medium">Action Required:</span> Please
                  update the document to address the rejection reason.
                </div>
              </div>
            )}

            {document.status === "pending" && (
              <div className="bg-yellow-50 mt-2 p-2 rounded text-yellow-700 text-xs">
                <div className="flex items-center gap-1">
                  <ClockIcon className="flex-shrink-0 w-3 h-3" />
                  <span className="font-medium">Awaiting Review</span>
                </div>
                <span>Your document is in the review queue</span>
              </div>
            )}

            {document.status === "under_review" && (
              <div className="bg-blue-50 mt-2 p-2 rounded text-blue-700 text-xs">
                <div className="flex items-center gap-1">
                  <ClockIcon className="flex-shrink-0 w-3 h-3" />
                  <span className="font-medium">Under Review</span>
                </div>
                <span>Your document is currently being reviewed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface KYCDocumentsProps {
  companyId: string;
  onOpenUploadModal: (existingDocuments?: unknown) => void;
  companyData?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    website?: string;
    address?: string;
    city?: {
      id: string;
      name: string;
    };
    country?: {
      id: string;
      name: string;
    };
    postal_code?: string;
    user?: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    };
  };
}

export default function KYCDocuments({
  companyId,
  onOpenUploadModal,
  companyData,
}: KYCDocumentsProps) {
  const [updateConfirmation, setUpdateConfirmation] = useState<{
    isOpen: boolean;
    documentId: string | null;
    documentTitle: string | null;
    file: File | null;
  }>({
    isOpen: false,
    documentId: null,
    documentTitle: null,
    file: null,
  });

  // Business On Boarding Modal State
  const [businessOnboardingModal, setBusinessOnboardingModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false,
  });

  // OTP Verification Modal State
  const [otpModal, setOtpModal] = useState<{
    isOpen: boolean;
    otp: string;
  }>({
    isOpen: false,
    otp: "",
  });

  // Fetch KYC documents using the custom hook
  const {
    data: kycData,
    isLoading: loadingKYC,
    error: kycError,
  } = useKYCCompanyDocuments(companyId);

  // Fetch business onboarding data
  const {
    data: businessOnboardingData,
    isLoading: loadingBusinessOnboarding,
    refetch: refetchBusinessOnboarding, // eslint-disable-line @typescript-eslint/no-unused-vars
  } = useQuery({
    queryKey: ["business-onboarding"],
    queryFn: async () => {
      console.log("Fetching business onboarding data from Redis");
      return await getBusinessOnboarding();
    },
    enabled: true, // Fetch on page load/refresh
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch when component mounts (on page load)
  });

  // Document update mutation using the custom hook
  const updateDocumentMutation = useKYCDocumentUpdate();

  // OTP Confirmation Mutation
  const otpConfirmationMutation = useMutation({
    mutationFn: confirmBusinessOnboardingOTP,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to confirm OTP");
      } else {
        toast.success("OTP confirmed successfully!");
        // Refetch business onboarding data to show updated status
        refetchBusinessOnboarding();
        setOtpModal({ isOpen: false, otp: "" });
      }
    },
    onError: (error) => {
      console.error("OTP confirmation error:", error);
      toast.error("Failed to confirm OTP");
    },
  });

  // SasaPay KYC Submission Mutation
  const sasaPaySubmissionMutation = useMutation({
    mutationFn: submitKYCToSasaPay,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to submit KYC to SasaPay");
      } else {
        toast.success("KYC submitted to SasaPay successfully!");
        console.log("SasaPay submission result:", data.data);
        // Optionally refresh KYC data or show success state
      }
    },
    onError: (error) => {
      console.error("SasaPay submission error:", error);
      toast.error("An unexpected error occurred while submitting to SasaPay");
    },
  });

  const handleDocumentUpdate = async (
    documentId: string,
    file: File,
    documentTitle: string
  ) => {
    // Show confirmation dialog instead of immediate update
    setUpdateConfirmation({
      isOpen: true,
      documentId,
      documentTitle,
      file,
    });
  };

  const confirmDocumentUpdate = () => {
    if (updateConfirmation.documentId && updateConfirmation.file) {
      updateDocumentMutation.mutate({
        documentId: updateConfirmation.documentId,
        file: updateConfirmation.file,
      });

      // Close confirmation dialog
      setUpdateConfirmation({
        isOpen: false,
        documentId: null,
        documentTitle: null,
        file: null,
      });
    }
  };

  const cancelDocumentUpdate = () => {
    setUpdateConfirmation({
      isOpen: false,
      documentId: null,
      documentTitle: null,
      file: null,
    });
  };

  // Get list of missing documents (excluding company KRA PIN since it's already uploaded)
  const missingDocuments = [
    {
      key: "cr12_document",
      title: "C-R 12",
      description: "Company registration document",
    },
    {
      key: "proof_of_address_document",
      title: "Proof of Address",
      description: "Business address verification",
    },
    {
      key: "board_resolution_document",
      title: "Board Resolution",
      description: "Board decision documentation",
    },
    {
      key: "certificate_of_incorporation_document",
      title: "Certificate of Incorporation",
      description: "Company incorporation proof",
    },
    {
      key: "bank_confirmation_letter_document",
      title: "Bank Confirmation Letter",
      description: "Bank account verification",
    },
    {
      key: "tax_compliance_certificate_document",
      title: "Tax Compliance Certificate",
      description: "Tax compliance verification",
    },
  ].filter((doc) => !kycData?.[doc.key as keyof typeof kycData]);

  // Check for missing director KYC documents
  const missingDirectorDocuments = useMemo(() => {
    // If no directors exist, show that director documents are missing
    if (!kycData?.directors || kycData.directors.length === 0) {
      return ["Director files are missing"];
    }

    // Check if at least one director has complete KYC
    const directorsWithCompleteKYC = kycData.directors.filter(
      (director) =>
        director &&
        director.id_card_front &&
        director.id_card_back &&
        director.kra_pin
    );

    // If no director has complete KYC, show missing message
    if (directorsWithCompleteKYC.length === 0) {
      return ["Director files are missing"];
    }

    return [];
  }, [kycData?.directors]);

  // Combine missing company and director documents
  const allMissingDocuments = [
    ...missingDocuments,
    ...missingDirectorDocuments,
  ];

  // Handle opening upload modal with proper data validation
  const handleOpenUploadModal = () => {
    // if (loadingKYC) {
    //   toast.error("Please wait while KYC data is loading...");
    //   return;
    // }

    // if (kycError) {
    //   toast.error("Failed to load KYC data. Please try again.");
    //   return;
    // }

    // Always pass the current KYC data (even if it's null/undefined)
    onOpenUploadModal(kycData);
  };

  // KYC Documents data - only include documents that have actual files
  const kycDocuments = [
    {
      key: "cr12_document",
      title: "C-R 12",
      description: "Company registration document",
      document: kycData?.cr12_document,
    },
    {
      key: "proof_of_address_document",
      title: "Proof of Address",
      description: "Business address verification",
      document: kycData?.proof_of_address_document,
    },
    {
      key: "board_resolution_document",
      title: "Board Resolution",
      description: "Board decision documentation",
      document: kycData?.board_resolution_document,
    },
    {
      key: "kra_pin_document",
      title: "KRA PIN",
      description: "Tax registration certificate",
      document: kycData?.kra_pin_document,
    },
    {
      key: "certificate_of_incorporation_document",
      title: "Certificate of Incorporation",
      description: "Company incorporation proof",
      document: kycData?.certificate_of_incorporation_document,
    },
    {
      key: "bank_confirmation_letter_document",
      title: "Bank Confirmation Letter",
      description: "Bank account verification",
      document: kycData?.bank_confirmation_letter_document,
    },
    {
      key: "tax_compliance_certificate_document",
      title: "Tax Compliance Certificate",
      description: "Tax compliance verification",
      document: kycData?.tax_compliance_certificate_document,
    },
  ].filter((doc) => doc.document); // Only show documents that have actual files

  // Get all documents including director documents
  const allKycDocuments = useMemo(() => {
    if (!kycData?.all_documents) return [];

    return kycData.all_documents.map((doc) => ({
      key: doc.id,
      title: doc.display_name || doc.document_type_display,
      description: doc.is_director_document
        ? `Director ${doc.director_number} ${
            doc.director_document_type
              ?.replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()) || "Document"
          }`
        : doc.document_type_display,
      document: doc,
      isDirectorDocument: doc.is_director_document,
      directorNumber: doc.director_number,
      directorDocumentType: doc.director_document_type,
    }));
  }, [kycData?.all_documents]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  function handleSasaPaySubmit() {
    console.log("Submitting KYC to SasaPay...");
    sasaPaySubmissionMutation.mutate(companyId);
  }

  // Calculate total required documents dynamically
  const totalRequiredDocuments = useMemo(() => {
    const companyDocuments = 7; // 7 company KYC documents

    // Check if directors exist and have actual data
    const directorsExist =
      kycData?.directors &&
      Array.isArray(kycData.directors) &&
      kycData.directors.length > 0 &&
      kycData.directors.some(
        (director) =>
          director &&
          (director.id_card_front || director.id_card_back || director.kra_pin)
      );

    // Debug logging
    console.log("KYC Data Debug:", {
      companyDocuments,
      directorsExist,
      directorsData: kycData?.directors,
      directorsLength: kycData?.directors?.length,
      hasDirectorData: kycData?.directors?.some(
        (d) => d && (d.id_card_front || d.id_card_back || d.kra_pin)
      ),
    });

    // If no directors exist or no director data, minimum is 10
    if (!directorsExist) {
      return 10; // 7 company + 3 director minimum
    }

    // If directors exist with data, count them: 7 company + (directors * 3)
    return companyDocuments + kycData.directors.length * 3;
  }, [kycData?.directors]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!kycData) return 0;
    return (kycData.documents_count / totalRequiredDocuments) * 100;
  }, [kycData, totalRequiredDocuments]);

  // Check if all company documents are uploaded
  const allCompanyDocumentsUploaded = useMemo(() => {
    if (!kycData) return false;
    return kycData.documents_count >= 7; // At least 7 company documents
  }, [kycData]);

  // Check if all director documents are uploaded
  const allDirectorDocumentsUploaded = useMemo(() => {
    // If no directors exist, return false (minimum 1 director required)
    if (!kycData?.directors || kycData.directors.length === 0) {
      return false;
    }

    // At least one director must have complete KYC (all 3 documents)
    const directorsWithCompleteKYC = kycData.directors.filter(
      (director) =>
        director &&
        director.id_card_front &&
        director.id_card_back &&
        director.kra_pin
    );

    // Return true if at least one director has complete KYC
    return directorsWithCompleteKYC.length > 0;
  }, [kycData?.directors]);

  // Check if KYC is complete (both company and director documents)
  const isKYCComplete =
    allCompanyDocumentsUploaded && allDirectorDocumentsUploaded;

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 pt-6 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">KYC Documents</CardTitle>
              <p className="text-gray-600 text-sm">
                Know Your Customer verification documents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show Business On Boarding button if no data exists */}
            {!loadingBusinessOnboarding &&
              (!businessOnboardingData || businessOnboardingData.error) && (
                <Button
                  onClick={() => {
                    console.log("Opening business onboarding modal");
                    setBusinessOnboardingModal({ isOpen: true });
                  }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Building2 className="w-4 h-4" />
                  Business On Boarding
                </Button>
              )}
            {/* Only show Verify OTP button if business onboarding is submitted but not yet confirmed */}
            {!loadingBusinessOnboarding &&
              businessOnboardingData &&
              !businessOnboardingData.error &&
              businessOnboardingData.data &&
              // Only show if status is false (not yet confirmed) or if we don't have accountStatus
              (!businessOnboardingData.data.status ||
                businessOnboardingData.data.accountStatus ===
                  "AWAITING_KYC_UPLOAD") && (
                <Button
                  onClick={() => setOtpModal({ isOpen: true, otp: "" })}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="w-4 h-4" />
                  Verify OTP
                </Button>
              )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Business Onboarding Status */}
        {!loadingBusinessOnboarding &&
          businessOnboardingData &&
          !businessOnboardingData.error && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 mb-6 p-4 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-green-900 text-sm">
                        Business Onboarding{" "}
                        {businessOnboardingData.data?.status
                          ? "Confirmed"
                          : "Submitted"}
                      </h4>
                      <p className="text-green-700 text-xs">
                        {businessOnboardingData.data?.status
                          ? "Your business onboarding has been confirmed successfully"
                          : "Your business onboarding information has been submitted successfully"}
                      </p>
                      {businessOnboardingData.data?.accountStatus && (
                        <p className="mt-1 text-green-600 text-xs">
                          Account Status:{" "}
                          {businessOnboardingData.data.accountStatus}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                          businessOnboardingData.data?.status
                            ? "bg-green-100"
                            : "bg-blue-100"
                        }`}
                      >
                        <div
                          className={`rounded-full w-2 h-2 ${
                            businessOnboardingData.data?.status
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }`}
                        ></div>
                        <span
                          className={`font-medium text-xs ${
                            businessOnboardingData.data?.status
                              ? "text-green-700"
                              : "text-blue-700"
                          }`}
                        >
                          {businessOnboardingData.data?.status
                            ? "Confirmed"
                            : "Submitted"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {businessOnboardingData.data && (
                    <div className="space-y-2 mt-3">
                      <div className="gap-3 grid grid-cols-1 md:grid-cols-2 text-xs">
                        <div>
                          <span className="font-medium text-green-800">
                            Business Name:
                          </span>
                          <span className="ml-1 text-green-700">
                            {businessOnboardingData.data.businessName}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">
                            Merchant Code:
                          </span>
                          <span className="ml-1 text-green-700">
                            {businessOnboardingData.data.merchantCode}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">
                            Email:
                          </span>
                          <span className="ml-1 text-green-700">
                            {businessOnboardingData.data.email}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-green-800">
                            Mobile:
                          </span>
                          <span className="ml-1 text-green-700">
                            {businessOnboardingData.data.mobileNumber}
                          </span>
                        </div>
                      </div>

                      {businessOnboardingData.data.submitted_at && (
                        <div className="text-green-600 text-xs">
                          Submitted:{" "}
                          {formatDate(businessOnboardingData.data.submitted_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {!loadingBusinessOnboarding &&
          (!businessOnboardingData || businessOnboardingData.error) && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 mb-6 p-4 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-yellow-900 text-sm">
                        Business Onboarding Required
                      </h4>
                      <p className="text-yellow-700 text-xs">
                        Complete your business onboarding to proceed with
                        SasaPay integration
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                        <div className="bg-yellow-500 rounded-full w-2 h-2"></div>
                        <span className="font-medium text-yellow-700 text-xs">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-yellow-700 text-xs">
                    <p>
                      You need to complete the business onboarding process
                      before you can submit to SasaPay.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {loadingKYC ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="mx-auto border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <p className="mt-2 text-gray-600">Loading KYC documents...</p>
            </div>
          </div>
        ) : kycError ? (
          <div className="flex justify-center items-center py-12">
            <div className="max-w-md text-center">
              <div className="flex justify-center items-center bg-red-100 mx-auto mb-4 rounded-full w-16 h-16">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Unable to Load KYC Documents
              </h3>
              <p className="mb-4 text-gray-600 text-sm">
                We couldn&apos;t load your KYC verification documents at this
                time. This might be due to a temporary connection issue.
              </p>
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-sm"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenUploadModal}
                  className="text-sm"
                >
                  Upload Documents
                </Button>
              </div>
            </div>
          </div>
        ) : !kycData || kycData.documents_count === 0 ? (
          // No KYC documents uploaded yet
          <div className="flex justify-center items-center p-12">
            <div className="w-full text-center">
              <div className="flex justify-center items-center bg-gray-100 mx-auto mb-6 rounded-full w-20 h-20">
                <Shield className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mb-3 font-semibold text-gray-900 text-lg">
                No KYC Documents Uploaded
              </h3>
              <p className="mb-6 text-gray-600 text-sm leading-relaxed">
                You haven&apos;t uploaded any KYC verification documents yet. To
                complete your company verification, you&apos;ll need to upload
                the required documents.
              </p>
              <div className="space-y-4">
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="mb-1 font-medium text-blue-900 text-sm">
                          Required Documents
                        </h4>
                        <ul className="space-y-1 text-gray-600 text-sm list-disc list-inside">
                          <li>C-R 12</li>
                          <li>Proof of Address</li>
                          <li>Board Resolution</li>
                          <li>KRA PIN</li>
                          <li>Certificate of Incorporation</li>
                          <li>Bank Confirmation Letter</li>
                          <li>Tax Compliance Certificate</li>
                          {/* Always show minimum director documents */}
                          <li>Director ID Card Front</li>
                          <li>Director ID Card Back</li>
                          <li>Director KRA PIN Certificate</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="mb-1 font-medium text-yellow-900 text-sm">
                          Document Requirements
                        </h4>
                        <ul className="space-y-1 text-yellow-800 text-xs">
                          <li>• PDF, JPG, or PNG format only</li>
                          <li>• Maximum file size: 1MB per document</li>
                          <li>• All documents must be clear and legible</li>
                          <li>• Documents must be current and valid</li>
                          <li>• Director KYC includes ID cards and KRA PIN</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleOpenUploadModal}
                  className="flex justify-center items-center gap-2 w-full"
                >
                  <Upload className="w-4 h-4" />
                  Upload KYC Documents
                </Button>
              </div>
            </div>
          </div>
        ) : kycDocuments.length === 0 ? (
          // No uploaded documents to display (filtered out)
          <div className="flex justify-center items-center p-12">
            <div className="w-full text-center">
              <div className="flex justify-center items-center bg-gray-100 mx-auto mb-6 rounded-full w-20 h-20">
                <Shield className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mb-3 font-semibold text-gray-900 text-lg">
                No Valid Documents Found
              </h3>
              <p className="mb-6 text-gray-600 text-sm leading-relaxed">
                No valid KYC documents are currently displayed. This might be
                due to documents being removed or invalid.
              </p>
              <Button
                onClick={handleOpenUploadModal}
                className="flex justify-center items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload KYC Documents
              </Button>
            </div>
          </div>
        ) : (
          // KYC documents exist - show the normal view
          <div className="space-y-4">
            {/* Uploaded Documents */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              {allKycDocuments.map((doc) => (
                <KYCDocumentCard
                  key={doc.key}
                  title={doc.title}
                  description={doc.description}
                  document={doc.document}
                  onUpdate={handleDocumentUpdate}
                  isDirectorDocument={doc.isDirectorDocument}
                  directorNumber={doc.directorNumber}
                  directorDocumentType={doc.directorDocumentType}
                />
              ))}
            </div>

            {/* Missing Documents Section */}
            {allMissingDocuments.length > 0 && (
              <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="flex-shrink-0 mt-0.5 w-5 h-5 text-yellow-600" />
                  <div>
                    <h4 className="font-medium text-yellow-900 text-sm">
                      Missing Documents
                    </h4>
                    <p className="text-yellow-800 text-xs">
                      The following documents are still required for KYC
                      verification
                    </p>
                  </div>
                </div>

                {/* Company Documents */}
                {missingDocuments.length > 0 && (
                  <div className="mb-4">
                    <h5 className="mb-2 font-medium text-yellow-800 text-sm">
                      Company Documents
                    </h5>
                    <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                      {missingDocuments.map((doc) => (
                        <div
                          key={doc.key}
                          className="flex items-center gap-3 bg-white p-3 border border-yellow-200 rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            <FileText className="w-4 h-4 text-yellow-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 text-sm">
                              {doc.title}
                            </h5>
                            <p className="text-gray-500 text-xs">
                              {doc.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Director KYC Documents */}
                {missingDirectorDocuments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 text-sm">
                      Director KYC Documents
                    </h4>
                    {missingDirectorDocuments.map((doc) => (
                      <div
                        key={doc}
                        className="flex items-center gap-3 bg-white p-3 border border-yellow-200 rounded-lg"
                      >
                        <AlertTriangle className="flex-shrink-0 w-5 h-5 text-yellow-500" />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {doc}
                          </h5>
                          <p className="text-gray-500 text-xs">
                            {doc === "Director files are missing"
                              ? "ID Card Front, ID Card Back, and KRA PIN Certificate are required for each director"
                              : "This document is missing."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Button
                    onClick={() => {
                      console.log("Button clicked! Opening modal...");
                      handleOpenUploadModal();
                    }}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Missing Documents
                  </Button>
                </div>
              </div>
            )}

            {/* KYC Submission Status */}
            {kycData && (
              <div className="bg-gray-50 mt-6 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Submission Status
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Overall KYC verification progress
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <KYCDocumentStatus status={kycData.submission_status} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 text-sm">
                      Upload Progress
                    </span>
                    <span className="text-gray-500 text-sm">
                      {kycData.documents_count} of {totalRequiredDocuments}{" "}
                      documents uploaded
                      {kycData.documents_count < totalRequiredDocuments && (
                        <span className="text-gray-400">
                          {" "}
                          • {totalRequiredDocuments -
                            kycData.documents_count}{" "}
                          remaining
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full w-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Status Details */}
                <div className="gap-4 grid grid-cols-2 md:grid-cols-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-blue-600 text-lg">
                      {kycData.documents_count}
                    </div>
                    <div className="text-gray-500 text-xs">Uploaded</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600 text-lg">
                      {kycData.approved_documents_count}
                    </div>
                    <div className="text-gray-500 text-xs">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-yellow-600 text-lg">
                      {kycData.pending_documents_count}
                    </div>
                    <div className="text-gray-500 text-xs">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600 text-lg">
                      {kycData.rejected_documents_count}
                    </div>
                    <div className="text-gray-500 text-xs">Rejected</div>
                  </div>
                </div>

                {/* Status Explanation */}
                <div className="bg-white mt-4 p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {kycData.submission_status === "submitted" ? (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      ) : kycData.submission_status === "approved" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : kycData.submission_status === "rejected" ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="mb-1 font-medium text-gray-900 text-sm">
                        {kycData.submission_status === "submitted"
                          ? "Documents Submitted Successfully"
                          : kycData.submission_status === "approved"
                          ? "KYC Verification Complete"
                          : kycData.submission_status === "rejected"
                          ? "KYC Verification Failed"
                          : "KYC Verification In Progress"}
                      </h5>
                      <p className="text-gray-600 text-xs">
                        {kycData.submission_status === "submitted"
                          ? `All ${kycData.documents_count} uploaded documents have been submitted for review. Our team will review your documents and update the status accordingly.`
                          : kycData.submission_status === "approved"
                          ? "All documents have been approved. Your KYC verification is complete."
                          : kycData.submission_status === "rejected"
                          ? "Some documents were rejected. Please review and resubmit."
                          : kycData.submission_status === "under_review"
                          ? "Documents are currently under review by our team."
                          : "Documents are pending review."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit to SasaPay button - only show when KYC is complete */}
                {isKYCComplete &&
                  businessOnboardingData &&
                  !businessOnboardingData.error && (
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handleSasaPaySubmit}
                        disabled={sasaPaySubmissionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {sasaPaySubmissionMutation.isPending ? (
                          <>
                            <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit to SasaPay"
                        )}
                      </Button>
                    </div>
                  )}

                {/* Show message if KYC is complete but director KYC is missing */}
                {isKYCComplete && !allDirectorDocumentsUploaded && (
                  <div className="flex justify-end mt-4">
                    <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        Company KYC complete, but director files are missing.
                        Please upload ID Card Front, ID Card Back, and KRA PIN
                        Certificate for each director.
                      </p>
                    </div>
                  </div>
                )}

                {/* Show message if KYC is complete but business onboarding is missing */}
                {isKYCComplete &&
                  (!businessOnboardingData || businessOnboardingData.error) && (
                    <div className="flex justify-end mt-4">
                      <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-yellow-800 text-sm">
                            Complete business onboarding to submit to SasaPay
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {kycData.submission_created_at && (
                  <div className="mt-3 text-gray-500 text-xs">
                    Submitted: {formatDate(kycData.submission_created_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Document Update Confirmation Dialog */}
      <Dialog
        open={updateConfirmation.isOpen}
        onOpenChange={setUpdateConfirmation.bind(null, {
          ...updateConfirmation,
          isOpen: false,
        })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Document Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the document &quot;
              {updateConfirmation.documentTitle}&quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 mb-4 p-4 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="flex-shrink-0 mt-0.5 w-5 h-5 text-yellow-600" />
              <div className="text-sm">
                <h4 className="mb-1 font-medium text-yellow-800">
                  Important Notice
                </h4>
                <ul className="space-y-1 text-yellow-700 text-xs">
                  <li>• The current document will be completely replaced</li>
                  <li>
                    • The new document will need to go through review again
                  </li>
                  <li>• The review process may take 1-3 business days</li>
                  <li>• Make sure the new document meets all requirements</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDocumentUpdate}>
              Cancel
            </Button>
            <Button
              onClick={confirmDocumentUpdate}
              disabled={updateDocumentMutation.isPending}
            >
              {updateDocumentMutation.isPending ? (
                <>
                  <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business On Boarding Modal */}
      <BusinessOnboardingModal
        isOpen={businessOnboardingModal.isOpen}
        onClose={() => setBusinessOnboardingModal({ isOpen: false })}
        companyData={companyData}
      />

      {/* OTP Verification Modal */}
      <Dialog
        open={otpModal.isOpen}
        onOpenChange={(open) => setOtpModal({ isOpen: open, otp: "" })}
      >
        <DialogContent className="min-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Verify OTP
            </DialogTitle>
            <DialogDescription>
              Enter the OTP sent to your registered mobile number to verify your
              business onboarding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="otp"
                className="font-medium text-gray-700 text-sm"
              >
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otpModal.otp}
                className="px-3 py-2 border border-gray-300 focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setOtpModal({ ...otpModal, otp: value });
                }}
              />
            </div>

            <div className="bg-blue-50 p-3 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="flex-shrink-0 mt-0.5 w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <h4 className="mb-1 font-medium text-blue-800">
                    OTP Information
                  </h4>
                  <ul className="space-y-1 text-blue-700 text-xs">
                    <li>• OTP will be sent to your registered mobile number</li>
                    <li>• OTP is valid for 10 minutes</li>
                    <li>• Enter the 6-digit code exactly as received</li>
                    <li>• You can request a new OTP if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOtpModal({ isOpen: false, otp: "" })}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!otpModal.otp || otpModal.otp.length !== 6) {
                    toast.error("Please enter a valid 6-digit OTP");
                    return;
                  }
                  otpConfirmationMutation.mutate(otpModal.otp);
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={otpConfirmationMutation.isPending}
              >
                {otpConfirmationMutation.isPending ? (
                  <>
                    <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
