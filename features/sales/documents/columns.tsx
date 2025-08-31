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
          <div className="text-sm font-medium">{buyer.name}</div>
          <div className="text-xs text-gray-500">{buyer.phone}</div>
          <div className="text-xs text-gray-500">{buyer.email}</div>
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
            <div className="text-sm font-medium">{property.project}</div>
            <div className="text-xs text-gray-500">{property.houseName}</div>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          <div className="text-sm font-medium">{property.project}</div>
          <div className="text-xs text-gray-500">
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
          <div className="text-sm italic text-gray-400">No offer letter</div>
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
              className="p-0 h-auto text-sm font-medium text-blue-600 hover:text-blue-800"
              onClick={() => window.open(offerLetter.documentLink, "_blank")}
              title={offerLetter.documentName} // Show full name on hover
            >
              {truncatedName}
            </Button>
            <div className="text-xs text-gray-500">
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
        return <div className="text-sm italic text-gray-400">No agreement</div>;
      }

      // Truncate document name to save space
      const truncatedName =
        agreement.documentName.length > 25
          ? agreement.documentName.substring(0, 25) + "..."
          : agreement.documentName;

      return (
        <div className="space-y-2">
          <div className="space-y-1">
            {agreement.documentLink && agreement.documentLink !== "#" ? (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-sm font-medium text-blue-600 hover:text-blue-800"
                onClick={() => window.open(agreement.documentLink, "_blank")}
                title={agreement.documentName} // Show full name on hover
              >
                {truncatedName}
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{truncatedName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 h-6 text-xs"
                  onClick={async () => {
                    try {
                      // For contracts, PDFs are automatically generated when created
                      // If a PDF is missing, it means there was an error during creation
                      console.log('Contract PDFs are automatically generated when contracts are created');
                      // You can contact support if PDFs are missing
                    } catch (error) {
                      console.error('Error with contract PDF:', error);
                    }
                  }}
                >
                  PDF Auto-Generated
                </Button>
              </div>
            )}
            <div className="text-xs text-gray-500">
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
          <div className="text-sm italic text-center text-gray-400">
            No agreement to sign
          </div>
        );
      }

      const isSigned = agreement.status === "signed";

      if (isSigned) {
        return (
          <div className="text-xs italic text-center text-gray-500">
            Document already signed
          </div>
        );
      }

      return (
        <div className="flex justify-center">
          <Button
            size="icon"
            className="text-white bg-green-600 border-green-600 transition-all duration-200 hover:bg-green-700 hover:shadow-md hover:border-green-700 hover:scale-105"
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
