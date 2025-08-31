"use client";
import { ClipboardList, FileSpreadsheet, FileText, Handshake, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { getDocuments, GetDocumentsParams } from '@/actions/sales/getDocuments';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Header } from '@/features/clients/tabs/components';
import CreateDocument from '@/features/management/documents/createContract';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { columns } from './columns';
import CreateContractModal from './CreateContractModal';
import CreateOfferLetterModal from './CreateOfferLetterModal';

const GetDocuments = () => {
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [showCreateOfferLetterModal, setShowCreateOfferLetterModal] =
    useState(false);
  const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false);

  // State for search and filters
  const [searchParams, setSearchParams] = useState<GetDocumentsParams>({});

  // React Query for fetching documents
  const {
    data: documentsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sales-documents", searchParams],
    queryFn: () => getDocuments(searchParams),
  });

  // Calculate stats from real data
  const stats = React.useMemo(() => {
    if (!documentsData?.data?.results) {
      return {
        activeOffers: 0,
        pendingAssignments: 0,
        revenueFromOffers: "$0",
        signedAgreements: 0,
      };
    }

    const results = documentsData.data.results;
    const activeOffers = results.filter(
      (doc) => doc.offerLetter?.status === "active"
    ).length;

    const pendingAssignments = results.filter(
      (doc) =>
        doc.agreement?.status === "pending" || doc.agreement?.status === "draft"
    ).length;

    const signedAgreements = results.filter(
      (doc) => doc.agreement?.status === "signed"
    ).length;

    // Calculate revenue from active offers (placeholder - you might want to add price field)
    const revenueFromOffers =
      results.filter((doc) => doc.offerLetter?.status === "active").length *
      100000; // Placeholder calculation

    return {
      activeOffers,
      pendingAssignments,
      revenueFromOffers: `$${(revenueFromOffers / 1000000).toFixed(1)}M`,
      signedAgreements,
    };
  }, [documentsData]);

  const handleAddNewTemplate = () => {
    setShowCreateDocumentModal(true);
  };

  const handleAssignOffer = () => {
    setShowCreateOfferLetterModal(true);
  };

  const handleAssignContract = () => {
    setShowCreateContractModal(true);
  };

  const handleCloseCreateContract = () => {
    setShowCreateContractModal(false);
  };

  const handleCloseCreateOfferLetter = () => {
    setShowCreateOfferLetterModal(false);
  };

  const handleCloseCreateDocument = () => {
    setShowCreateDocumentModal(false);
  };

  const handleContractCreated = () => {
    // Refresh the documents list after creating a new contract
    queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
    toast.success("New contract template created successfully!");
  };

  const handleOfferLetterCreated = () => {
    // Refresh the documents list after creating a new offer letter
    queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
    toast.success("New offer letter created successfully!");
  };

  const handleDocumentCreated = () => {
    // Refresh the documents list after creating a new document template
    queryClient.invalidateQueries({ queryKey: ["sales-documents"] });
    toast.success("New document template created successfully!");
  };

  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Sales Documents"
        description="Create and manage sales document templates"
      >
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="bg-primary hover:bg-primary/90 hover:shadow-md border-primary hover:border-primary/80 text-primary-foreground hover:scale-105 transition-all duration-200"
                    onClick={handleAddNewTemplate}
                  >
                    <ClipboardList className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Template</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-gray-600 text-xs">Template</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="bg-green-600 hover:bg-green-700 hover:shadow-md border-green-600 hover:border-green-700 text-white hover:scale-105 transition-all duration-200"
                    onClick={handleAssignOffer}
                  >
                    <Handshake className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign Offer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-gray-600 text-xs">Offer</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 hover:shadow-md border-blue-600 hover:border-blue-700 text-white hover:scale-105 transition-all duration-200"
                    onClick={handleAssignContract}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign Contract</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-gray-600 text-xs">Contract</span>
          </div>
        </div>
      </Header>

      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales Manager Key Metrics */}
        <FeatureCard
          icon={Handshake}
          title="Active Offers"
          value={stats.activeOffers}
          desc="Offers in progress"
        />
        <FeatureCard
          icon={ClipboardList}
          title="Pending Assignments"
          value={stats.pendingAssignments}
          desc="Documents to assign"
        />
        <FeatureCard
          icon={FileSpreadsheet}
          title="Revenue from Offers"
          value={stats.revenueFromOffers}
          desc="Total value of active offers"
        />
        <FeatureCard
          icon={FileText}
          title="Signed Agreements"
          value={stats.signedAgreements}
          desc="Closed deals this month"
        />
      </div>

      {/* Sales Documents Table */}
      <div className="space-y-4 mt-10">
        {isError && (
          <div className="py-8 text-center">
            <p className="text-red-600">
              Error loading documents. Please try again.
            </p>
          </div>
        )}

        <DataTable
          columns={columns}
          data={{ data: documentsData?.data || { count: 0, results: [] } }}
          isLoading={isLoading}
          isError={isError}
          options={[]}
          tableKey="sales-documents"
          searchableColumnIds={["buyer", "property"]}
          searchableColumnsSetters={[
            (value: string) => {
              setSearchParams((prev) => ({ ...prev, search: value }));
            },
          ]}
          searchPlaceholder="Search buyers, properties..."
        />
      </div>

      {/* Create Contract Modal */}
      <CreateContractModal
        open={showCreateContractModal}
        onClose={handleCloseCreateContract}
        onUpload={handleContractCreated}
        mode="create"
      />

      {/* Create Offer Letter Modal */}
      <CreateOfferLetterModal
        open={showCreateOfferLetterModal}
        onClose={handleCloseCreateOfferLetter}
        onUpload={handleOfferLetterCreated}
        mode="create"
      />

      {/* Create Document Template Modal */}
      <CreateDocument
        open={showCreateDocumentModal}
        onClose={handleCloseCreateDocument}
        onUpload={handleDocumentCreated}
        mode="create"
        title="Create Document Template"
        description="Create a new document template for sales documents"
      />
    </div>
  );
};

export default GetDocuments;
