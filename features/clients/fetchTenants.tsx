import { useSetAtom } from 'jotai';
import { UserPlus } from 'lucide-react';
import { useMemo } from 'react';

import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { ClientsResponse } from '@/features/clients/types';
import { isTenantModelOpen, tenantName } from '@/store';
import { PermissionGate } from '@/components/PermissionGate';

import AddTenant from './addTenant';
import { TenantsColumns } from './columns';

interface IFetchTenants {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: ClientsResponse;
}

const SEARCHABLE_COLUMN_IDS = ["first_name", "last_name", "email"] as const;
export type ColumnKeyTenants = (typeof SEARCHABLE_COLUMN_IDS)[number];
const TABLEKEY = "tenants" as const;

const FetchTenants: React.FC<IFetchTenants> = ({
  data,
  isError,
  isPending,
  error,
}) => {
  const setName = useSetAtom(tenantName);
  const setIsOpen = useSetAtom(isTenantModelOpen);

  const filterSetters = useMemo(
    () => [setName] as ((val: string) => void)[],
    [setName]
  );

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
            <PermissionGate codename="add_tenant" showFallback={false}>
              <Button
                className={
                  "flex gap-4 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
                }
                onClick={() => setIsOpen((prev) => !prev)}
              >
                <UserPlus />
                New Tenant
              </Button>
            </PermissionGate>
          }
        />
        <PermissionGate codename="add_tenant" showFallback={false}>
          <AddTenant />
        </PermissionGate>
      </div>
    </PermissionGate>
  );
};
export default FetchTenants; 