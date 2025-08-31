"use client";

import { Building2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/datatable/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import DeletePositionModal from "./components/DeletePositionModal";
import PositionModal from "./components/PositionModal";
import { PositionsColumns } from "./columns";
import type { PositionForm, PositionTableItem } from "../../schema/position";

import {
  fetchPositionTable,
  createPosition,
  updatePosition,
  deletePosition,
} from "@/actions/settings/position";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { pageIndexAtom, pageSizeAtom } from "@/store";

const Position = () => {
  // Pagination state using jotai atoms (like invoices)
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);
  
  // Search state
  const [search, setSearch] = useState("");
  const [showDeleted] = useState(false); // not used, but available if needed

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionTableItem | null>(null);

  const queryClient = useQueryClient();

  // Fetch positions with pagination and search
  const {
    data: tableDataRaw,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["positions", { pageIndex, pageSize, search, showDeleted }],
    queryFn: () => fetchPositionTable({ 
      page: pageIndex + 1, // Convert to 1-based for backend
      pageSize, 
      search, 
      showDeleted 
    }),
  });

  // Provide fallback for tableData
  const tableData = tableDataRaw || { count: 0, results: [] };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: PositionForm) => {
      return await createPosition(data);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to create position");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setIsAddModalOpen(false);
      toast.success("Position created successfully!");
    },
    onError: () => {
      toast.error("Failed to create position");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PositionForm }) => {
      return await updatePosition(id, values);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to update position");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setIsEditModalOpen(false);
      setSelectedPosition(null);
      toast.success("Position updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update position");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deletePosition(id);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to delete position");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setIsDeleteModalOpen(false);
      setSelectedPosition(null);
      toast.success("Position deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete position");
    },
  });

  // Handlers
  const handleAddPosition = (data: PositionForm) => {
    createMutation.mutate(data);
  };

  const handleEditPosition = (data: PositionForm) => {
    if (!selectedPosition) return;
    updateMutation.mutate({ id: selectedPosition.id, values: data });
  };

  const handleDeletePosition = () => {
    if (!selectedPosition) return;
    deleteMutation.mutate(selectedPosition.id);
  };

  const openEditModal = (position: PositionTableItem) => {
    setSelectedPosition(position);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (position: PositionTableItem) => {
    setSelectedPosition(position);
    setIsDeleteModalOpen(true);
  };

  // Enhanced columns with proper action handlers
  const enhancedColumns = PositionsColumns.map(column => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const position = row.original;
          return (
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(position)}
                className="p-0 w-8 h-8"
              >
                <Building2 className="w-4 h-4" />
                <span className="sr-only">Edit position</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteModal(position)}
                className="p-0 w-8 h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete position</span>
              </Button>
            </div>
          );
        },
      };
    }
    return column;
  });

  // Table data for DataTable
  const dataForTable = {
    data: {
      count: tableData.count,
      results: tableData.results,
    },
  };

  // Searchable columns
  const SEARCHABLE_COLUMN_IDS = ["name", "description"] as const;
  const TABLEKEY = "positions" as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Position Management</h1>
        <p className="text-muted-foreground">
          Create and manage positions within your organization. Positions define roles and responsibilities for staff members.
        </p>
      </div>

      {/* DataTable */}
      <div className="w-full">
        <DataTable
          tableKey={TABLEKEY}
          data={dataForTable}
          columns={enhancedColumns}
          isLoading={isLoading}
          isError={!!error}
          options={[]}
          errorMessage={error ? (error as any).message : ""}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={[setSearch]}
          actionButton={
            <Button
              className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Position
            </Button>
          }
        />
      </div>

      {/* Modals */}
      <PositionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPosition}
        isLoading={createMutation.status === "pending"}
      />

      <PositionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPosition(null);
        }}
        onSubmit={handleEditPosition}
        position={selectedPosition}
        isLoading={updateMutation.status === "pending"}
      />

      <DeletePositionModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPosition(null);
        }}
        onConfirm={handleDeletePosition}
        position={selectedPosition}
        isLoading={deleteMutation.status === "pending"}
      />
    </div>
  );
};

export default Position;