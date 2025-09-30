import { useSetAtom } from 'jotai';
import { UserPlus, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { ClientsResponse } from '@/features/clients/types';
import { isTenantModelOpen, tenantName } from '@/store';
import { PermissionGate } from '@/components/PermissionGate';

import AddTenant from './addTenant';
import ExcelUploadModal from './ExcelUploadModal';
import { TenantsColumns } from './columns';

interface IFetchTenants {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: ClientsResponse;
  onClientsUpdated?: () => void;
}

const SEARCHABLE_COLUMN_IDS = ["first_name", "last_name", "email"] as const;
export type ColumnKeyTenants = (typeof SEARCHABLE_COLUMN_IDS)[number];
const TABLEKEY = "tenants" as const;

const FetchTenants: React.FC<IFetchTenants> = ({
  data,
  isError,
  isPending,
  error,
  onClientsUpdated,
}) => {
  const setName = useSetAtom(tenantName);
  const setIsOpen = useSetAtom(isTenantModelOpen);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const filterSetters = useMemo(
    () => [setName] as ((val: string) => void)[],
    [setName]
  );

  const handleClientsUpdated = () => {
    onClientsUpdated?.();
    setIsExcelModalOpen(false);
  };

  return (
    <PermissionGate codename="view_tenant">
      <div className="w-full h-full">
        <DataTable
          tableKey={TABLEKEY}
          data={data}
          columns={TenantsColumns}
          isLoading={isPending}
          isError={isError}
          options={[
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
          ]}
          errorMessage={(error as Error)?.message}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={filterSetters}
          actionButton={
            <div className="flex gap-2">
              <PermissionGate codename="add_tenant" showFallback={false}>
                <Button
                  variant="outline"
                  className="flex gap-2 items-center h-10"
                  onClick={() => setIsExcelModalOpen(true)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload Excel
                </Button>
              </PermissionGate>
              <PermissionGate codename="add_tenant" showFallback={false}>
                <Button
                  className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
                  onClick={() => setIsOpen((prev) => !prev)}
                >
                  <UserPlus className="h-4 w-4" />
                  New Tenant
                </Button>
              </PermissionGate>
            </div>
          }
        />
        <PermissionGate codename="add_tenant" showFallback={false}>
          <AddTenant />
        </PermissionGate>
        <PermissionGate codename="add_tenant" showFallback={false}>
          <ExcelUploadModal
            isOpen={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            onClientsUpdated={handleClientsUpdated}
          />
        </PermissionGate>
      </div>
    </PermissionGate>
  );
};
export default FetchTenants; 