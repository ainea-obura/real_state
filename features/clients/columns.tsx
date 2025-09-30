import { Delete02Icon } from 'hugeicons-react';
import { useSetAtom } from 'jotai';
import { Edit, Eye, Mail, MapPin, Phone, User, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';

import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { DataTableRowActions } from '@/components/datatable/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    isAgencyModelOpen, isOwnerModelOpen, isTenantModelOpen, selectedAgencyAtom, selectedOwnerAtom,
    selectedTenantAtom,
} from '@/store';
import { ColumnDef } from '@tanstack/react-table';
import { PermissionGate } from '@/components/PermissionGate';
import AllocateTenantModal from "./AllocateTenantModal";
import { deleteTenantWithValidation } from "@/actions/clients";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import type { ClientDetail } from "@/features/clients/types";

// Helper function to get status badge style
const getStatusStyle = (isActive: boolean) => {
  if (isActive) {
    return {
      bg: "bg-green-50 border border-green-200/50",
      icon: "bg-green-500",
      text: "text-green-700",
    };
  } else {
    return {
      bg: "bg-red-50 border border-red-200/50",
      icon: "bg-red-500",
      text: "text-red-700",
    };
  }
};

// Helper function to get gender badge style
const getGenderStyle = (gender: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    Male: {
      bg: "bg-blue-100 border border-blue-200/50",
      text: "text-blue-700",
    },
    Female: {
      bg: "bg-pink-100 border border-pink-200/50",
      text: "text-pink-700",
    },
  };
  return styles[gender] || {
    bg: "bg-gray-100 border border-gray-200/50",
    text: "text-gray-700",
  };
};

interface ClientWithActions extends ClientDetail {
  onEdit?: () => void;
}

