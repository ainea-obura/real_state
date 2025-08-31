"use client";

import { ArrowLeft, Settings } from 'lucide-react';
import { useState } from 'react';

import Header from "@/features/projects/profile/tabs/Components/structure/header";
import { Button } from '@/components/ui/button';

import InvoiceCreate from "./components/InvoiceCreate";
import InvoiceList from "./components/InvoiceList";
import InvoiceEdit from "./components/InvoiceEdit";
import ViewInvoice from "./components/ViewInvoice";
import TaskManagementSettings from "./components/TaskManagementSettings";

interface InvoicesProps {
  statusOptions?: { label: string; value: string }[];
  typeOptions?: { label: string; value: string }[];
}

type ViewState = "list" | "create" | "edit" | "view" | "settings";

const Invoices = ({
  statusOptions,
  typeOptions,
}: InvoicesProps) => {
  // View state management
  const [viewState, setViewState] = useState<ViewState>("list");
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  // Handle successful invoice creation
  const handleInvoiceCreated = () => {
    setViewState("list");
  };

  // Handle successful invoice edit
  const handleInvoiceEdited = () => {
    setViewState("list");
    setEditInvoice(null);
  };

  // Handle edit action from list
  const handleEditInvoice = (invoice: any) => {
    setEditInvoice(invoice);
    setViewState("edit");
  };

  // Handle view action from list
  const handleViewInvoice = (invoice: any) => {
    setViewInvoice(invoice);
    setViewState("view");
  };

  // Handle successful invoice view
  const handleInvoiceViewed = () => {
    setViewState("list");
    setViewInvoice(null);
  };

  // Handle settings
  const handleOpenSettings = () => {
    setViewState("settings");
  };

  const handleSettingsBack = () => {
    setViewState("list");
  };

  // Render create view
  const renderCreateView = () => (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Create Invoice"
        description="Create a new invoice for tenants or owners"
      >
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            onClick={() => setViewState("list")}
            className="h-10"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to List
          </Button>
        </div>
      </Header>

      {/* Create Invoice Component */}
      <InvoiceCreate onSuccess={handleInvoiceCreated} />
    </div>
  );

  // Render edit view
  const renderEditView = () => (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Edit Invoice"
        description={`Edit invoice ${editInvoice?.invoiceNumber || ''}`}
      >
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            onClick={() => setViewState("list")}
            className="h-10"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to List
          </Button>
        </div>
      </Header>

      {/* Edit Invoice Component */}
      <InvoiceEdit 
        invoice={editInvoice} 
        onSuccess={handleInvoiceEdited} 
      />
    </div>
  );

  // Render view invoice
  const renderViewView = () => (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="View Invoice"
        description={`View invoice ${viewInvoice?.invoiceNumber || ''}`}
      >
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            onClick={() => setViewState("list")}
            className="h-10"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to List
          </Button>
        </div>
      </Header>

      {/* View Invoice Component */}
      <ViewInvoice 
        invoice={viewInvoice} 
        onBack={handleInvoiceViewed}
      />
    </div>
  );

  // Render settings view
  const renderSettingsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Task Management"
        description="Configure automated invoice generation and reminders"
      >
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            onClick={handleSettingsBack}
            className="h-10"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Invoices
          </Button>
        </div>
      </Header>

      {/* Task Management Component */}
      <TaskManagementSettings />
    </div>
  );

  // Main render based on view state
  return (
    <div>
      {viewState === "list" ? (
        <InvoiceList 
          statusOptions={statusOptions}
          typeOptions={typeOptions}
          onCreateNew={() => setViewState("create")}
          onEditInvoice={handleEditInvoice}
          onViewInvoice={handleViewInvoice}
          onOpenSettings={handleOpenSettings}
        />
      ) : viewState === "create" ? (
        renderCreateView()
      ) : viewState === "edit" ? (
        renderEditView()
      ) : viewState === "view" ? (
        renderViewView()
      ) : viewState === "settings" ? (
        renderSettingsView()
      ) : null}
    </div>
  );
};

export default Invoices;
