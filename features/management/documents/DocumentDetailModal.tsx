import React from 'react';

import {
    Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

import { Document } from './documentTypes';

interface DocumentDetailModalProps {
  open: boolean;
  document: Document | null;
  onClose: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  open,
  document,
  onClose,
}) => {
  if (!open || !document) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document.title}</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-gray-700">{document.description}</p>
        {document.url.endsWith(".pdf") ? (
          <iframe
            src={document.url}
            className="border w-full h-96"
            title="Document Preview"
          />
        ) : (
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Open Document
          </a>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="mt-4 px-4 py-2 border rounded-lg">
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentDetailModal;
