"use client";

import { AlertCircle, CheckCircle, FileText, Plus, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';

import { uploadKYCDocuments } from '@/actions/company/kyc';

interface Director {
  id: number;
  name: string;
  files: {
    directorIdCardFront?: File;
    directorIdCardBack?: File;
    directorKraPin?: File;
  };
}

interface KYCUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  existingDocuments?: {
    cr12_document?: unknown;
    proof_of_address_document?: unknown;
    board_resolution_document?: unknown;
    kra_pin_document?: unknown;
    certificate_of_incorporation_document?: unknown;
    bank_confirmation_letter_document?: unknown;
    tax_compliance_certificate_document?: unknown;
    all_documents?: Array<{
      director_number?: number;
      director_document_type?: string;
      is_director_document?: boolean;
    }>;
  };
  onUploadSuccess?: () => void;
}

// File upload component for individual KYC documents
const FileUploadField = ({
  name,
  label,
  description,
  form,
  isPending,
}: {
  name: string;
  label: string;
  description: string;
  form: any;
  isPending: boolean;
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
  } | null>(null);

  // Watch the form value for this field
  const fieldValue = form.watch(name);

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) {
        console.log(`File selected for ${name}:`, file.name, file.size);
        form.setValue(name, file, { shouldDirty: true });
        setPreview(URL.createObjectURL(file));
        setFileInfo({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        });
      }
    },
    [form, name]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    maxSize: 1 * 1024 * 1024, // 1MB
    onDropAccepted: (files) => {
      console.log("Files accepted:", files);
    },
    onDropRejected: (fileRejections) => {
      console.log("Files rejected:", fileRejections);
    },
    onError: (error) => {
      console.error("Dropzone error:", error);
    },
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    form.setValue(name, undefined as unknown as File, { shouldDirty: true });
    setPreview(null);
    setFileInfo(null);
  };

  const handleClick = () => {
    console.log(`Clicked on ${name} upload area`);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log(`File selected via click for ${name}:`, file.name, file.size);
        onDrop([file]);
      }
    };
    input.click();
  };

  // Update preview when form value changes
  useEffect(() => {
    console.log(`Field ${name} value changed:`, fieldValue);
    if (fieldValue && fieldValue instanceof File) {
      console.log(`Setting preview for ${name}:`, fieldValue.name);
      setPreview(URL.createObjectURL(fieldValue));
      setFileInfo({
        name: fieldValue.name,
        size: (fieldValue.size / 1024 / 1024).toFixed(2) + " MB",
      });
    } else {
      setPreview(null);
      setFileInfo(null);
    }
  }, [fieldValue, name]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Debug: Log when component renders
  console.log(`Rendering FileUploadField for ${name}`);

  return (
    <FormField
      name={name}
      control={form.control}
      render={() => (
        <FormItem className="">
          <FormLabel className="font-medium text-gray-700 text-sm">
            {label}
          </FormLabel>
          <FormControl>
            <div
              {...getRootProps()}
              onClick={handleClick}
              className={`
                relative group overflow-hidden
                p-6 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out
                h-48 flex flex-col items-center justify-center
                ${
                  preview
                    ? "border-green-200 bg-green-50/10 hover:bg-green-50/20"
                    : isDragActive
                    ? "border-blue-400 bg-blue-50/20"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                }
                cursor-pointer
                ${isPending ? "opacity-50 cursor-not-allowed" : ""}
              `}
              role="button"
              tabIndex={0}
            >
              <input {...getInputProps()} disabled={isPending} />

              {preview ? (
                <>
                  <div className="flex items-center gap-2 mb-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">File uploaded</span>
                  </div>
                  {fileInfo && (
                    <div className="bg-white mb-3 p-3 border border-gray-200 rounded-lg w-full max-w-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-gray-700 text-xs truncate">
                          {fileInfo.name}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        Size: {fileInfo.size}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3 text-gray-600 text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Click to change or drag new file</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="font-medium text-red-500 hover:text-red-600 text-xs transition-colors duration-200"
                    disabled={isPending}
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center items-center bg-blue-50 mb-3 rounded-full w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="mb-1 font-medium text-gray-700 text-sm">
                      Click to Upload
                    </p>
                    <p className="mb-1 text-gray-500 text-xs">{description}</p>
                    <p className="text-gray-400 text-xs">
                      PDF, JPG, PNG (max 1MB) • Optional
                    </p>
                  </div>
                </>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default function KYCUploadModal({
  isOpen,
  onClose,
  companyId,
  existingDocuments,
  onUploadSuccess,
}: KYCUploadModalProps) {
  console.log("KYCUploadModal rendered, isOpen:", isOpen);
  
  const [directors, setDirectors] = useState<Director[]>([
    { id: 1, name: "Director 1", files: {} },
  ]);
  
  // Add uploading state for direct SasaPay submission
  const [uploading, setUploading] = useState(false);

  // KYC documents configuration
  const kycDocuments = [
    {
      name: "cr12",
      label: "C-R 12",
      description: "Upload your C-R 12 document",
      isUploaded: !!existingDocuments?.cr12_document,
    },
    {
      name: "proof_of_address",
      label: "Proof of Address",
      description: "Upload proof of address document",
      isUploaded: !!existingDocuments?.proof_of_address_document,
    },
    {
      name: "board_resolution",
      label: "Board Resolution",
      description: "Upload board resolution document",
      isUploaded: !!existingDocuments?.board_resolution_document,
    },
    {
      name: "kra_pin",
      label: "KRA PIN",
      description: "Upload KRA PIN document",
      isUploaded: !!existingDocuments?.kra_pin_document,
    },
    {
      name: "certificate_of_incorporation",
      label: "Certificate of Incorporation",
      description: "Upload certificate of incorporation",
      isUploaded: !!existingDocuments?.certificate_of_incorporation_document,
    },
    {
      name: "bank_confirmation_letter",
      label: "Bank Confirmation Letter",
      description: "Upload bank confirmation letter",
      isUploaded: !!existingDocuments?.bank_confirmation_letter_document,
    },
    {
      name: "tax_compliance_certificate",
      label: "Tax Compliance Certificate",
      description: "Upload tax compliance certificate",
      isUploaded: !!existingDocuments?.tax_compliance_certificate_document,
    },
  ];

  // Director KYC documents configuration
  const directorsKycDocuments = [
    {
      name: "directorIdCardFront",
      label: "ID Card Front",
      description: "Upload front side of director's ID card",
    },
    {
      name: "directorIdCardBack",
      label: "ID Card Back",
      description: "Upload back side of director's ID card",
    },
    {
      name: "directorKraPin",
      label: "KRA PIN Certificate",
      description: "Upload director's KRA PIN certificate",
    },
  ];

  // Filter out already uploaded documents
  const unuploadedDocuments = kycDocuments.filter((doc) => !doc.isUploaded);

  // Create dynamic schema based on unuploaded documents
  const dynamicKycSchema = z.object({
    ...Object.fromEntries(
      unuploadedDocuments.map((doc) => [
        doc.name,
        z.instanceof(File, { message: `${doc.label} is required` }).optional(),
      ])
    ),
  });

  const form = useForm({
    resolver: zodResolver(dynamicKycSchema),
    defaultValues: {
      cr12: undefined,
      proof_of_address: undefined,
      board_resolution: undefined,
      kra_pin: undefined,
      certificate_of_incorporation: undefined,
      bank_confirmation_letter: undefined,
      tax_compliance_certificate: undefined,
    },
  });

  // Move form-dependent logic here after form is initialized
  const formValues = form.watch();

  // Check if a director has complete KYC (all 3 files)
  const isDirectorComplete = (director: Director) => {
    return (
      director.files.directorIdCardFront &&
      director.files.directorIdCardBack &&
      director.files.directorKraPin
    );
  };

  // Get visible directors (hide completed ones, show next available)
  const visibleDirectors = useMemo(() => {
    const result: Director[] = [];
    let nextDirectorNumber = 1;

    // Check existing uploaded director documents from backend
    const existingDirectorDocs =
      existingDocuments?.all_documents?.filter(
        (doc) => doc.is_director_document
      ) || [];

    // Group existing documents by director number
    const existingDirectorsMap = new Map();
    existingDirectorDocs.forEach((doc) => {
      if (doc.director_number) {
        if (!existingDirectorsMap.has(doc.director_number)) {
          existingDirectorsMap.set(doc.director_number, []);
        }
        existingDirectorsMap.get(doc.director_number).push(doc);
      }
    });

    // Check which directors are complete in existing documents
    const completedDirectorNumbers = new Set();
    existingDirectorsMap.forEach((docs, directorNum) => {
      const hasFront = docs.some(
        (d: any) => d.director_document_type === "id_card_front"
      );
      const hasBack = docs.some(
        (d: any) => d.director_document_type === "id_card_back"
      );
      const hasKraPin = docs.some(
        (d: any) => d.director_document_type === "kra_pin"
      );

      if (hasFront && hasBack && hasKraPin) {
        completedDirectorNumbers.add(directorNum);
      }
    });

    // Process local directors state
    for (const director of directors) {
      // Check if this director is already complete in existing documents
      if (completedDirectorNumbers.has(director.id)) {
        // Director is complete, skip to next
        nextDirectorNumber++;
        continue;
      }

      // Check if local files make this director complete
      if (isDirectorComplete(director)) {
        // Local files make director complete, skip to next
        nextDirectorNumber++;
        continue;
      }

      // Director is incomplete, show it
      result.push({
        ...director,
        name: `Director ${nextDirectorNumber}`,
      });
      nextDirectorNumber++;
    }

    // Always show at least one director slot
    if (result.length === 0) {
      result.push({
        id: directors[0]?.id || 1,
        name: "Director 1",
        files: {},
      });
    }

    return result;
  }, [directors, existingDocuments]);

  // Check if any director has documents
  const hasAnyDirectorDocuments = visibleDirectors.some((director) => {
    return (
      (director.files.directorIdCardFront &&
        director.files.directorIdCardFront instanceof File &&
        director.files.directorIdCardFront.size > 0) ||
      (director.files.directorIdCardBack &&
        director.files.directorIdCardBack instanceof File &&
        director.files.directorIdCardBack.size > 0) ||
      (director.files.directorKraPin &&
        director.files.directorKraPin instanceof File &&
        director.files.directorKraPin.size > 0)
    );
  });

  // Check if all documents are uploaded
  const allDocumentsUploaded = useMemo(() => {
    // Check if all company documents are uploaded
    const allCompanyUploaded = kycDocuments.every((doc) => doc.isUploaded);

    // Check if at least one director has complete KYC (all 3 documents)
    const hasCompleteDirectorKYC = visibleDirectors.some(
      (director) =>
        director.files.directorIdCardFront &&
        director.files.directorIdCardBack &&
        director.files.directorKraPin
    );

    // Both company AND director documents must be complete
    return allCompanyUploaded && hasCompleteDirectorKYC;
  }, [kycDocuments, visibleDirectors]);

  // Calculate uploaded documents count
  const uploadedCount = useMemo(() => {
    // Count company documents that are uploaded
    const companyUploaded = kycDocuments.filter((doc) => doc.isUploaded).length;

    // Count director documents that are uploaded
    const directorUploaded = visibleDirectors.reduce((total, director) => {
      return (
        total +
        (director.files.directorIdCardFront ? 1 : 0) +
        (director.files.directorIdCardBack ? 1 : 0) +
        (director.files.directorKraPin ? 1 : 0)
      );
    }, 0);

    return companyUploaded + directorUploaded;
  }, [kycDocuments, visibleDirectors]);

  // Calculate total documents dynamically
  const totalCount = 7 + visibleDirectors.length * 3; // 7 company + 3 per visible director

  // Director management functions
  const addDirector = () => {
    const newId = Math.max(...directors.map((d) => d.id)) + 1;
    setDirectors([
      ...directors,
      {
        id: newId,
        name: `Director ${newId}`,
        files: {},
      },
    ]);
  };

  const removeDirector = (directorId: number) => {
    if (directors.length > 1) {
      setDirectors(directors.filter((d) => d.id !== directorId));
    }
  };

  const updateDirectorFile = (
    directorId: number,
    fileType: string,
    file: File | undefined
  ) => {
    setDirectors(
      directors.map((director) =>
        director.id === directorId
          ? {
              ...director,
              files: {
                ...director.files,
                [fileType]: file,
              },
            }
          : director
      )
    );
  };

  // Check if any files are selected or already uploaded
  const hasAnyFilesSelected = useMemo(() => {
    // Check company documents
    const hasCompanyFiles = Object.values(formValues).some((file) => file);

    // Check director documents
    const hasDirectorFiles = directors.some(
      (director) =>
        director.files.directorIdCardFront ||
        director.files.directorIdCardBack ||
        director.files.directorKraPin
    );

    // Check if any documents are already uploaded
    const hasUploadedDocuments = kycDocuments.some((doc) => doc.isUploaded);

    // Check if there are unuploaded documents to work with
    const hasUnuploadedDocuments = unuploadedDocuments.length > 0;

    return (
      hasCompanyFiles ||
      hasDirectorFiles ||
      hasUploadedDocuments ||
      hasUnuploadedDocuments
    );
  }, [formValues, directors, kycDocuments, unuploadedDocuments]);

  const onSubmit = async (data: Record<string, unknown>) => {
    if (!hasAnyFilesSelected) {
      toast.error("Please select at least one document to upload");
      return;
    }

    try {
      setUploading(true);
      
      // Prepare form data with all files
      const formData = new FormData();
      
      // Add company documents
      Object.keys(data).forEach((key) => {
        if (data[key] && data[key] instanceof File) {
          formData.append(key, data[key] as File);
        }
      });
      
      // Add director documents
      visibleDirectors.forEach((director, index) => {
        const directorNumber = index + 1;

        if (director.files.directorIdCardFront) {
          formData.append(
            `director_${directorNumber}_id_card_front`,
            director.files.directorIdCardFront
          );
        }
        if (director.files.directorIdCardBack) {
          formData.append(
            `director_${directorNumber}_id_card_back`,
            director.files.directorIdCardBack
          );
        }
        if (director.files.directorKraPin) {
          formData.append(
            `director_${directorNumber}_kra_pin`,
            director.files.directorKraPin
          );
        }
      });
      
      // Submit directly to SasaPay
      const result = await uploadKYCDocuments(companyId, formData);
      
      if (result.isError) {
        // Check if business onboarding is required
        if (result.actionRequired === "business_onboarding") {
          toast.error(result.message, {
            description: result.details,
            action: {
              label: "Complete Onboarding",
              onClick: () => {
                // Redirect to business onboarding page
                window.location.href = result.redirectUrl || "/settings/company/business-onboarding";
              }
            }
          });
        } else {
          toast.error(result.message);
        }
      } else {
        toast.success("KYC documents submitted successfully!");
        onUploadSuccess?.();
        onClose();
      }
    } catch (error) {
      toast.error("Failed to submit KYC documents");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mt-10 min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Upload KYC Documents
          </DialogTitle>
          <DialogDescription>
            Upload KYC documents (PDF, JPG, PNG, max 1MB).{" "}
            <span className="font-medium text-blue-600">
              Upload at least one document to proceed.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Show success message when all documents are uploaded */}
            {allDocumentsUploaded && (
              <div className="py-8 text-center">
                <div className="mb-2 font-semibold text-green-600 text-lg">
                  All KYC Documents Uploaded!
                </div>
                <div className="mb-4 text-gray-600">
                  Congratulations! You have successfully uploaded all required
                  KYC verification documents. Your documents are now being
                  reviewed by our team.
                </div>
                <div className="text-gray-500 text-sm">
                  Upload Status: {uploadedCount} of {totalCount} documents
                  uploaded successfully
                </div>
              </div>
            )}

            {/* Show upload progress */}
            {!allDocumentsUploaded && (
              <div className="bg-blue-50 mb-4 p-4 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="flex-shrink-0 mt-0.5 w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <h4 className="mb-1 font-medium text-blue-900 text-sm">
                      Upload Progress
                    </h4>
                    <p className="text-blue-800 text-xs">
                      {uploadedCount} of {totalCount} documents uploaded •{" "}
                      {unuploadedDocuments.length} remaining
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show upload fields for remaining documents */}
            {unuploadedDocuments.length > 0 && (
              <div>
                <h4 className="mb-3 font-medium text-gray-900 text-sm">
                  Documents to Upload
                </h4>
                <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
                  {unuploadedDocuments.map((doc) => (
                    <FileUploadField
                      key={doc.name}
                      name={doc.name}
                      label={doc.label}
                      description={doc.description}
                      form={form}
                      isPending={uploading}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Directors KYC Section */}
            <div className="mt-8 pt-6 border-gray-200 border-t">
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900 text-sm">
                      Directors KYC Documents
                    </h4>
                    <p className="text-gray-600 text-xs">
                      Upload KYC documents for company directors
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDirector}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Director
                  </Button>
                </div>
              </div>

              {visibleDirectors.map((director) => (
                <div
                  key={director.id}
                  className="bg-gray-50 mb-6 p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-gray-900 text-sm">
                      {director.name}
                    </h5>
                    <div className="flex gap-2">
                      {/* Debug button for director files */}
                      <button
                        type="button"
                        onClick={() => {
                          console.log(`Director ${director.id} files:`, director.files);
                        }}
                        className="text-xs bg-yellow-200 px-2 py-1 rounded"
                      >
                        Debug
                      </button>
                      {directors.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDirector(director.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="gap-4 grid grid-cols-1 lg:grid-cols-3">
                    {directorsKycDocuments.map((doc) => (
                      <div key={doc.name} className="space-y-2">
                        <label className="font-medium text-gray-700 text-sm">
                          {doc.label}
                        </label>
                        <div
                          className={`
                            relative group overflow-hidden
                            p-4 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out
                            h-32 flex flex-col items-center justify-center
                            ${
                              director.files[
                                doc.name as keyof typeof director.files
                              ]
                                ? "border-green-200 bg-green-50/10 hover:bg-green-50/20"
                                : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                            }
                            cursor-pointer
                            ${
                              uploading
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }
                          `}
                          onClick={() => {
                            console.log(`Clicked on director ${director.id} ${doc.name} upload area`);
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".pdf,.jpg,.jpeg,.png";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) {
                                console.log(`File selected for director ${director.id} ${doc.name}:`, file.name, file.size);
                                updateDirectorFile(director.id, doc.name, file);
                              }
                            };
                            input.click();
                          }}
                        >
                          {director.files[
                            doc.name as keyof typeof director.files
                          ] ? (
                            <div className="text-center">
                              <div className="flex items-center gap-2 mb-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium text-xs">
                                  File uploaded
                                </span>
                              </div>
                              <div className="text-gray-600 text-xs truncate max-w-full">
                                {
                                  (
                                    director.files[
                                      doc.name as keyof typeof director.files
                                    ] as File
                                  )?.name
                                }
                              </div>
                              <div className="text-gray-500 text-xs">
                                Size: {((director.files[doc.name as keyof typeof director.files] as File)?.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log(`Removing file for director ${director.id} ${doc.name}`);
                                  updateDirectorFile(
                                    director.id,
                                    doc.name,
                                    undefined
                                  );
                                }}
                                className="mt-2 font-medium text-red-500 hover:text-red-600 text-xs transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="flex justify-center items-center bg-blue-50 mb-2 rounded-full w-8 h-8 group-hover:scale-110 transition-transform duration-300">
                                <Upload className="w-4 h-4 text-blue-500" />
                              </div>
                              <p className="text-gray-500 text-xs">
                                Click to Upload
                              </p>
                              <p className="text-gray-400 text-xs">
                                {doc.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 pt-6 border-gray-200 border-t">
              <div className="flex justify-center items-center text-gray-500 text-xs">
                <span className="mr-1 text-blue-500">•</span>
                {allDocumentsUploaded
                  ? "All documents have been uploaded"
                  : unuploadedDocuments.length === 0 && hasAnyDirectorDocuments
                  ? "No documents remaining to upload"
                  : "Upload at least one document to proceed"}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={uploading}
                  className="px-6"
                >
                  <X className="mr-2 w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    uploading ||
                    (!hasAnyFilesSelected && unuploadedDocuments.length === 0)
                  }
                  className="px-6"
                >
                  {uploading ? (
                    <>
                      <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : allDocumentsUploaded ? (
                    <>
                      <CheckCircle className="mr-2 w-4 h-4" />
                      All Documents Uploaded
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 w-4 h-4" />
                      Upload Documents
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}