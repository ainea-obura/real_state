import { useAtom } from 'jotai';
import { AlertCircle, CreditCard, DollarSign, User, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { fetchFeatureCards } from '@/actions/sales/featureCards';
import { fetchTableData } from '@/actions/sales/tableData';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Header } from '@/features/clients/tabs/components';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import {
    assignSalesPersonModalOpenAtom, pageIndexAtom, pageSizeAtom, removeSalesPersonModalOpenAtom,
    salesHistoryModalOpenAtom, selectedOwnerPropertyForAssignmentAtom, selectedSaleForHistoryAtom,
} from '@/store';
import { useQuery } from '@tanstack/react-query';

import { columns } from './columns';
import {
    AssignBuyerWizardModal, AssignSalesPersonModal, RemoveSalesPersonModal, ViewSalesHistoryModal,
} from './components';

const OwnerAssignment = () => {
  const [showAssignBuyerModal, setShowAssignBuyerModal] = useState(false);

  // Global pagination state
  const [pageIndex] = useAtom(pageIndexAtom);
  const [pageSize] = useAtom(pageSizeAtom);

  // Sales History Modal state from store
  const [isSalesHistoryModalOpen, setSalesHistoryModalOpen] = useAtom(
    salesHistoryModalOpenAtom
  );
  const [selectedSaleForHistory, setSelectedSaleForHistory] = useAtom(
    selectedSaleForHistoryAtom
  );

  // Assign Sales Person Modal state from store
  const [isAssignSalesPersonModalOpen, setAssignSalesPersonModalOpen] = useAtom(
    assignSalesPersonModalOpenAtom
  );
  const [
    selectedOwnerPropertyForAssignment,
    setSelectedOwnerPropertyForAssignment,
  ] = useAtom(selectedOwnerPropertyForAssignmentAtom);

  // Remove Sales Person Modal state from store
  const [isRemoveSalesPersonModalOpen, setRemoveSalesPersonModalOpen] = useAtom(
    removeSalesPersonModalOpenAtom
  );

  // Fetch feature card data
  const { data: featureCardsData, isLoading: isLoadingFeatureCards } = useQuery(
    {
      queryKey: ["featureCards"],
      queryFn: fetchFeatureCards,
    }
  );

  // Fetch table data with pagination
  const {
    data: tableData,
    isLoading: isLoadingTable,
    isError: isTableError,
  } = useQuery({
    queryKey: ["ownerProperties", pageIndex, pageSize],
    queryFn: () =>
      fetchTableData({
        page: pageIndex + 1, // API uses 1-based indexing, store uses 0-based
        page_size: pageSize,
      }),
  });

  // Get feature card values with fallbacks
  const getFeatureCardValue = (key: string) => {
    if (!featureCardsData?.success || !featureCardsData?.data?.feature_cards) {
      return "Loading...";
    }

    const value =
      featureCardsData.data.feature_cards[
        key as keyof typeof featureCardsData.data.feature_cards
      ];

    // Currency fields are already formatted by backend
    if (
      key === "total_sales_value" ||
      key === "outstanding_payments" ||
      key === "commission_due"
    ) {
      return value; // Backend already formats these as currency strings
    }

    // Number fields need formatting
    return value;
  };

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center">
        <Header
          title="Buyer Assignment"
          description="Assign buyers to properties"
        />

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="bg-primary hover:bg-primary/90 hover:shadow-md border-primary hover:border-primary/80 text-primary-foreground hover:scale-105 transition-all duration-200"
                  onClick={() => setShowAssignBuyerModal(true)}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assign Buyer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4 mt-6">
        {isLoadingFeatureCards && (
          <div className="col-span-4 py-8 text-center">
            <div className="mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
            <p className="mt-2 text-gray-600">Loading feature cards...</p>
          </div>
        )}
        {!isLoadingFeatureCards && (
          <>
            <FeatureCard
              icon={DollarSign}
              title="Total Sales Value"
              value={getFeatureCardValue("total_sales_value")}
              desc="Total value of all property sales"
            />
            <FeatureCard
              icon={CreditCard}
              title="Active Payment Plans"
              value={getFeatureCardValue("active_payment_plans")}
              desc="Ongoing installment payment plans"
            />
            <FeatureCard
              icon={AlertCircle}
              title="Outstanding Payments"
              value={getFeatureCardValue("outstanding_payments")}
              desc="Total overdue & upcoming payments"
            />
            <FeatureCard
              icon={User}
              title="Commission Due"
              value={getFeatureCardValue("commission_due")}
              desc="Pending agent commission payments"
            />
          </>
        )}
      </div>

      {/* Owners Table */}
      <div className="mt-8">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 text-xl">
            Owners Management
          </h3>
          <p className="text-gray-600 text-sm">
            Manage property owners and their sales relationships
          </p>
        </div>

        <DataTable
          columns={columns}
          data={
            tableData?.success
              ? { data: tableData.data }
              : { error: true, data: { count: 0, results: [] } }
          }
          isLoading={isLoadingTable}
          isError={isTableError}
          options={[
            { label: "All", value: "all" },
            { label: "On Track", value: "on-track" },
            { label: "Behind", value: "behind" },
            { label: "At Risk", value: "at-risk" },
            { label: "Completed", value: "completed" },
          ]}
          tableKey="owners-table"
          searchableColumnIds={["ownerName", "projectName", "propertyName"]}
          searchableColumnsSetters={[
            (value: string) => console.log("Search value:", value),
          ]}
          searchPlaceholder="Search owners, projects, or properties..."
        />

        {/* New Modals */}
        <AssignBuyerWizardModal
          isOpen={showAssignBuyerModal}
          onClose={() => setShowAssignBuyerModal(false)}
        />



        {/* Assign Sales Person Modal */}
        <AssignSalesPersonModal
          isOpen={isAssignSalesPersonModalOpen}
          onClose={() => {
            setAssignSalesPersonModalOpen(false);
            setSelectedOwnerPropertyForAssignment(null);
          }}
          ownerProperty={selectedOwnerPropertyForAssignment}
        />

        <RemoveSalesPersonModal
          isOpen={isRemoveSalesPersonModalOpen}
          onClose={() => {
            setRemoveSalesPersonModalOpen(false);
            setSelectedOwnerPropertyForAssignment(null);
          }}
          ownerProperty={selectedOwnerPropertyForAssignment}
        />

        {/* Sales History Modal */}
        <ViewSalesHistoryModal
          isOpen={isSalesHistoryModalOpen}
          onClose={() => {
            setSalesHistoryModalOpen(false);
            setSelectedSaleForHistory(null);
          }}
          ownerProperty={selectedSaleForHistory?.ownerProperty}
        />
      </div>
    </div>
  );
};

export default OwnerAssignment;
