"use client";

import { formatDate } from 'date-fns';
import { Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

// Define the data structure for sales documents
export interface SalesDocument {
  id: string;
  buyer: {
    name: string;
    phone: string;
    email: string;
  };
  property: {
    project: string;
    block?: string;
    floor?: string;
    unit?: string;
    houseName?: string;
  };
  offerLetter: {
    documentLink: string;
    dueDate: string;
    status: "active" | "expired" | "accepted" | "rejected";
    documentName: string;
  } | null;
  agreement: {
    documentLink: string;
    status: "draft" | "pending" | "signed" | "expired";
    documentName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get status badge variant
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
    case "signed":
      return "default";
    case "pending":
      return "secondary";
    case "expired":
    case "rejected":
      return "destructive";
    case "draft":
      return "outline";
    default:
      return "secondary";
  }
};

export const columns: ColumnDef<SalesDocument>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "buyer",
    header: "Buyer Information",
    cell: ({ row }) => {
      const buyer = row.getValue("buyer") as SalesDocument["buyer"];
      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{buyer.name}</div>
          <div className="text-gray-500 text-xs">{buyer.phone}</div>
          <div className="text-gray-500 text-xs">{buyer.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "property",
    header: "Property Information",
    cell: ({ row }) => {
      const property = row.getValue("property") as SalesDocument["property"];

      if (property.houseName) {
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{property.project}</div>
            <div className="text-gray-500 text-xs">{property.houseName}</div>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{property.project}</div>
          <div className="text-gray-500 text-xs">
            {[
              property.block && `Block ${property.block}`,
              property.floor && `Floor ${property.floor}`,
              property.unit && `Unit ${property.unit}`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "offerLetter",
    header: "Offer Letter",
    cell: ({ row }) => {
      const offerLetter = row.getValue(
        "offerLetter"
      ) as SalesDocument["offerLetter"];

      if (!offerLetter) {
        return (
          <div className="text-gray-400 text-sm italic">No offer letter</div>
        );
      }

      // Truncate document name to save space
      const truncatedName =
        offerLetter.documentName.length > 25
          ? offerLetter.documentName.substring(0, 25) + "..."
          : offerLetter.documentName;

      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => window.open(offerLetter.documentLink, "_blank")}
              title={offerLetter.documentName} // Show full name on hover
            >
              {truncatedName}
            </Button>
            <div className="text-gray-500 text-xs">
              {offerLetter.status === "accepted"
                ? `Accepted: ${formatDate(
                    new Date(row.original.updatedAt),
                    "MMM dd, yyyy"
                  )}`
                : `Due: ${formatDate(
                    new Date(offerLetter.dueDate),
                    "MMM dd, yyyy"
                  )}`}
            </div>
          </div>
          <Badge
            variant={getStatusBadgeVariant(offerLetter.status)}
            className="text-xs"
          >
            {offerLetter.status.charAt(0).toUpperCase() +
              offerLetter.status.slice(1)}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "agreement",
    header: "Agreement",
    cell: ({ row }) => {
      const agreement = row.getValue("agreement") as SalesDocument["agreement"];

      if (!agreement) {
        return <div className="text-gray-400 text-sm italic">No agreement</div>;
      }

      // Truncate document name to save space
      const truncatedName =
        agreement.documentName.length > 25
          ? agreement.documentName.substring(0, 25) + "..."
          : agreement.documentName;

      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => window.open(agreement.documentLink, "_blank")}
              title={agreement.documentName} // Show full name on hover
            >
              {truncatedName}
            </Button>
            <div className="text-gray-500 text-xs">
              Created:{" "}
              {formatDate(new Date(row.original.createdAt), "MMM dd, yyyy")}
            </div>
          </div>
          <Badge
            variant={getStatusBadgeVariant(
              agreement.status === "draft" || agreement.status === "expired"
                ? "pending"
                : agreement.status
            )}
            className="text-xs"
          >
            {agreement.status === "draft" || agreement.status === "expired"
              ? "pending"
              : agreement.status}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const agreement = row.getValue("agreement") as SalesDocument["agreement"];

      if (!agreement) {
        return (
          <div className="text-gray-400 text-sm text-center italic">
            No agreement to sign
          </div>
        );
      }

      const isSigned = agreement.status === "signed";

      if (isSigned) {
        return (
          <div className="text-gray-500 text-xs text-center italic">
            Document already signed
          </div>
        );
      }

      return (
        <div className="flex justify-center">
          <Button
            size="icon"
            className="bg-green-600 hover:bg-green-700 hover:shadow-md border-green-600 hover:border-green-700 text-white hover:scale-105 transition-all duration-200"
            onClick={() => {
              // TODO: Implement upload signed document functionality
              console.log("Upload signed document for:", row.original.id);
            }}
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];
