"use client";

import { Building2, Calendar, Download, Eye, File, FileText, Image } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { OwnerDashboardResponse } from "./schema/ownerDashboardSchema";

interface OwnerDocumentsProps {
  dashboardData: OwnerDashboardResponse;
}

const OwnerDocuments = ({ dashboardData }: OwnerDocumentsProps) => {
  const { documents, stats } = dashboardData.data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-600" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <Image className="w-5 h-5 text-blue-600" />;
      case "doc":
      case "docx":
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "legal":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "insurance":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "lease":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "maintenance":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "photos":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return "text-red-600";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "text-blue-600";
      case "doc":
      case "docx":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  // Group documents by property
  const documentsByProperty = documents.reduce((acc, doc) => {
    if (!acc[doc.property_name]) {
      acc[doc.property_name] = [];
    }
    acc[doc.property_name].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">No Documents Found</h3>
          <p className="text-muted-foreground">
            No documents have been uploaded for this owner yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Property documents and files ({stats.total_documents} total)
          </p>
        </div>
      </div>

      {/* Document Statistics */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Documents
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total_documents}</div>
            <p className="text-muted-foreground text-xs">All uploaded files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Properties</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {Object.keys(documentsByProperty).length}
            </div>
            <p className="text-muted-foreground text-xs">
              Properties with documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Categories</CardTitle>
            <File className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {Object.keys(documentsByCategory).length}
            </div>
            <p className="text-muted-foreground text-xs">Document categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Recent Uploads
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {
                documents.filter((doc) => {
                  const docDate = new Date(doc.created_at);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return docDate > thirtyDaysAgo;
                }).length
              }
            </div>
            <p className="text-muted-foreground text-xs">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(documentsByCategory).map(
              ([category, categoryDocs]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      {categoryDocs.length} document
                      {categoryDocs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="gap-3 grid md:grid-cols-2 lg:grid-cols-3">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 hover:bg-muted/50 p-3 border rounded-lg transition-colors"
                      >
                        <div
                          className={`p-2 rounded-lg ${getFileTypeColor(
                            doc.file_type
                          )}`}
                        >
                          {getFileTypeIcon(doc.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {doc.title}
                          </div>
                          <div className="text-muted-foreground text-xs truncate">
                            {doc.property_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatDate(doc.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Property */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Documents by Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(documentsByProperty).map(
              ([propertyName, propertyDocs]) => (
                <div key={propertyName} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{propertyName}</h4>
                    <Badge variant="outline">
                      {propertyDocs.length} document
                      {propertyDocs.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="gap-3 grid md:grid-cols-2 lg:grid-cols-3">
                    {propertyDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 hover:bg-muted/50 p-3 border rounded-lg transition-colors"
                      >
                        <div
                          className={`p-2 rounded-lg ${getFileTypeColor(
                            doc.file_type
                          )}`}
                        >
                          {getFileTypeIcon(doc.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {doc.title}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            <Badge className={getCategoryColor(doc.category)}>
                              {doc.category}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatDate(doc.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .slice(0, 10)
              .map((doc) => (
                <div
                  key={doc.id}
                  className="flex justify-between items-center hover:bg-muted/50 p-4 border rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${getFileTypeColor(
                        doc.file_type
                      )}`}
                    >
                      {getFileTypeIcon(doc.file_type)}
                    </div>
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-muted-foreground text-sm">
                        {doc.property_name} • {doc.category}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Uploaded {formatDate(doc.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {documents.length > 10 && (
            <div className="mt-4 text-center">
              <Button variant="outline">
                View All Documents ({documents.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDocuments;
