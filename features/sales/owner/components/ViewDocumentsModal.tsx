import {
    AlertCircle, Calendar, CheckCircle, Clock, Download, Eye, FileText, User, X,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ViewDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: any;
}

const ViewDocumentsModal: React.FC<ViewDocumentsModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  if (!isOpen) return null;

  const mockDocuments = [
    {
      id: 1,
      name: "Purchase Agreement",
      type: "Contract",
      status: "signed",
      uploadedBy: "Sarah Kimani",
      uploadDate: "15 Aug 2024",
      lastModified: "15 Aug 2024",
      size: "2.4 MB",
      format: "PDF",
      description: "Official purchase agreement between buyer and seller",
      tags: ["Legal", "Contract", "Required"],
      downloadCount: 3,
      version: "1.0",
    },
    {
      id: 2,
      name: "Title Deed",
      type: "Legal",
      status: "pending",
      uploadedBy: "System",
      uploadDate: "20 Aug 2024",
      lastModified: "20 Aug 2024",
      size: "1.8 MB",
      format: "PDF",
      description: "Property title deed and ownership documents",
      tags: ["Legal", "Ownership", "Required"],
      downloadCount: 1,
      version: "1.0",
    },
    {
      id: 3,
      name: "Building Approval Certificate",
      type: "Approval",
      status: "approved",
      uploadedBy: "City Council",
      uploadDate: "10 Jun 2024",
      lastModified: "10 Jun 2024",
      size: "3.2 MB",
      format: "PDF",
      description: "Official building approval from city council",
      tags: ["Approval", "Building", "Required"],
      downloadCount: 5,
      version: "1.0",
    },
    {
      id: 4,
      name: "Environmental Impact Assessment",
      type: "Assessment",
      status: "approved",
      uploadedBy: "Environmental Agency",
      uploadDate: "5 May 2024",
      lastModified: "5 May 2024",
      size: "4.1 MB",
      format: "PDF",
      description: "Environmental impact assessment report",
      tags: ["Assessment", "Environmental", "Required"],
      downloadCount: 2,
      version: "1.0",
    },
    {
      id: 5,
      name: "Payment Schedule",
      type: "Financial",
      status: "draft",
      uploadedBy: "Finance Team",
      uploadDate: "25 Aug 2024",
      lastModified: "25 Aug 2024",
      size: "0.8 MB",
      format: "Excel",
      description: "Detailed payment schedule and installment plan",
      tags: ["Financial", "Payment", "Optional"],
      downloadCount: 0,
      version: "1.0",
    },
    {
      id: 6,
      name: "Property Photos",
      type: "Media",
      status: "approved",
      uploadedBy: "Photography Team",
      uploadDate: "18 Aug 2024",
      lastModified: "18 Aug 2024",
      size: "15.6 MB",
      format: "ZIP",
      description: "High-quality property photographs and virtual tour",
      tags: ["Media", "Photos", "Optional"],
      downloadCount: 8,
      version: "1.0",
    },
    {
      id: 7,
      name: "Insurance Certificate",
      type: "Insurance",
      status: "pending",
      uploadedBy: "Insurance Company",
      uploadDate: "22 Aug 2024",
      lastModified: "22 Aug 2024",
      size: "1.2 MB",
      format: "PDF",
      description: "Property insurance certificate and policy details",
      tags: ["Insurance", "Required"],
      downloadCount: 1,
      version: "1.0",
    },
    {
      id: 8,
      name: "Maintenance Manual",
      type: "Manual",
      status: "approved",
      uploadedBy: "Property Management",
      uploadDate: "12 Aug 2024",
      lastModified: "12 Aug 2024",
      size: "5.7 MB",
      format: "PDF",
      description: "Property maintenance and care instructions",
      tags: ["Manual", "Maintenance", "Optional"],
      downloadCount: 4,
      version: "1.0",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "draft":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "draft":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "signed":
        return "Signed";
      case "approved":
        return "Approved";
      case "pending":
        return "Pending";
      case "draft":
        return "Draft";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesType = filterType === "all" || doc.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const documentTypes = Array.from(
    new Set(mockDocuments.map((doc) => doc.type))
  );
  const documentStatuses = Array.from(
    new Set(mockDocuments.map((doc) => doc.status))
  );

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Documents & Files
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.propertyName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Property Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.ownerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.propertyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-700 text-sm">
                  Total Documents: {mockDocuments.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700 text-sm">
                  Approved:{" "}
                  {
                    mockDocuments.filter(
                      (doc) =>
                        doc.status === "approved" || doc.status === "signed"
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex md:flex-row flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <FileText className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {documentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="hover:shadow-md p-4 border border-gray-200 hover:border-gray-300 rounded-lg transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">
                        {doc.name}
                      </h3>
                      <p className="text-gray-500 text-xs">{doc.type}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusColor(doc.status)}
                  >
                    {getStatusLabel(doc.status)}
                  </Badge>
                </div>

                <p className="mb-3 text-gray-600 text-xs line-clamp-2">
                  {doc.description}
                </p>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Size:</span>
                    <span className="font-medium text-gray-700">
                      {doc.size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Format:</span>
                    <span className="font-medium text-gray-700">
                      {doc.format}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Version:</span>
                    <span className="font-medium text-gray-700">
                      {doc.version}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-3 text-gray-500 text-xs">
                  <span>Uploaded by {doc.uploadedBy}</span>
                  <span>{doc.uploadDate}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Download className="w-3 h-3" />
                    <span>{doc.downloadCount} downloads</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="px-3 h-8">
                      <Eye className="mr-1 w-3 h-3" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="px-3 h-8">
                      <Download className="mr-1 w-3 h-3" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-3 w-12 h-12 text-gray-400" />
              <p className="text-gray-500">
                No documents found matching your criteria
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            Upload New Document
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewDocumentsModal;
