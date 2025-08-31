import React from "react";

import DocumentCard from "./DocumentCard";
import { Document } from "./documentTypes";

interface DocumentGridProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onPreview,
  onDelete,
}) => {
  if (!documents.length) {
    return (
      <div className="py-8 text-muted-foreground text-center">
        No documents found.
      </div>
    );
  }
  return (
    <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default DocumentGrid;
