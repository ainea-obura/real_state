"use client";
import { FileText } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { deleteDocument, fetchDocuments } from "@/actions/documents";
import { PermissionGate } from "@/components/PermissionGate";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreateContract from "./createContract";
import DeleteDocumentModal from "./DeleteDocumentModal";
import DocumentDetailModal from "./DocumentDetailModal";
import DocumentGrid from "./DocumentGrid";

import type { Document as ApiDocument } from "./schema/documents";
import type { Document as UiDocument } from "./documentTypes";
function mapApiDocumentToUiDocument(apiDoc: ApiDocument): UiDocument {
  return {
    id: String(apiDoc.id),
    title: apiDoc.template_title,
    description: apiDoc.template_description ?? "",
    category: "contract", // or map from apiDoc.template_type if needed
    uploadedBy: apiDoc.created_by,
    createdAt: apiDoc.created_at,
    url: "#", // Replace with actual URL if available in apiDoc
    templateType: apiDoc.template_type,
    versionNumber: apiDoc.version_number,
    isActive: apiDoc.is_active,
    isDefault: apiDoc.is_default,
    updatedAt: apiDoc.updated_at,
    templateContent: apiDoc.template_content, // <-- add this
    // Add more mappings if needed
  };
}

const FetchDocuments = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });
  const [previewDoc, setPreviewDoc] = useState<UiDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [localDocs, setLocalDocs] = useState<UiDocument[]>([]);
  const [deleteDoc, setDeleteDoc] = useState<UiDocument | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Map API data to UI type
  const apiDocs: ApiDocument[] = data?.data?.results || [];

  // Create a map to ensure unique documents by ID
  const documentsMap = new Map<string, UiDocument>();

  // Add local docs first
  localDocs.forEach((doc) => {
    documentsMap.set(doc.id, doc);
  });

  // Add API docs, but local docs take precedence
  apiDocs.forEach((apiDoc) => {
    const uiDoc = mapApiDocumentToUiDocument(apiDoc);
    if (!documentsMap.has(uiDoc.id)) {
      documentsMap.set(uiDoc.id, uiDoc);
    }
  });

  const documents: UiDocument[] = Array.from(documentsMap.values());

  // Debug: Log document IDs to check for duplicates
  console.log(
    "Documents array:",
    documents.map((doc) => ({ id: doc.id, title: doc.title }))
  );

  const handlePreview = (doc: UiDocument) => setPreviewDoc(doc);
  const handleClosePreview = () => setPreviewDoc(null);
  const handleAddDocument = (doc: unknown) => {
    // Debug: Log what we're receiving
    console.log("handleAddDocument received:", doc);

    // Map the API response to UI document type
    const apiDoc = doc as Record<string, unknown>; // API response from CreateContract
    const uiDoc: UiDocument = {
      id: String(apiDoc.id || `local-${Date.now()}`),
      title: (apiDoc.template_title as string) || "Untitled Document",
      description: (apiDoc.template_description as string) || "",
      category: "contract",
      uploadedBy: (apiDoc.created_by as string) || "Current User",
      createdAt: (apiDoc.created_at as string) || new Date().toISOString(),
      url: "#",
      templateType: (apiDoc.template_type as string) || "rent",
      versionNumber: (apiDoc.version_number as string) || "1.0",
      isActive:
        (apiDoc.is_active as boolean) !== undefined
          ? (apiDoc.is_active as boolean)
          : true,
      isDefault:
        (apiDoc.is_default as boolean) !== undefined
          ? (apiDoc.is_default as boolean)
          : false,
      updatedAt: (apiDoc.updated_at as string) || new Date().toISOString(),
      templateContent: (apiDoc.template_content as string) || "",
    };

    // Debug: Log what we're creating
    console.log("handleAddDocument created UI doc:", uiDoc);

    setLocalDocs((docs) => [uiDoc, ...docs]);
    setShowUpload(false);
  };

  const queryClient = useQueryClient();
  const mutations = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const handleDelete = (doc: UiDocument) => {
    setDeleteDoc(doc);
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = () => {
    if (deleteDoc) {
      mutations.mutate({ document_id: deleteDoc.id });
    }
    setShowDeleteModal(false);
    setDeleteDoc(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading documents...</div>;
  }
  if (isError) {
    return (
      <div className="p-8 text-red-500 text-center">
        Failed to load documents.
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <>
        <div className="flex flex-col justify-center items-center h-[60vh]">
          <div className="bg-gray-100 mb-6 p-6 rounded-full">
            <FileText className="w-16 h-16 text-gray-400" />
          </div>
          <h2 className="mb-2 font-semibold text-gray-700 text-2xl">
            No Documents Found
          </h2>
          <p className="mb-6 max-w-md text-gray-500 text-center">
            You haven&apos;t added any documents yet. Start by creating your
            first template to manage your documents efficiently.
          </p>
          <PermissionGate codename="add_document" showFallback={false}>
            <Button onClick={() => setShowUpload(true)} className="h-11">
              + Add Document
            </Button>
          </PermissionGate>
        </div>
        <PermissionGate codename="add_document" showFallback={false}>
          <CreateContract
            open={showUpload}
            onClose={() => setShowUpload(false)}
            onUpload={handleAddDocument}
          />
        </PermissionGate>
      </>
    );
  }

  return (
    <PermissionGate codename="view_document">
      <div className="">
        <div className="flex justify-end items-end mb-6">
          <PermissionGate codename="add_document" showFallback={false}>
            <Button className="h-11" onClick={() => setShowUpload(true)}>
              + Add Document
            </Button>
          </PermissionGate>
        </div>
        <DocumentGrid
          documents={documents}
          onPreview={handlePreview}
          onDelete={handleDelete}
        />
        {/* Show CreateContract in view mode for contract documents */}
        {previewDoc && previewDoc.category === "contract" && (
          <CreateContract
            open={!!previewDoc}
            onClose={handleClosePreview}
            mode="view"
            document={{
              template_title: previewDoc.title,
              template_description: previewDoc.description,
              template_type: previewDoc.templateType as "rent",
              template_content: previewDoc.templateContent || "",
              id: previewDoc.id,
            }}
          />
        )}
        {/* Show DocumentDetailModal for non-contract documents if needed */}
        {previewDoc && previewDoc.category !== "contract" && (
          <DocumentDetailModal
            open={!!previewDoc}
            document={previewDoc}
            onClose={handleClosePreview}
          />
        )}
        {/* Delete Document Confirmation Modal */}
        <PermissionGate codename="delete_document" showFallback={false}>
          <DeleteDocumentModal
            open={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeleteDoc(null);
            }}
            document={
              deleteDoc ? { id: deleteDoc.id, title: deleteDoc.title } : null
            }
            isPending={mutations.isPending}
            onConfirm={handleConfirmDelete}
          />
        </PermissionGate>
        <CreateContract
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onUpload={handleAddDocument}
        />
      </div>
    </PermissionGate>
  );
};

export default FetchDocuments;
