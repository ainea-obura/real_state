import {
  FileText,
  Download,
  Eye,
  Calendar,
  File,
  Image,
  Video,
  Archive,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTenantDocuments,
  updateTenantDocumentStatus,
  uploadSignedDocument,
  TenantDocument,
} from "@/actions/documents/tenant";
import { PermissionGate } from '@/components/PermissionGate';

const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeColors = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-200 text-gray-700";
      case "pending":
        return "bg-yellow-200 text-yellow-700";
      case "signed":
        return "bg-green-200 text-green-700";
      case "active":
        return "bg-blue-200 text-blue-700";
      case "expired":
        return "bg-orange-200 text-orange-700";
      case "terminated":
        return "bg-red-200 text-red-700";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded ${getBadgeColors( status )}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Modal = ({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
        {children}
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
};

const TenantDocuments = ({ tenantId }: { tenantId: string }) => {
  // For demo, use a hardcoded userId. Replace with real user context/prop as needed.
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tenant-documents", tenantId],
    queryFn: () => fetchTenantDocuments(tenantId),
  });

  

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTenantDocumentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant-documents", tenantId],
      });
      setShowModal(false);
      setSelectedDoc(null);
      setNewStatus("");
    },
  });

  const signMutation = useMutation({
    mutationFn: ({ agreementId, file }: { agreementId: string; file: File }) =>
      uploadSignedDocument(agreementId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant-documents", tenantId],
      });
      setShowSignModal(false);
      setSelectedDoc(null);
      setSignedFile(null);
    },
  });

  const [selectedDoc, setSelectedDoc] = useState<TenantDocument | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signedFile, setSignedFile] = useState<File | null>(null);

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "document":
        return FileText;
      default:
        return File;
    }
  };

  const getFileCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case "main":
        return "Main Photo";
      case "floor_plan":
        return "Floor Plan";
      case "interior":
        return "Interior";
      case "exterior":
        return "Exterior";
      case "document":
        return "Document";
      case "thumbnail":
        return "Thumbnail";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const handleStatusChange = (doc: TenantDocument, status: string) => {
    setSelectedDoc(doc);
    setNewStatus(status);
    setShowModal(true);
  };

  const handleSignDocument = (doc: TenantDocument) => {
    setSelectedDoc(doc);
    setShowSignModal(true);
  };

  const confirmStatusChange = () => {
    if (selectedDoc) {
      mutation.mutate({ id: selectedDoc.id, status: newStatus });
    }
  };

  const confirmSignDocument = () => {
    if (selectedDoc && signedFile) {
      signMutation.mutate({ agreementId: selectedDoc.id, file: signedFile });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSignedFile(file);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center">Loading documents...</div>;
  }
  if (isError) {
    return (
      <div className="py-12 text-center text-red-500">
        Error loading documents:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const documents = data?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Documents</h1>
          <p className="text-muted-foreground">
            Manage and track all legal documents and agreements for this tenant
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="px-3 py-1 bg-blue-100 rounded-md">
            <span className="text-sm font-medium text-blue-700">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>



      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border-2 border-gray-300 border-dashed">
          <FileText className="mx-auto mb-4 w-16 h-16 text-gray-400" />
          <h3 className="mb-2 text-xl font-medium text-gray-900">
            No Documents Found
          </h3>
          <p className="text-gray-500">
            No documents have been uploaded for this tenant yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => {
            const FileIcon = getFileIcon(
              document.document_url?.endsWith(".jpg")
                ? "image"
                : document.document_url?.endsWith(".pdf")
                ? "document"
                : "file"
            );

            // Color scheme based on document status
            const getCardColors = (status: string) => {
              switch (status) {
                case "draft":
                  return {
                    bg: "bg-gray-50 hover:bg-gray-100",
                    iconBg: "bg-gray-200",
                    iconColor: "text-gray-600",
                    valueColor: "text-gray-600",
                  };
                case "pending":
                  return {
                    bg: "bg-yellow-50 hover:bg-yellow-100",
                    iconBg: "bg-yellow-200",
                    iconColor: "text-yellow-600",
                    valueColor: "text-yellow-600",
                  };
                case "signed":
                  return {
                    bg: "bg-green-50 hover:bg-green-100",
                    iconBg: "bg-green-200",
                    iconColor: "text-green-600",
                    valueColor: "text-green-600",
                  };
                case "active":
                  return {
                    bg: "bg-blue-50 hover:bg-blue-100",
                    iconBg: "bg-blue-200",
                    iconColor: "text-blue-600",
                    valueColor: "text-blue-600",
                  };
                case "expired":
                  return {
                    bg: "bg-orange-50 hover:bg-orange-100",
                    iconBg: "bg-orange-200",
                    iconColor: "text-orange-600",
                    valueColor: "text-orange-600",
                  };
                case "terminated":
                  return {
                    bg: "bg-red-50 hover:bg-red-100",
                    iconBg: "bg-red-200",
                    iconColor: "text-red-600",
                    valueColor: "text-red-600",
                  };
                default: // fallback
                  return {
                    bg: "bg-gray-50 hover:bg-gray-100",
                    iconBg: "bg-gray-200",
                    iconColor: "text-gray-600",
                    valueColor: "text-gray-600",
                  };
              }
            };

            const colors = getCardColors(document.status);

            return (
              <div
                key={document.id}
                className={`relative ${colors.bg} shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out rounded-lg`}
              >
                <div className="p-6">
                  <div className="flex flex-col gap-4">
                    {/* Header with Icon and Status */}
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <div className={`${colors.iconBg} p-2.5 rounded-md`}>
                          <FileIcon className={`w-5 h-5 ${colors.iconColor}`} />
                        </div>
                        <div className="flex flex-col justify-between items-start">
                          <h3 className="text-sm font-medium text-gray-900">
                            {document.template_title_snapshot ||
                              "Untitled Document"}
                          </h3>
                          <span
                            className={`text-lg font-semibold tracking-tight ${colors.valueColor}`}
                          >
                            {document.status.charAt(0).toUpperCase() +
                              document.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={document.status} />
                    </div>

                    {/* Document Details */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">Property</span>
                        <span className="text-xs font-medium text-gray-900 break-words">
                          {document.property_path}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Uploaded</span>
                        <span className="text-xs font-medium text-gray-900">
                          {new Date(document.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="flex flex-col gap-2 pt-2">
                      {/* View/Download Buttons - Always shown, positioned at end */}
                      <div className="flex gap-2 justify-end">
                        <a
                          href={document.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-300 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          <Eye className="inline mr-1 w-3 h-3" />
                          View
                        </a>
                        <a
                          href={document.document_url}
                          download
                          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-300 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          <Download className="inline mr-1 w-3 h-3" />
                          Download
                        </a>
                      </div>

                      {/* Sign Button - Only for Draft/Pending */}
                      {(document.status === "draft" ||
                        document.status === "pending") && (
                        <PermissionGate codename="edit_tenant_documents" showFallback={false}>
                        <button
                          onClick={() => handleSignDocument(document)}
                          disabled={signMutation.status === "pending"}
                          className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            document.status === "draft"
                              ? "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                              : "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                          }`}
                        >
                          {signMutation.status === "pending"
                            ? "Processing..."
                            : "Sign Document"}
                        </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <div>
          <h4 className="mb-2 text-lg font-bold">Are you sure?</h4>
          <p className="mb-4">
            You are about to change the status of{" "}
            <b>{selectedDoc?.template_title_snapshot}</b> to <b>{newStatus}</b>.
            This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmStatusChange}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              disabled={mutation.status === "pending"}
            >
              <PermissionGate codename="edit_tenant_documents" showFallback={false}>
              {mutation.status === "pending" ? "Updating..." : "Confirm"}
              </PermissionGate>
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              disabled={mutation.status === "pending"}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showSignModal} onClose={() => setShowSignModal(false)}>
        <div>
          <h4 className="mb-2 text-lg font-bold">Upload Signed Document</h4>
          <p className="mb-4">
            Please upload the signed version of{" "}
            <b>{selectedDoc?.template_title_snapshot}</b>.
          </p>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Signed Document File
            </label>
            <div className="flex justify-center items-center w-full">
              <label className="flex flex-col justify-center items-center w-full h-32 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-100">
                <div className="flex flex-col justify-center items-center pt-5 pb-6">
                  <Upload className="mb-2 w-8 h-8 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX (MAX. 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {signedFile && (
              <div className="p-2 mt-2 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-700">
                  Selected: {signedFile.name}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmSignDocument}
              className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={!signedFile || signMutation.status === "pending"}
            >
              <PermissionGate codename="edit_tenant_documents" showFallback={false}>
              {signMutation.status === "pending"
                ? "Uploading..."
                : "Upload & Sign"}
              </PermissionGate>
            </button>
            <button
              onClick={() => {
                setShowSignModal(false);
                setSignedFile(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TenantDocuments;
