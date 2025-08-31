"use client";

import { format } from 'date-fns';
import {
    AlertCircle, AlertTriangle, Building, Calendar, CheckCircle, Clock, DollarSign, FileText, Info,
    Percent, User, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Use the ModalPenalty interface from parent component
interface ModalPenalty {
  id: string;
  penaltyNumber: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  property: {
    unit: string;
    projectName: string;
  };
  penaltyType:
    | "late_payment"
    | "returned_payment"
    | "lease_violation"
    | "utility_overcharge"
    | "other";
  amount: number;
  amountType: "fixed" | "percentage";
  percentageOf?: number;
  dateApplied: string;
  dueDate: string;
  status: "pending" | "applied_to_invoice" | "waived" | "paid";
  linkedInvoice?: {
    id: string;
    invoiceNumber: string;
  };
  notes?: string;
  tenantNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  waivedAt?: string;
  waivedBy?: string;
  waivedReason?: string;
}

interface ViewPenaltyModalProps {
  open: boolean;
  onClose: () => void;
  penalty: ModalPenalty;
}

const ViewPenaltyModal = ({
  open,
  onClose,
  penalty,
}: ViewPenaltyModalProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          icon: Clock,
          className: "bg-amber-50 text-amber-700 border-amber-200",
          iconColor: "text-amber-600",
        };
      case "applied_to_invoice":
        return {
          label: "Applied to Invoice",
          icon: FileText,
          className: "bg-blue-50 text-blue-700 border-blue-200",
          iconColor: "text-blue-600",
        };
      case "waived":
        return {
          label: "Waived",
          icon: XCircle,
          className: "bg-gray-50 text-gray-700 border-gray-200",
          iconColor: "text-gray-600",
        };
      case "paid":
        return {
          label: "Paid",
          icon: CheckCircle,
          className: "bg-green-50 text-green-700 border-green-200",
          iconColor: "text-green-600",
        };
      default:
        return {
          label: "Unknown",
          icon: AlertCircle,
          className: "bg-gray-50 text-gray-700 border-gray-200",
          iconColor: "text-gray-600",
        };
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "late_payment":
        return {
          label: "Late Payment",
          icon: AlertTriangle,
          className: "bg-red-50 text-red-700 border-red-200",
          iconColor: "text-red-600",
        };
      case "returned_payment":
        return {
          label: "Returned Payment",
          icon: AlertTriangle,
          className: "bg-orange-50 text-orange-700 border-orange-200",
          iconColor: "text-orange-600",
        };
      case "lease_violation":
        return {
          label: "Lease Violation",
          icon: AlertTriangle,
          className: "bg-purple-50 text-purple-700 border-purple-200",
          iconColor: "text-purple-600",
        };
      case "utility_overcharge":
        return {
          label: "Utility Overcharge",
          icon: AlertTriangle,
          className: "bg-blue-50 text-blue-700 border-blue-200",
          iconColor: "text-blue-600",
        };
      default:
        return {
          label: "Other",
          icon: AlertTriangle,
          className: "bg-gray-50 text-gray-700 border-gray-200",
          iconColor: "text-gray-600",
        };
    }
  };

  const statusConfig = getStatusConfig(penalty.status);
  const typeConfig = getTypeConfig(penalty.penaltyType);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mt-10 p-0 min-w-4xl max-h-[calc(100vh-100px)] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-white px-6 py-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-gray-900 text-xl">
                  Penalty Details
                </DialogTitle>
                <p className="mt-1 text-gray-600 text-sm">
                  {penalty.penaltyNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge
                className={`${typeConfig.className} flex items-center gap-1`}
              >
                <TypeIcon className="w-3 h-3" />
                {typeConfig.label}
              </Badge>
              <Badge
                className={`${statusConfig.className} flex items-center gap-1`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Amount Summary Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-200 rounded-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white shadow-sm p-3 rounded-lg">
                  {penalty.amountType === "percentage" ? (
                    <Percent className="w-6 h-6 text-blue-600" />
                  ) : (
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-600 text-sm">
                    Penalty Amount
                  </p>
                  <p className="font-bold text-gray-900 text-3xl">
                    {penalty.amountType === "percentage"
                      ? `${penalty.amount}%`
                      : penalty.amount}
                  </p>
                  {penalty.amountType === "percentage" &&
                    penalty.percentageOf && (
                      <p className="mt-1 text-gray-500 text-sm">
                        of {penalty.percentageOf}
                      </p>
                    )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">Due Date</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {format(new Date(penalty.dueDate), "MMM dd, yyyy")}
                </p>
                <p className="text-gray-500 text-xs">
                  {format(new Date(penalty.dueDate), "EEEE")}
                </p>
              </div>
            </div>
          </div>

          <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
            {/* Penalty Information */}
            <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Info className="w-4 h-4 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Penalty Information
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Penalty Number
                  </span>
                  <span className="font-mono text-gray-900 text-sm">
                    {penalty.penaltyNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Date Applied
                  </span>
                  <span className="text-gray-900 text-sm">
                    {format(new Date(penalty.dateApplied), "MMM dd, yyyy")}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Created By
                  </span>
                  <span className="text-gray-900 text-sm">
                    {penalty.createdBy}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Created At
                  </span>
                  <span className="text-gray-900 text-sm">
                    {format(
                      new Date(penalty.createdAt),
                      "MMM dd, yyyy 'at' h:mm a"
                    )}
                  </span>
                </div>

                {penalty.waivedAt && (
                  <>
                    <Separator className="my-3" />
                    <div className="bg-amber-50 p-3 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-amber-800 text-sm">
                          Waiver Information
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-amber-700">Waived At:</span>
                          <span className="text-amber-900">
                            {format(
                              new Date(penalty.waivedAt),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-700">Waived By:</span>
                          <span className="text-amber-900">
                            {penalty.waivedBy}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-700">Reason:</span>
                          <span className="text-amber-900">
                            {penalty.waivedReason}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tenant Information */}
            <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Tenant Information
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Name
                  </span>
                  <span className="text-gray-900 text-sm">
                    {penalty.tenant.name}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Email
                  </span>
                  <span className="text-gray-900 text-sm">
                    {penalty.tenant.email}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-gray-100 border-b">
                  <span className="font-medium text-gray-600 text-sm">
                    Phone
                  </span>
                  <span className="text-gray-900 text-sm">
                    {penalty.tenant.phone}
                  </span>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Building className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">
                    Property Details
                  </span>
                </div>

                <div className="bg-green-50 p-3 border border-green-200 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Unit:</span>
                      <span className="text-green-900">
                        {penalty.property.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Project:</span>
                      <span className="text-green-900">
                        {penalty.property.projectName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Invoice */}
          {penalty.linkedInvoice && (
            <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Linked Invoice</h3>
              </div>

              <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        {penalty.linkedInvoice.invoiceNumber}
                      </p>
                      <p className="text-blue-700 text-sm">
                        Invoice has been applied
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 border-blue-200 text-blue-800">
                    Applied to Invoice
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {(penalty.notes || penalty.tenantNotes) && (
            <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-xl">
              <h3 className="mb-4 font-semibold text-gray-900">Notes</h3>

              <div className="space-y-4">
                {penalty.notes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-gray-100 p-1 rounded">
                        <Info className="w-3 h-3 text-gray-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">
                        Internal Notes
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {penalty.notes}
                      </p>
                    </div>
                  </div>
                )}

                {penalty.tenantNotes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-100 p-1 rounded">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">
                        Tenant Notes
                      </span>
                    </div>
                    <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {penalty.tenantNotes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-gray-200 border-t">
            <Button variant="outline" onClick={onClose} className="px-6">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPenaltyModal;
