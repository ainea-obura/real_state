import { formatDate } from 'date-fns';
import { Download, Eye, File, FileSignature, FileText, Star, Trash2, User } from 'lucide-react';
import React from 'react';

import { PermissionGate } from '@/components/PermissionGate';

import { Document } from './documentTypes';

interface DocumentCardProps {
  document: Document;
  onPreview: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const getFileIcon = () => {
  return <File className="w-8 h-8 text-red-500" />;
};

// Function to format template type for display
const formatTemplateType = (templateType: string): string => {
  switch (templateType) {
    case "rent":
      return "Rent";
    case "offer_letter":
      return "Offer";
    case "sales_agreement":
      return "Sales";
    default:
      return templateType.charAt(0).toUpperCase() + templateType.slice(1);
  }
};

// Function to get badge color based on template type
const getBadgeColor = (templateType: string): string => {
  switch (templateType) {
    case "rent":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "offer_letter":
      return "bg-green-100 text-green-800 border-green-200";
    case "sales_agreement":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const badgeConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  contract: {
    color: "bg-blue-100 text-blue-800",
    icon: <FileSignature className="mr-1 w-4 h-4" />,
  },
  agreement: {
    color: "bg-green-100 text-green-800",
    icon: <FileSignature className="mr-1 w-4 h-4" />,
  },
  id: {
    color: "bg-yellow-100 text-yellow-800",
    icon: <User className="mr-1 w-4 h-4" />,
  },
  template: {
    color: "bg-purple-100 text-purple-800",
    icon: <FileSignature className="mr-1 w-4 h-4" />,
  },
  other: {
    color: "bg-gray-100 text-gray-800",
    icon: <FileText className="mr-1 w-4 h-4" />,
  },
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
  signed: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-800",
};

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onPreview,
  onDelete,
}) => {
  return (
    <div
      className="group flex flex-col bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl h-full overflow-hidden hover:scale-105 transition-all duration-200"
      style={{ boxShadow: "none" }}
    >
      {/* Icon area with glassmorphism */}
      <div className="relative flex justify-center items-center bg-gradient-to-br from-white/60 to-blue-50/60 border-gray-100 border-b h-28">
        <div className="flex justify-center items-center bg-white/40 backdrop-blur-md p-4 border border-blue-100 rounded-full">
          {getFileIcon(document.url)}
        </div>
        {document.isDefault && (
          <span className="top-2 right-2 absolute flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded-full font-semibold text-yellow-800 text-xs">
            <Star className="mr-1 w-4 h-4" />
            Default
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 gap-2 p-5">
        {/* Badge with icon */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeColor(
              document.templateType
            )}`}
          >
            {formatTemplateType(document.templateType)}
          </span>

          {document.versionNumber && (
            <span className="inline-flex items-center bg-gray-100 ml-1 px-2 py-0.5 rounded-full text-gray-700 text-xs">
              v{document.versionNumber}
            </span>
          )}
          {document.isActive !== undefined && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ml-1 ${
                document.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {document.isActive ? "Active" : "Inactive"}
            </span>
          )}
          {document.status && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ml-1 ${
                statusColors[document.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {document.status}
            </span>
          )}
        </div>
        <div className="font-bold text-lg truncate" title={document.title}>
          {document.title}
        </div>

        {/* Tags */}

        <div className="flex flex-col justify-between items-start gap-2 mt-auto pt-2 text-gray-400 text-xs">
          <span className="flex items-start gap-1">
            <User className="w-4 h-4" />
            {document.uploadedBy || "-"}
          </span>
          <span>
            Created At:{" "}
            {formatDate(document.createdAt || new Date(), "MMM dd, yyyy")}
          </span>
        </div>
        {/* Divider */}
        <div className="my-2 border-gray-200 border-t border-dashed" />
        {/* Actions: always visible now */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onPreview(document)}
            className="group/action relative hover:bg-green-50 p-2 rounded-full transition"
            title="Preview"
            tabIndex={-1}
          >
            <Eye className="w-5 h-5" />
          </button>
          <PermissionGate codename="delete_document" showFallback={false}>
            <button
              onClick={() => onDelete(document)}
              className="group/action relative hover:bg-red-50 p-2 rounded-full transition"
              title="Delete"
              tabIndex={-1}
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
