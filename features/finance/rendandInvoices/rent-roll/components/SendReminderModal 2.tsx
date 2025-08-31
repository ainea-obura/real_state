import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SendReminderModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    tenantName: string;
    tenantContact: string;
    unit: string;
    projectName: string;
    dueDate: string;
    balance: number;
    monthlyRent?: number;
    status?: string;
  };
}

const SendReminderModal = ({ open, onClose, unit }: SendReminderModalProps) => {
  // Mock invoice number for demonstration
  const invoiceNumber = `INV-${unit.unit}-${unit.dueDate || "N/A"}`;
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(
    `Dear ${unit.tenantName},\n\nThis is a reminder that your rent for unit ${
      unit.unit
    } (${unit.projectName}) is due on ${
      unit.dueDate
    }.\n\nInvoice: ${invoiceNumber}\nRent Amount: $${
      unit.monthlyRent ?? unit.balance
    }\nStatus: ${unit.status ?? "Unpaid"}\nOutstanding balance: $${
      unit.balance
    }.\n\nPlease make your payment promptly.\n\nThank you.`
  );

  const handleSend = async () => {
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSending(false);
    onClose();
    // In real app, show toast here
    alert("Reminder sent!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-gray-600 text-sm">
            To: <span className="font-medium">{unit.tenantName}</span> (
            {unit.tenantContact || "No contact"})
          </div>
          <div className="text-gray-500 text-xs">
            Unit: {unit.unit} ({unit.projectName})
          </div>
          <div className="text-gray-500 text-xs">Due: {unit.dueDate}</div>
          <div className="text-gray-500 text-xs">
            Outstanding: ${unit.balance}
          </div>
          <label className="block mt-2 mb-1 font-medium text-gray-700 text-xs">
            Message Preview
          </label>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="p-2 border rounded w-full font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} loading={sending} disabled={sending}>
            Send Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendReminderModal;
