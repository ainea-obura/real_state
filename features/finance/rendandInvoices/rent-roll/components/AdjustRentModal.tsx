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

interface AdjustRentModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    tenantName: string;
    unit: string;
    projectName: string;
    rent: number;
  };
}

const AdjustRentModal = ({ open, onClose, unit }: AdjustRentModalProps) => {
  const [newRent, setNewRent] = useState(unit.rent);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to adjust rent
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Rent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-2 text-gray-600 text-sm">
            Tenant: <span className="font-medium">{unit.tenantName}</span> |
            Unit: {unit.unit} ({unit.projectName})
          </div>
          <div>
            <Label>Current Rent</Label>
            <Input value={`$${unit.rent}`} disabled className="bg-gray-50" />
          </div>
          <div>
            <Label htmlFor="new-rent">New Rent</Label>
            <Input
              id="new-rent"
              type="number"
              min={0}
              value={newRent}
              onChange={(e) => setNewRent(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label htmlFor="effective-date">Effective Date</Label>
            <Input
              id="effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g. annual increase, market adjustment, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdjustRentModal;
