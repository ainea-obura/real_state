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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddPenaltyModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    tenantName: string;
    unit: string;
    projectName: string;
  };
}

const AddPenaltyModal = ({ open, onClose, unit }: AddPenaltyModalProps) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to add penalty
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Penalty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-2 text-gray-600 text-sm">
            Tenant: <span className="font-medium">{unit.tenantName}</span> |
            Unit: {unit.unit} ({unit.projectName})
          </div>
          <div>
            <Label htmlFor="penalty-amount">Penalty Amount</Label>
            <Input
              id="penalty-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="penalty-date">Date</Label>
            <Input
              id="penalty-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="penalty-reason">Reason</Label>
            <Textarea
              id="penalty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g. late payment, returned check, etc."
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Penalty</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPenaltyModal;
