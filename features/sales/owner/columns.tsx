import { useSetAtom } from 'jotai';
import {
    AlertCircle, Building2, Calendar, CheckSquare, Clock, CreditCard, DollarSign, Eye, Mail,
    MoreHorizontal, Phone, Square, TrendingUp, User, Users, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    assignSalesPersonModalOpenAtom, salesHistoryModalOpenAtom,
    selectedOwnerPropertyForAssignmentAtom, selectedSaleForHistoryAtom,
    removeSalesPersonModalOpenAtom,
} from '@/store';
import { ColumnDef } from '@tanstack/react-table';

// Actions component that can use hooks
const ActionsCell = ({ ownerProperty }: { ownerProperty: OwnerProperty }) => {
  const isOnTrack = ownerProperty.status === "on-track";
  const isBehind = ownerProperty.status === "behind";
  const isCompleted = ownerProperty.status === "completed";

  // Use store atoms to open modal
  const setSalesHistoryModalOpen = useSetAtom(salesHistoryModalOpenAtom);
  const setSelectedSaleForHistory = useSetAtom(selectedSaleForHistoryAtom);
  const setAssignSalesPersonModalOpen = useSetAtom(
    assignSalesPersonModalOpenAtom
  );
  const setSelectedOwnerPropertyForAssignment = useSetAtom(
    selectedOwnerPropertyForAssignmentAtom
  );
  const setRemoveSalesPersonModalOpen = useSetAtom(
    removeSalesPersonModalOpenAtom
  );

  const handleOpenSalesHistory = () => {
    setSelectedSaleForHistory({
      saleId: ownerProperty.saleId || ownerProperty.id, // fallback to id if no saleId
      ownerProperty: ownerProperty,
    });
    setSalesHistoryModalOpen(true);
  };

  const handleOpenAssignSalesPerson = () => {
    setSelectedOwnerPropertyForAssignment({
      id: ownerProperty.id,
      ownerName: ownerProperty.ownerName,
      propertyName: ownerProperty.propertyName,
      status: ownerProperty.status,
      assignedSalesPerson: ownerProperty.assignedSalesPerson,
    });
    setAssignSalesPersonModalOpen(true);
  };

  const handleOpenRemoveSalesPerson = () => {
    setSelectedOwnerPropertyForAssignment({
      id: ownerProperty.id,
      ownerName: ownerProperty.ownerName,
      propertyName: ownerProperty.propertyName,
      status: ownerProperty.status,
      assignedSalesPerson: ownerProperty.assignedSalesPerson,
    });
    setRemoveSalesPersonModalOpen(true);
  };

  return (
    <div className="flex justify-center items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 w-8 h-8">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Always visible actions */}
          <DropdownMenuItem onClick={handleOpenSalesHistory}>
            <Eye className="mr-2 w-4 h-4" />
            Sales History
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOpenAssignSalesPerson}>
            <User className="mr-2 w-4 h-4" />
            Assign Sales Person
          </DropdownMenuItem>

          {/* Show Remove option only if sales person is assigned */}
          {ownerProperty.assignedSalesPerson && (
            <DropdownMenuItem 
              onClick={handleOpenRemoveSalesPerson}
              className="text-red-600 focus:text-red-600"
            >
              <X className="mr-2 w-4 h-4" />
              Remove Sales Person
            </DropdownMenuItem>
          )}

          {/* Conditional actions based on status */}
          {!isCompleted && !isOnTrack && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Mail className="mr-2 w-4 h-4" />
                Send Reminder
              </DropdownMenuItem>
            </>
          )}

          {/* Actions for behind schedule */}
          {isBehind && (
            <DropdownMenuItem className="text-yellow-600 focus:text-yellow-600">
              <Calendar className="mr-2 w-4 h-4" />
              Reschedule Payment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export interface OwnerProperty {
  id: string;
  saleId?: string; // Add saleId for installments lookup
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPhoto?: string;
  assignedSalesPerson: {
    name: string;
    employee_id: string;
    email: string;
    phone: string;
    is_active: boolean;
    is_available: boolean;
  };
  status: "on-track" | "behind" | "at-risk" | "completed";
  projectName: string;
  propertyName: string;
  ownershipPercentage: number;
  coOwners?: string[];
  installmentPlan: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    nextDueDate: string;
    nextDueAmount: number;
    totalInstallments: number;
    completedInstallments: number;
  };
  lastActivity: string;
  paymentHistory: {
    lastPaymentDate: string;
    lastPaymentAmount: number;
    missedPayments: number;
  };
}

export const columns: ColumnDef<OwnerProperty, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Button
        variant="ghost"
        size="sm"
        className="p-0 w-8 h-8"
        onClick={() =>
          table.toggleAllPageRowsSelected(!!table.getIsAllPageRowsSelected())
        }
      >
        {table.getIsAllPageRowsSelected() ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="p-0 w-8 h-8"
        onClick={() => row.toggleSelected(!row.getIsSelected())}
      >
        {row.getIsSelected() ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ownerName",
    header: "Buyer Info",
    cell: ({ row }) => {
      const ownerProperty = row.original;
      return (
        <div className="flex flex-col gap-2">
          {/* Buyer Name */}
          <div className="font-semibold text-gray-900">
            {ownerProperty.ownerName}
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Phone className="w-3 h-3" />
            <span className="truncate">{ownerProperty.ownerPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Mail className="w-3 h-3" />
            <span className="truncate">{ownerProperty.ownerEmail}</span>
          </div>

          {/* Ownership Percentage */}
          <div className="font-medium text-green-600 text-xs">
            {ownerProperty.ownershipPercentage}% Ownership
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "projectName",
    header: "Property",
    cell: ({ row }) => {
      const ownerProperty = row.original;
      return (
        <div className="flex flex-col gap-2">
          {/* Project Name */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900 text-sm">
              {ownerProperty.projectName}
            </span>
          </div>

          {/* Property Name */}
          <div className="text-gray-600 text-sm">
            {ownerProperty.propertyName}
          </div>

          {/* Co-owners if any */}
          {ownerProperty.coOwners && ownerProperty.coOwners.length > 0 && (
            <div className="text-gray-500 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Co-owners: {ownerProperty.coOwners.join(", ")}</span>
              </div>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "financial",
    header: "Financial Status",
    cell: ({ row }) => {
      const ownerProperty = row.original;
      const progress =
        (ownerProperty.installmentPlan.completedInstallments /
          ownerProperty.installmentPlan.totalInstallments) *
        100;

      return (
        <div className="flex flex-col gap-3 min-w-[200px]">
          {/* Total Amount & Progress */}

          {/* Progress Bar */}
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-gray-600">Progress</span>
            <span className="font-semibold text-gray-900">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="bg-gray-200 rounded-full w-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Payment Summary */}
          <div className="space-y-2 text-gray-600 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Total:</span>
              <span className="font-semibold text-gray-900 text-sm">
                KES {ownerProperty.installmentPlan.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Paid:</span>
              <span className="font-medium text-green-600 text-sm">
                KES {ownerProperty.installmentPlan.paidAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Remaining:</span>
              <span className="font-medium text-orange-600 text-sm">
                KES{" "}
                {ownerProperty.installmentPlan.remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "paymentSchedule",
    header: "Payment Schedule",
    cell: ({ row }) => {
      const ownerProperty = row.original;
      const { installmentPlan } = ownerProperty;

      return (
        <div className="flex flex-col gap-2 min-w-[120px]">
          {/* Installment Info with Amount Below */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-900 text-sm">
                {installmentPlan.completedInstallments}/
                {installmentPlan.totalInstallments} Installments
              </span>
            </div>
            <div className="ml-6 text-gray-600 text-xs">
              KES {installmentPlan.nextDueAmount.toLocaleString()}
            </div>
          </div>

          {/* Due Date - One Line */}
          <div className="bg-blue-50 p-2 border rounded">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-blue-600" />
              <span className="font-medium text-blue-900 text-xs">Due:</span>
              <span className="font-semibold text-blue-800 text-xs">
                {installmentPlan.nextDueDate}
              </span>
            </div>
          </div>

          {/* Payment Frequency */}
          <div className="text-gray-500 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium">Monthly</span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const ownerProperty = row.original;
      const statusConfig = {
        "on-track": {
          label: "On Track",
          className: "bg-green-100 text-green-800 border-green-200",
          icon: TrendingUp,
        },
        behind: {
          label: "Behind",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: AlertCircle,
        },
        "at-risk": {
          label: "At Risk",
          className: "bg-red-100 text-red-800 border-red-200",
          icon: AlertCircle,
        },
        completed: {
          label: "Completed",
          className: "bg-blue-100 text-blue-800 border-blue-200",
          icon: CheckSquare,
        },
      };
      const config = statusConfig[ownerProperty.status];

      return (
        <div className="flex flex-col gap-2">
          {/* Status Badge */}
          <Badge variant="outline" className={config.className}>
            <config.icon className="mr-1 w-3 h-3" />
            {config.label}
          </Badge>

          {/* Payment History */}
          <div className="text-gray-500 text-xs">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>
                Last Payment: {ownerProperty.paymentHistory.lastPaymentDate}
              </span>
            </div>
            {ownerProperty.paymentHistory.missedPayments > 0 && (
              <div className="flex items-center gap-1 mt-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {ownerProperty.paymentHistory.missedPayments} missed
                </span>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "salesPerson",
    header: "Sales Agent",
    cell: ({ row }) => {
      const ownerProperty = row.original;

      return (
        <div className="flex flex-col gap-2">
          {/* Sales Person Name */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-gray-900 text-sm">
              {ownerProperty.assignedSalesPerson?.name || "Unassigned"}
            </span>
          </div>

          {/* Sales Person Contact Info */}
          <div className="text-gray-600 text-xs">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>{ownerProperty.assignedSalesPerson?.email || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{ownerProperty.assignedSalesPerson?.phone || "N/A"}</span>
            </div>
          </div>

          {/* Sales Person Status */}
          <div className="text-xs">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                ownerProperty.assignedSalesPerson?.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {ownerProperty.assignedSalesPerson?.is_active
                ? "Active"
                : "Inactive"}
            </span>
            {ownerProperty.assignedSalesPerson?.is_available && (
              <span className="inline-flex items-center bg-blue-100 ml-1 px-2 py-1 rounded-full font-medium text-blue-800 text-xs">
                Available
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell ownerProperty={row.original} />,
  },
];
