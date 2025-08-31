"use client";

import { CheckCircle2, Eye } from 'lucide-react';
import React from 'react';

import { PermissionGate } from '@/components/PermissionGate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';

import { Payout } from './schema';

interface ColumnsProps {
  onView: (payout: Payout) => void;
  onApprove: (id: string) => void;
}

export const createColumns = ({
  onView,
  onApprove,
}: ColumnsProps): ColumnDef<Payout>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="accent-blue-600"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all payouts"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="accent-blue-600"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        aria-label="Select payout"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
    maxSize: 32,
  },
  {
    accessorKey: "payout_number",
    header: "Payout Number",
    cell: ({ row }) => {
      const payout = row.original;
      // Prefer payout_date, fallback to created_at, else '-'
      let dateStr = "-";
      if (payout.payout_date) {
        dateStr = new Date(payout.payout_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } else if (payout.created_at) {
        dateStr = new Date(payout.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return (
        <div className="font-medium text-gray-900">
          {payout.payout_number}
          <div className="mt-1 font-normal text-gray-500 text-xs">
            <span>Date: {dateStr}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const payout = row.original;
      return (
        <div>
          <div className="font-medium text-gray-900">
            {`${payout.owner_name}`} - {payout.property_node}
          </div>
          <div className="text-gray-500 text-sm">{payout.owner}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "rent_collected",
    header: "Rent Collected",
    cell: ({ row }) => {
      const payout = row.original;
      // Helper to check if value is zero (handles 'KES 0', '0', etc.)
      const isZero = (val: string) =>
        /(?:^|\s)0(?:$|\s|,)/.test(val.replace(/[^\d]/g, ""));

      // Extract numeric values for comparison
      const getNumber = (val: string) => {
        const parts = val.split(" ");
        return parts[1] ? parseFloat(parts[1].replace(/,/g, "")) : NaN;
      };

      const expectedRent = getNumber(payout.expected_rent);
      const collectedRent = getNumber(payout.rent_collected);

      return (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">
            {payout.rent_collected}
          </div>
          <div className="flex flex-col text-gray-700 text-xs">
            {!isZero(payout.expected_rent) && (
              <span>
                <span className="font-medium">Expected:</span>{" "}
                {payout.expected_rent}
              </span>
            )}
            {!isZero(payout.uncollected_rent) && (
              <span>
                <span className="font-medium">Uncollected:</span>{" "}
                {payout.uncollected_rent}
              </span>
            )}
            {!isNaN(expectedRent) &&
              !isNaN(collectedRent) &&
              expectedRent > 0 && (
                <span
                  className={`font-medium ${
                    collectedRent >= expectedRent
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {collectedRent >= expectedRent ? "✓" : "⚠"} {collectedRent}/
                  {expectedRent} collected
                </span>
              )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "management_fee",
    header: "Service Charge",
    cell: ({ row }) => {
      const payout = row.original;
      // Extract numbers from strings like 'KES 1,300'
      const getNumber = (val: string) => {
        const parts = val.split(" ");
        return parts[1] ? parseFloat(parts[1].replace(/,/g, "")) : NaN;
      };
      const serviceCharge = getNumber(payout.management_fee);
      const rent = getNumber(payout.rent_collected);

      // Check if service charge is applied (non-zero)
      const isApplied = !isNaN(serviceCharge) && serviceCharge > 0;
      const hasRentCollected = !isNaN(rent) && rent > 0;

      return (
        <div className="space-y-1">
          <span className="font-medium text-gray-900">
            {payout.management_fee}
          </span>
          {isApplied ? (
            <div className="bg-blue-50 px-2 py-1 rounded text-blue-600 text-xs">
              Applied (unpaid owner invoices)
            </div>
          ) : !hasRentCollected ? (
            <div className="bg-gray-50 px-2 py-1 rounded text-gray-500 text-xs">
              Not applied (no rent collected)
            </div>
          ) : (
            <div className="bg-gray-50 px-2 py-1 rounded text-gray-500 text-xs">
              Not applied (no unpaid invoices)
            </div>
          )}
          {/* Display notes if they exist */}
          {payout.notes && (
            <div className="bg-yellow-50 px-2 py-1 border-yellow-400 border-l-2 rounded text-yellow-700 text-xs">
              <span className="font-medium">Note:</span> {payout.notes}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "net_amount",
    header: "Net Amount",
    cell: ({ row }) => {
      const payout = row.original;
      // Split by space, get the number part (index 1)
      const parts = payout.net_amount.split(" ");
      const num = parts[1] ? parseFloat(parts[1].replace(/,/g, "")) : NaN;
      let color = "text-gray-900";
      if (!isNaN(num)) {
        if (num < 0) color = "text-red-600";
        else if (num > 0) color = "text-green-600";
      }
      return (
        <span className={`font-medium ${color}`}>{payout.net_amount}</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const payout = row.original;
      return (
        <span
          className={`px-2 py-1 rounded text-xs ${
            payout.status === "completed"
              ? "bg-green-100 text-green-800"
              : payout.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : payout.status === "failed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const payout = row.original;
      if (!payout.notes) {
        return <span className="text-gray-400 text-xs">-</span>;
      }
      return (
        <div className="max-w-xs">
          <div className="bg-yellow-50 px-2 py-1 border-yellow-400 border-l-2 rounded text-yellow-700 text-xs">
            {payout.notes}
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payout = row.original;
      return (
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <PermissionGate codename="view_disbursment" showFallback={false}>
              <button
                className="group flex justify-center items-center bg-primary/10 hover:bg-primary rounded-md w-8 h-8 hover:text-white transition-all duration-300 cursor-pointer"
                onClick={() => onView(payout)}
                aria-label="View Payout Details"
              >
                <Eye className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
              </button>
            </PermissionGate>

            {(payout.status === "pending" || payout.status === "partial") && (
              <PermissionGate codename="approve_payouts" showFallback={false}>
                {(() => {
                  // Extract numeric values for comparison
                  const getNumber = (val: string) => {
                    const parts = val.split(" ");
                    return parts[1]
                      ? parseFloat(parts[1].replace(/,/g, ""))
                      : NaN;
                  };
                  const netAmount = getNumber(payout.net_amount);
                  const canApprove = !isNaN(netAmount) && netAmount > 0;
                  const tooltipMsg = !canApprove
                    ? "Cannot approve: Net amount must be greater than 0."
                    : undefined;
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="group flex justify-center items-center bg-green-200 hover:bg-green-400 rounded-md w-8 h-8 hover:text-white transition-all duration-300 cursor-pointer"
                          onClick={() => canApprove && onApprove(payout.id)}
                          aria-label="Approve Payout"
                          disabled={!canApprove}
                          title={
                            !canApprove
                              ? "Cannot approve: Net amount must be greater than 0."
                              : undefined
                          }
                          style={!canApprove ? { opacity: 0.5 } : undefined}
                        >
                          <CheckCircle2 className="w-[18px] h-[18px] text-green-600 group-hover:text-green-600 transition-all duration-300" />
                        </button>
                      </TooltipTrigger>
                      {!canApprove && (
                        <TooltipContent side="top" className="!w-40">
                          {tooltipMsg}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })()}
              </PermissionGate>
            )}
          </div>
          {payout.status === "completed" && payout.approved_by && (
            <div className="mt-1 text-gray-500 text-xs">
              Approved by: {payout.approved_by}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
