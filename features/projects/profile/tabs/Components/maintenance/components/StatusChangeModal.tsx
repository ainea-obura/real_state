import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ChevronRight, X, Trash2 } from 'lucide-react';
import React from 'react';

const typeConfig: Record<string, { icon: React.ReactNode; title: string; message: (title?: string) => string; confirmText: string; confirmVariant?: string }> = {
  in_progress: {
    icon: <ChevronRight className="w-8 h-8 text-blue-600" />,
    title: 'Set In Progress',
    message: (t) => `Are you sure you want to mark${t ? ` "${t}"` : ''} as In Progress?`,
    confirmText: 'Set In Progress',
    confirmVariant: 'default',
  },
  resolved: {
    icon: <CheckCircle className="w-8 h-8 text-green-600" />,
    title: 'Set Resolved',
    message: (t) => `Are you sure you want to mark${t ? ` "${t}"` : ''} as Resolved?`,
    confirmText: 'Set Resolved',
    confirmVariant: 'success',
  },
  closed: {
    icon: <X className="w-8 h-8 text-red-600" />,
    title: 'Set Closed',
    message: (t) => `Are you sure you want to mark${t ? ` "${t}"` : ''} as Closed?`,
    confirmText: 'Set Closed',
    confirmVariant: 'destructive',
  },
  delete: {
    icon: <Trash2 className="w-8 h-8 text-red-600" />,
    title: 'Delete Request',
    message: (t) => `Are you sure you want to delete${t ? ` "${t}"` : ''}? This action cannot be undone!`,
    confirmText: 'Delete',
    confirmVariant: 'destructive',
  },
};

interface StatusChangeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'in_progress' | 'resolved' | 'closed' | 'delete';
  requestTitle?: string;
  loading?: boolean;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ open, onClose, onConfirm, type, requestTitle, loading }) => {
  const config = type ? typeConfig[type] : undefined;
  if (!type || !config) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex gap-3 items-center">
            {config.icon}
            <DialogTitle>{config.title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="py-4 text-gray-700">
          {config.message(requestTitle)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={config.confirmVariant as any} onClick={onConfirm} autoFocus disabled={loading}>
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusChangeModal; 