import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

import type { Transaction } from "@/features/finance/transactions/schema";

interface TransactionDetailModalProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailModal({
  open,
  transaction,
  onClose,
}: TransactionDetailModalProps) {
  if (!transaction) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Full details for transaction #{transaction.id}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <div>
            <span className="font-medium">Date:</span> {transaction.date}
          </div>
          <div>
            <span className="font-medium">Name:</span>{" "}
            {transaction.tenant?.name}
          </div>
          <div>
            <span className="font-medium">User Type:</span>{" "}
            {["Rent", "Utility", "Late Fee"].includes(transaction.type)
              ? "Tenant"
              : "Owner"}
          </div>
          <div>
            <span className="font-medium">Property:</span>{" "}
            {transaction.property}
          </div>
          <div>
            <span className="font-medium">Unit:</span> {transaction.unit}
          </div>
          <div>
            <span className="font-medium">Type:</span> {transaction.type}
          </div>
          <div>
            <span className="font-medium">Amount:</span> $
            {transaction.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div>
            <span className="font-medium">Status:</span> {transaction.status}
          </div>
          <div>
            <span className="font-medium">Method:</span>{" "}
            {transaction.method || "—"}
          </div>
          {transaction.notes && (
            <div>
              <span className="font-medium">Notes:</span> {transaction.notes}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