const ActionButtons = ({ row, triggerVerificationTab = false }: { row: any, triggerVerificationTab?: boolean }) => {
  const router = useRouter();
  const setIsOpen = useSetAtom(isTenantModelOpen);
  const setSelectedTenant = useSetAtom(selectedTenantAtom);
  const [allocateModalOpen, setAllocateModalOpen] = React.useState(false);
  const [allocateTenant, setAllocateTenant] = React.useState<any>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (triggerVerificationTab) {
      setSelectedTenant({ data: row.original, error: false });
      router.push(`/clients/tenants/${row.original.id}?tab=verification`);
    }
    // eslint-disable-next-line
  }, [triggerVerificationTab]);

  const handleEdit = () => {
    const tenantData = {
      id: String(row.original.id),
      email: row.original.email,
      first_name: row.original.first_name || "",
      last_name: row.original.last_name || "",
      phone: row.original.phone || "",
      gender: row.original.gender || "Male",
      is_active: row.original.is_active,
      created_at: row.original.created_at,
      modified_at: row.original.modified_at,
    };

    setSelectedTenant({ data: tenantData, error: false });
    setIsOpen(true);
  };

  const handleAllocate = () => {
    setAllocateTenant({
      id: String(row.original.id),
      first_name: row.original.first_name || "",
      last_name: row.original.last_name || "",
      email: row.original.email,
    });
    setAllocateModalOpen(true);
  };

  const handleAllocateConfirm = (allocation: { [key: string]: any; tenantId: string; projectId: string; blockId?: string; floorId?: string; unitId?: string; houseId?: string }) => {
    // TODO: Implement allocation logic
    console.log("Allocating tenant", allocation);
    setAllocateModalOpen(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${row.original.first_name} ${row.original.last_name}? This action cannot be undone.`)) {
      try {
        const result = await deleteTenantWithValidation(row.original.id);
        if (result.isError) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          // Invalidate tenant queries to refresh the list
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const queryKey = query.queryKey;
              return Array.isArray(queryKey) && queryKey[0] === "tenants";
            }
          });
        }
      } catch (error) {
        toast.error("Failed to delete tenant");
      }
    }
  };

  return (
    <>
      <TooltipProvider>
        <div className="flex gap-2 items-center">
          <Tooltip>
            <button
              onClick={() => {
                setSelectedTenant({ data: row.original, error: false });
                router.push(`/clients/tenants/${row.original.id}?tab=overview`);
              }}
              className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
            >
              <Eye className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
              <span className="sr-only">View Tenant Details</span>
            </button>
            <TooltipContent side="left">
              <p>View Tenant Details</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <PermissionGate codename="edit_tenant" showFallback={false}>
              <TooltipTrigger
                onClick={handleEdit}
                className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
              >
                <Edit className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                <span className="sr-only">Edit Tenant</span>
              </TooltipTrigger>
            </PermissionGate>
            <TooltipContent side="left">
              <p>Edit Tenant</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <PermissionGate codename="add_tenant" showFallback={false}>
              <TooltipTrigger
                onClick={handleAllocate}
                className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-blue-500 hover:text-white"
              >
                <MapPin className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                <span className="sr-only">Allocate Tenant</span>
              </TooltipTrigger>
            </PermissionGate>
            <TooltipContent side="left">
              <p>Allocate Tenant</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <PermissionGate codename="delete_tenant" showFallback={false}>
              <TooltipTrigger
                onClick={handleDelete}
                className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-red-50 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="w-[18px] h-[18px] text-red-500 group-hover:text-white transition-all duration-300" />
                <span className="sr-only">Delete Tenant</span>
              </TooltipTrigger>
            </PermissionGate>
            <TooltipContent side="left">
              <p>Delete Tenant</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <AllocateTenantModal
        open={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        tenant={allocateTenant}
        onAllocate={handleAllocateConfirm}
      />
    </>
  );
};

export const TenantsColumns: ColumnDef<ClientWithActions>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={!!row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tenant Details" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {row.original.first_name} {row.original.last_name}
            </span>
          </div>
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span className="max-w-[200px] truncate">
              {row.original.email}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {row.original.phone || "N/A"}
          </span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gender" />
    ),
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string;
      const style = getGenderStyle(gender);
      return (
        <div className="flex flex-wrap gap-2 items-center">
          <Badge
            className={cn(
              "font-medium capitalize px-2 py-1",
              style.bg,
              style.text
            )}
          >
            {gender || "N/A"}
          </Badge>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "is_tenant_verified",
    accessorKey: "is_tenant_verified",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.original.is_tenant_verified;
      const style = getStatusStyle(isActive);
      const tenantId = row.original.id;
      const badge = (
        <Badge
          className={cn(
            "font-medium capitalize px-2 py-1 w-fit cursor-pointer",
            style.bg,
            style.text
          )}
        >
          <span
            className={cn(
              "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
              style.icon
            )}
          />
          {isActive ? "Verified" : "Not Verified"}
        </Badge>
      );
      if (isActive) {
        return <div className="flex flex-col gap-2">{badge}</div>;
      } else {
        // Make the badge itself a button that navigates to the verification tab
        const router = useRouter();
        const setSelectedTenant = useSetAtom(selectedTenantAtom);
        return (
          <button
            onClick={() => {
              setSelectedTenant({ data: row.original, error: false });
              router.push(`/clients/tenants/${tenantId}?tab=verification`);
            }}
            className="bg-transparent p-0 border-0 text-inherit cursor-pointer"
            style={{ all: 'unset' }}
          >
            {badge}
          </button>
        );
      }
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-gray-700">
          {date.toLocaleDateString()}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DataTableRowActions
          row={row}
          renderActions={() => <ActionButtons row={row} />}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

export const OwnersColumns: ColumnDef<ClientWithActions>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={!!row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Owner Details" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {row.original.first_name} {row.original.last_name}
            </span>
          </div>
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span className="max-w-[200px] truncate">
              {row.original.email}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {row.original.phone || "N/A"}
          </span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gender" />
    ),
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string;
      const style = getGenderStyle(gender);
      return (
        <div className="flex flex-wrap gap-2 items-center">
          <Badge
            className={cn(
              "font-medium capitalize px-2 py-1",
              style.bg,
              style.text
            )}
          >
            {gender || "N/A"}
          </Badge>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "status",
    accessorKey: "is_owner_verified",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = Boolean(row.original.is_owner_verified);
      const style = getStatusStyle(isActive);
      const ownerId = row.original.id;
      const badge = (
        <Badge
          className={cn(
            "font-medium capitalize px-2 py-1 w-fit cursor-pointer",
            style.bg,
            style.text
          )}
        >
          <span
            className={cn(
              "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
              style.icon
            )}
          />
          {isActive ? "Verified" : "Not Verified"}
        </Badge>
      );
      if (isActive) {
        return <div className="flex flex-col gap-2">{badge}</div>;
      } else {
        // Make the badge itself a button that navigates to the verification tab
        const router = useRouter();
        const setSelectedOwner = useSetAtom(selectedOwnerAtom);
        return (
          <button
            onClick={() => {
              setSelectedOwner({ data: row.original, error: false });
              router.push(`/clients/owners/${ownerId}?tab=verification`);
            }}
            className="bg-transparent p-0 border-0 text-inherit cursor-pointer"
            style={{ all: 'unset' }}
          >
            {badge}
          </button>
        );
      }
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-gray-700">
          {date.toLocaleDateString()}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const ActionButtons = () => {
        const setIsOpen = useSetAtom(isOwnerModelOpen);
        const setSelectedOwner = useSetAtom(selectedOwnerAtom);

        const handleEdit = () => {
          const ownerData = {
            id: String(row.original.id),
            email: row.original.email,
            first_name: row.original.first_name || "",
            last_name: row.original.last_name || "",
            phone: row.original.phone || "",
            gender: row.original.gender || "Male",
            is_active: row.original.is_active,
            created_at: row.original.created_at,
            modified_at: row.original.modified_at,
          };

          setSelectedOwner({ data: ownerData, error: false });
          setIsOpen(true);
        };

        return (
          <TooltipProvider>
            <div className="flex gap-2 items-center">
              <Tooltip>
                <Link href={`/clients/owners/${row.original.id}`}>
                  <TooltipTrigger className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white">
                    <Eye className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                    <span className="sr-only">View Owner Details</span>
                  </TooltipTrigger>
                </Link>
                <TooltipContent side="left">
                  <p>View Owner Details</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <PermissionGate codename="edit_owner" showFallback={false}>
                  <TooltipTrigger
                    onClick={handleEdit}
                    className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
                  >
                    <Edit className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                    <span className="sr-only">Edit Owner</span>
                  </TooltipTrigger>
                </PermissionGate>
                <TooltipContent side="left">
                  <p>Edit Owner</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        );
      };

      return (
        <DataTableRowActions
          row={row}
          renderActions={() => <ActionButtons />}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

export const AgenciesColumns: ColumnDef<ClientWithActions>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={!!row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Agency Name" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {row.original.first_name} {row.original.last_name}
            </span>
          </div>
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span className="max-w-[200px] truncate">
              {row.original.email}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {row.original.phone || "N/A"}
          </span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "gender",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gender" />
    ),
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string;
      const style = getGenderStyle(gender);
      return (
        <div className="flex flex-wrap gap-2 items-center">
          <Badge
            className={cn(
              "font-medium capitalize px-2 py-1",
              style.bg,
              style.text
            )}
          >
            {gender || "N/A"}
          </Badge>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-gray-700">
          {date.toLocaleDateString()}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const setIsOpen = useSetAtom(isAgencyModelOpen);
      const setSelectedAgency = useSetAtom(selectedAgencyAtom);
      const handleEdit = () => {
        setSelectedAgency({ data: row.original, error: false });
        setIsOpen(true);
      };
      return (
        <TooltipProvider>
          <div className="flex gap-2 items-center">
            <Tooltip>
              <PermissionGate codename="edit_agents" showFallback={false}>
                <button
                  type="button"
                  className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
                  onClick={handleEdit}
                >
                  <Edit className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Edit Agency</span>
                </button>
              </PermissionGate>
              <TooltipContent side="left">
                <p>Edit Agency</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
]; 


