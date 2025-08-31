"use client";

import { Bell, Eye, FileText, MessageSquare, MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';

import type { RentRollProperty } from "@/features/finance/rendandInvoices/rent-roll/schema";
import { PermissionGate } from "@/components/PermissionGate";

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    unpaid: { label: "Unpaid", className: "bg-gray-100 text-gray-800" },
    partial: { label: "Partial", className: "bg-yellow-100 text-yellow-800" },
    late: { label: "Late", className: "bg-red-100 text-red-800" },
    vacant: { label: "Vacant", className: "bg-blue-100 text-blue-800" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;

  return (
    <div className="flex gap-2 items-center">
      <Badge className={config.className}>{config.label}</Badge>
      {status === "late" && <Bell className="w-4 h-4 text-red-500" />}
    </div>
  );
};

const PaymentProgressBar = ({ unit }: { unit: RentRollProperty }) => {
  if (unit.status === "vacant") return <span className="text-gray-400">-</span>;

  const percentage = unit.paymentProgress;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="overflow-hidden w-16 h-2 bg-gray-200 rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getProgressColor( percentage )}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="w-8 text-xs text-gray-600">{percentage}%</span>
    </div>
  );
};

interface RentRollColumnsActions {
  onSendReminder?: (unit: RentRollProperty) => void;
  onMarkAsPaid?: (unit: RentRollProperty) => void;
  onViewLedger?: (unit: RentRollProperty) => void;
  onViewLease?: (unit: RentRollProperty) => void;
  onAdjustRent?: (unit: RentRollProperty) => void;
  onAddPenalty?: (unit: RentRollProperty) => void;
}

export const columns = (
  actions: RentRollColumnsActions = {}
): ColumnDef<RentRollProperty>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: "property",
    header: "Property",
    cell: ({ row }) => {
      const projectName = row.original.projectName;

      // Parse the project hierarchy to show proper structure
      const hierarchyParts = projectName.split(" > ");
      const propertyName = hierarchyParts[hierarchyParts.length - 1]; // Last part is the property name
      const parentHierarchy = hierarchyParts.slice(0, -1); // Everything except the last part

      return (
        <div>
          <div className="font-medium text-gray-900">{propertyName}</div>
          {parentHierarchy.length > 0 && (
            <div className="text-xs text-gray-500">
              {parentHierarchy.join(" > ")}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "tenantAndLease",
    header: "Tenant",
    cell: ({ row }) => {
      const unit = row.original;
      const { tenantName, tenantContact, leaseStart, leaseEnd, status } = unit;
      const isVacant = status === "vacant";

      if (isVacant) {
        return (
          <div className="text-gray-400">
            <div className="font-medium">Vacant Unit</div>
            <div className="text-xs">Available for rent</div>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{tenantName}</div>
          {tenantContact && (
            <div className="text-xs text-gray-500">{tenantContact}</div>
          )}
          <div className="text-xs text-gray-600">
            <div>
              Lease: {formatDate(leaseStart)} - {formatDate(leaseEnd)}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "rentAndDeposit",
    header: "Rent",
    cell: ({ row }) => {
      const unit = row.original;
      const { monthlyRent, rentAmount, status } = unit;
      const isVacant = status === "vacant";

      if (isVacant) return <span className="text-gray-400">-</span>;

      return (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{monthlyRent}</div>
          <div className="text-xs text-gray-500">Total: {rentAmount}</div>
        </div>
      );
    },
  },

  {
    accessorKey: "servicesAmount",
    header: "Services",
    cell: ({ row }) => {
      const servicesAmount = row.getValue("servicesAmount") as string;
      const isVacant = row.original.status === "vacant";
      if (isVacant) return <span className="text-gray-400">-</span>;
      if (servicesAmount === "KES 0" || servicesAmount === "0")
        return <span className="text-gray-400">-</span>;
      return (
        <div className="font-medium text-purple-600">{servicesAmount}</div>
      );
    },
  },
  {
    accessorKey: "penaltiesAmount",
    header: "Penalties",
    cell: ({ row }) => {
      const penaltiesAmount = row.getValue("penaltiesAmount") as string;
      const isVacant = row.original.status === "vacant";
      if (isVacant) return <span className="text-gray-400">-</span>;
      if (penaltiesAmount === "KES 0" || penaltiesAmount === "0")
        return <span className="text-gray-400">-</span>;
      return <div className="font-medium text-red-600">{penaltiesAmount}</div>;
    },
  },

  {
    id: "paymentDates",
    header: "Invoice Dates",
    cell: ({ row }) => {
      const unit = row.original;
      const isVacant = unit.status === "vacant";

      if (isVacant) return <span className="text-gray-400">-</span>;

      return (
        <div className="space-y-1 text-sm">
          {/* Issue Date */}
          <div className="font-medium text-blue-600">
            Issued: {formatDate(unit.issueDate)}
          </div>

          {/* Due Date */}
          <div className="font-medium text-gray-900">
            Due: {formatDate(unit.dueDate)}
          </div>

          {/* Next Due Date */}
          {unit.nextDueDate && (
            <div className="text-gray-600">
              Next: {formatDate(unit.nextDueDate)}
            </div>
          )}

          {/* Last Payment */}
          {unit.lastPayment.date ? (
            <div className="text-xs text-gray-400">
              Last: {unit.lastPayment.amount} on{" "}
              {formatDate(unit.lastPayment.date)}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No payment recorded</div>
          )}
        </div>
      );
    },
  },
  {
    id: "paymentProgress",
    header: "Progress",
    cell: ({ row }) => {
      return <PaymentProgressBar unit={row.original} />;
    },
  },
  {
    id: "balanceAndPaid",
    header: "Balance",
    cell: ({ row }) => {
      const unit = row.original;
      const { balance, totalPaid, status } = unit;
      const isVacant = status === "vacant";

      if (isVacant) return <span className="text-gray-400">-</span>;

      // Check if balance is positive by looking for negative sign or zero
      const isPositive =
        !balance.includes("-") && balance !== "KES 0" && balance !== "0";

      return (
        <div className="space-y-1">
          <div
            className={`font-medium ${
              isPositive ? "text-red-600" : "text-green-600"
            }`}
          >
            {balance}
          </div>
          <div className="text-xs text-green-600">Paid: {totalPaid}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return getStatusBadge(status);
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const unit = row.original;
      const isVacant = unit.status === "vacant";

      if (!isVacant) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 w-8 h-8">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {unit.status !== "paid" && (
                <PermissionGate codename="set_rent_reminder" showFallback={false}>
                  <DropdownMenuItem
                    onClick={() => actions.onSendReminder?.(unit)}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <MessageSquare className="mr-2 w-4 h-4" />
                        Send Reminder
                      </div>
                      <div className="ml-6 text-xs text-gray-500">
                        Send SMS and email reminder
                      </div>
                    </div>
                  </DropdownMenuItem>
                </PermissionGate>
              )}

              <PermissionGate codename="view_rent_ledger" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onViewLedger?.(unit)}>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Eye className="mr-2 w-4 h-4" />
                      View Ledger
                    </div>
                    <div className="ml-6 text-xs text-gray-500">
                      View payment history
                    </div>
                  </div>
                </DropdownMenuItem>
              </PermissionGate>
              <PermissionGate codename="view_rent_lease" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onViewLease?.(unit)}>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <FileText className="mr-2 w-4 h-4" />
                      View Lease
                    </div>
                    <div className="ml-6 text-xs text-gray-500">
                      View lease agreement details
                    </div>
                  </div>
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
  },
];
