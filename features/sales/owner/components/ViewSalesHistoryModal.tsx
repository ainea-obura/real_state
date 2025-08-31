import { useAtom, useAtomValue } from "jotai";
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  User,
  X,
} from "lucide-react";
import React from "react";

import {
  fetchInstallmentsTable,
  getInstallmentsSummary,
} from "@/actions/sales/installmentsTable";
import { DataTable } from "@/components/datatable/data-table";
import { Button } from "@/components/ui/button";
import { pageIndexAtom, pageSizeAtom } from "@/store";
import { useQuery } from "@tanstack/react-query";

import { installmentsColumns } from "./installmentsColumns";

interface OwnerProperty {
  id?: string;
  saleId?: string;
  ownerName?: string;
  projectName?: string;
  propertyName?: string;
  assignedSalesPerson?: {
    name?: string;
  };
}

interface ViewSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: OwnerProperty | null;
}

const ViewSalesHistoryModal: React.FC<ViewSalesHistoryModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  // Get sale ID from ownerProperty - use the consistent ID (sale_item.id)
  const saleId = ownerProperty?.id || ownerProperty?.saleId || "demo-sale-id";
  const pageIndex = useAtomValue(pageIndexAtom);
  const pageSize = useAtomValue(pageSizeAtom);

  // Fetch installments data using React Query
  const { data: installmentsData, isLoading: isLoadingInstallments } = useQuery(
    {
      queryKey: ["installments", saleId, pageIndex, pageSize],
      queryFn: () =>
        fetchInstallmentsTable({
          sale_item_id: saleId,
          page: pageIndex + 1,
          page_size: pageSize,
        }),
      enabled: !!saleId && saleId !== "demo-sale-id",
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch installments summary
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["installmentsSummary", saleId],
    queryFn: () => getInstallmentsSummary(saleId),
    enabled: !!saleId && saleId !== "demo-sale-id",
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 mt-20">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[calc(100vh-130px)] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Sales History
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.projectName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Property Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.propertyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.assignedSalesPerson?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {isLoadingSummary
                    ? "Loading..."
                    : `KES ${
                        summaryData?.data?.total_amount?.toLocaleString() || 0
                      }`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {isLoadingSummary
                    ? "Loading..."
                    : `${summaryData?.data?.paid || 0}/${
                        summaryData?.data?.total || 0
                      }`}
                </span>
              </div>
            </div>
          </div>

          {/* Installments Table - Uses consistent ID (sale_item.id) for all records */}
          <div>
            <h3 className="mb-4 font-semibold text-gray-900 text-lg">
              Installments Details
            </h3>

            {saleId === "demo-sale-id" ? (
              <div className="py-8 text-gray-500 text-center">
                <p>Demo mode: No real sale ID available</p>
                <p className="mt-2 text-sm">
                  Select a property with a valid sale ID to view installments
                </p>
              </div>
            ) : isLoadingInstallments ? (
              <div className="py-8 text-center">
                <div className="mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                <p className="mt-2 text-gray-600">Loading installments...</p>
              </div>
            ) : installmentsData?.success ? (
              <DataTable
                columns={installmentsColumns}
                data={{
                  data: {
                    count: installmentsData.data.count,
                    results: installmentsData.data.results,
                  },
                }}
                isLoading={isLoadingInstallments}
                isError={false}
                options={[
                  { label: "All", value: "all" },
                  { label: "Pending", value: "pending" },
                  { label: "Paid", value: "paid" },
                  { label: "Overdue", value: "overdue" },
                  { label: "Cancelled", value: "cancelled" },
                ]}
                tableKey="installments-table"
                searchableColumnIds={["notes"]}
                searchableColumnsSetters={[
                  (value: string) => console.log("Search value:", value),
                ]}
                searchPlaceholder="Search installments..."
              />
            ) : (
              <div className="py-8 text-gray-500 text-center">
                <p>No installments data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Export History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewSalesHistoryModal;
