import { Plus } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/datatable/data-table";
import { Button } from "@/components/ui/button";

import { TenantAssignment } from "../schema/tenantSchema";
import { TenantAssignmentColumns } from "./columns";
import AllocateApartmentModal from "./AllocateApartmentModal";
import type { PropertyTenantCreateInput } from "../schema/propertyTenantSchema";

interface TenantAssignmentDisplayProps {
  projectId: string;
}

const TenantAssignmentDisplay = ({
  projectId,
}: TenantAssignmentDisplayProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = (_row: TenantAssignment) => {
    // Handle edit
  };

  const handleDelete = (_row: TenantAssignment) => {
    // Handle delete
  };

  const handleAllocateApartment = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSubmit = async (data: PropertyTenantCreateInput) => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to create property tenant
      

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Close modal on success
      setIsModalOpen(false);
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* <DataTable
        columns={TenantAssignmentColumns(handleEdit, handleDelete)}
        data={{ data: { results: [], count: 0 } }}
        isLoading={false}
        isError={false}
        options={[]}
        tableKey="tenant-assignments"
        searchableColumnsSetters={[]}
        actionButton={
          <Button
            className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary hover:bg-primary/90"
            onClick={handleAllocateApartment}
            aria-label="Allocate apartment to tenant"
            tabIndex={0}
            role="button"
          >
            <Plus className="w-4 h-4" />
            Allocate Apartment
          </Button>
        }
      /> */}

      <AllocateApartmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        isLoading={isLoading}
        projectId={projectId}
      />
    </div>
  );
};

export default TenantAssignmentDisplay;
