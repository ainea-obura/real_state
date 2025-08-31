import { atom } from "jotai";

import type { TenantAssignment } from "@/features/property/tenant-assignment/types";
import type { Project } from "@/schema/projects/schema";

export const authAtom = atom<{
  isAllowedTo2Fa: boolean;
  email: string | undefined;
}>({
  isAllowedTo2Fa: false,
  email: undefined,
});

export const veryfiEmailAtom = atom<{
  isAllowedToVeryfEmail: boolean;
  email: string | undefined;
}>({
  isAllowedToVeryfEmail: false,
  email: undefined,
});

export const pageIndexAtom = atom(0);
export const pageSizeAtom = atom(10);

/** Per-table search input value */
export const tableSearchValueAtom = atom("");

export const projectName = atom("");
export const projectLocation = atom("");
export const isProjectModelOpen = atom<boolean>(false);

// Remove old ProjectResponse interface and use canonical Project type
type SelectedProject = { data: Project; error: boolean };
export const selectedProjectAtom = atom<SelectedProject | null>(null);

// Client atoms
export const isTenantModelOpen = atom<boolean>(false);
export const isOwnerModelOpen = atom<boolean>(false);
export const selectedTenantAtom = atom<{ data: any; error: boolean }>({
  data: null,
  error: false,
});
export const selectedOwnerAtom = atom<{ data: any; error: boolean }>({
  data: null,
  error: false,
});
export const tenantName = atom<string>("");
export const ownerName = atom<string>("");

export const isTenantAssignmentModalOpen = atom(false);
export const selectedTenantAssignmentAtom = atom<TenantAssignment | null>(null);

export const isDeleteProjectModalOpen = atom(false);
export const deleteProjectId = atom<string | null>(null);

// Sales History Modal atoms
export const salesHistoryModalOpenAtom = atom(false);
export const selectedSaleForHistoryAtom = atom<{
  saleId: string;
  ownerProperty: any;
} | null>(null);

// Assign Sales Person Modal atoms
export const assignSalesPersonModalOpenAtom = atom(false);
export const selectedOwnerPropertyForAssignmentAtom = atom<{
  id: string;
  ownerName?: string;
  propertyName?: string;
  status?: string;
  assignedSalesPerson?: {
    name?: string;
    employee_id?: string;
  };
} | null>(null);

// Remove Sales Person Modal atoms
export const removeSalesPersonModalOpenAtom = atom(false);

export const isAgencyModelOpen = atom<boolean>(false);
export const selectedAgencyAtom = atom<{ data: any; error: boolean }>({
  data: null,
  error: false,
});
