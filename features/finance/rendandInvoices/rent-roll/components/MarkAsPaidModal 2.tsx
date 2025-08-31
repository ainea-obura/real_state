import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MarkAsPaidModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    tenantName: string;
    tenantContact: string;
    unit: string;
    projectName: string;
    dueDate: string;
    balance: number;
    monthlyRent: number;
  };
}

const MarkAsPaidModal = ({ open, onClose, unit }: MarkAsPaidModalProps) => {
  const [amount, setAmount] = useState(unit.balance || unit.monthlyRent);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    onClose();
    // In real app, show toast here
    alert("Payment recorded!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-gray-600 text-sm">
            Tenant: <span className="font-medium">{unit.tenantName}</span> (
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
            Amount
          </label>
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setAmount(0);
              } else {
                const parsed = parseFloat(value);
                if (!isNaN(parsed) && parsed >= 0) {
                  setAmount(parsed);
                }
              }
            }}
            className="w-full text-xs"
          />
          <label className="block mt-2 mb-1 font-medium text-gray-700 text-xs">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs"
          />
          <label className="block mt-2 mb-1 font-medium text-gray-700 text-xs">
            Method
          </label>
          <Input
            type="text"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkAsPaidModal;
