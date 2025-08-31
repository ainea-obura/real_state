import { Calendar, DollarSign, FileText } from 'lucide-react';

import { InstallmentTableItem } from '@/actions/sales/installmentsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';

export const installmentsColumns: ColumnDef<InstallmentTableItem>[] = [
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
          <div className="bg-primary rounded-sm w-4 h-4" />
        ) : (
          <div className="border border-gray-300 rounded-sm w-4 h-4" />
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
          <div className="bg-primary rounded-sm w-4 h-4" />
        ) : (
          <div className="border border-gray-300 rounded-sm w-4 h-4" />
        )}
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "payment_number",
    header: "Payment #",
    cell: ({ row }) => {
      const installment = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-lg">
            {installment.payment_number}
          </span>
        </div>
      );
    },
  },

  {
    accessorKey: "dueDate",
    header: "Payment Details",
    cell: ({ row }) => {
      const installment = row.original;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-gray-900">
              {new Date(installment.dueDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-900">
              KES {installment.amount.toLocaleString()}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const installment = row.original;
      const statusConfig = {
        pending: {
          label: "Pending",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        },
        paid: {
          label: "Paid",
          className: "bg-green-100 text-green-800 border-green-200",
        },
        overdue: {
          label: "Overdue",
          className: "bg-red-100 text-red-800 border-red-200",
        },
        cancelled: {
          label: "Cancelled",
          className: "bg-gray-100 text-gray-800 border-gray-200",
        },
      };

      const config =
        statusConfig[installment.status as keyof typeof statusConfig];

      return (
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
          {installment.daysOverdue > 0 && (
            <div className="text-red-600 text-xs">
              {installment.daysOverdue} days overdue
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "paidAmount",
    header: "Payment History",
    cell: ({ row }) => {
      const installment = row.original;
      return (
        <div className="flex flex-col gap-1">
          {installment.status === "paid" ? (
            <>
              <div className="font-medium text-green-600 text-sm">
                Paid: KES {installment.paidAmount?.toLocaleString() || 0}
              </div>
              <div className="text-gray-500 text-xs">
                {installment.paidDate &&
                  new Date(installment.paidDate).toLocaleDateString()}
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">Not paid yet</div>
          )}
          {installment.lateFee > 0 && (
            <div className="text-red-600 text-xs">
              Late fee: KES {installment.lateFee.toLocaleString()}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const installment = row.original;
      return (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700 text-sm">
            {installment.notes || "No notes"}
          </span>
        </div>
      );
    },
  },
];
