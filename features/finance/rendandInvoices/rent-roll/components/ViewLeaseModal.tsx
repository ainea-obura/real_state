import { CalendarDays, Download, FileText, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewLeaseModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    tenantName: string;
    unit: string;
    projectName: string;
    leaseStart: string;
    leaseEnd: string;
    monthlyRent?: number;
    leaseDocUrl?: string;
    signedDate?: string;
    approvedBy?: string;
    tenantInfo?: string;
  };
}

const ViewLeaseModal = ({ open, onClose, unit }: ViewLeaseModalProps) => {
  // Calculate lease duration in months (if dates are valid)
  let duration = "";
  if (unit.leaseStart && unit.leaseEnd) {
    const start = new Date(unit.leaseStart);
    const end = new Date(unit.leaseEnd);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1;
      duration = `${months} month${months !== 1 ? "s" : ""}`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lease Details</DialogTitle>
        </DialogHeader>
        <div className="mb-2 text-gray-600 text-sm">
          Tenant: <span className="font-medium">{unit.tenantName}</span> | Unit:{" "}
          <span className="font-medium">{unit.unit}</span> ({unit.projectName})
        </div>
        <div className="space-y-4">
          {/* Lease Period */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">Lease Period</div>
              <div className="text-gray-700 text-sm">
                {unit.leaseStart} – {unit.leaseEnd}
                {duration && (
                  <span className="ml-2 text-gray-500 text-xs">
                    ({duration})
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Monthly Rent */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
            <FileText className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">Monthly Rent</div>
              <div className="text-gray-700 text-sm">
                {unit.monthlyRent ? `$${unit.monthlyRent}` : "Not specified"}
              </div>
            </div>
          </div>
          {/* Agreement Document */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
            <StickyNote className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Lease Agreement</div>
              {unit.leaseDocUrl ? (
                <div className="space-y-1 mt-2">
                  <a
                    href={unit.leaseDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 text-sm hover:underline"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                  {unit.signedDate && (
                    <div className="text-gray-500 text-xs">
                      Signed: {unit.signedDate}
                    </div>
                  )}
                  {unit.approvedBy && (
                    <div className="text-gray-500 text-xs">
                      Approved by: {unit.approvedBy}
                    </div>
                  )}
                  {unit.tenantInfo && (
                    <div className="text-gray-500 text-xs">
                      {unit.tenantInfo}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-gray-400 text-sm">
                  No agreement document uploaded.
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLeaseModal;
