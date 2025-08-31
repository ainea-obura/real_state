"use client";

import { format } from 'date-fns';
import { Calendar, Receipt } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { Payout } from '../schema';

interface ViewPayoutModalProps {
  open: boolean;
  onClose: () => void;
  payout: Payout;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const ViewPayoutModal = ({ open, onClose, payout }: ViewPayoutModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mt-10 sm:max-w-2xl h-[calc(100vh-100px)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-blue-100 rounded-full w-10 h-10">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg">
                Payout Details
              </DialogTitle>
              <DialogDescription>
                View detailed information about this payout
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 text-xl">
                {payout.payout_number}
              </h3>
              <p className="text-gray-600">
                Created on {format(new Date(payout.created_at), "PPP")}
              </p>
            </div>
            <Badge className={getStatusColor(payout.status)}>
              {getStatusLabel(payout.status)}
            </Badge>
          </div>

          {/* Owner and Property Information */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Owner Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-500 text-sm">
                    Name:
                  </span>
                  <p className="text-gray-900">{payout.owner_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500 text-sm">
                    Email:
                  </span>
                  <p className="text-gray-900">{payout.owner}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Property Information
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-500 text-sm">
                    Unit/House:
                  </span>
                  <p className="text-gray-900">{payout.property_node}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Details */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Payout Details</h4>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div>
                <span className="font-medium text-gray-500 text-sm">
                  Payout Date:
                </span>
                <p className="text-gray-900">{payout.payout_date ?? "-"}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Financial Summary</h4>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Rent Collected:</span>
                <span className="font-medium text-green-600">
                  {payout.rent_collected}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Charge:</span>
                <span className="font-medium text-red-600">
                  {payout.management_fee}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">Net Amount:</span>
                  <span className="font-bold text-green-600">
                    {payout.net_amount}
                  </span>
                </div>
              </div>
              <div className="bg-blue-50 mt-2 p-2 rounded text-gray-500 text-xs">
                <strong>Calculation:</strong> Rent Collected - Service Charge
                (conditional)
                <br />
                <em>
                  Service charge is only applied if there are NO owner
                  invoices with SERVICE_CHARGE items for the same month.
                </em>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payout.notes && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Notes</h4>
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  <p className="text-yellow-800 font-medium">{payout.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Created By */}
          <div className="text-gray-500 text-sm">Created by System</div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPayoutModal;
