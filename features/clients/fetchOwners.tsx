import { useSetAtom } from 'jotai';
import { UserPlus, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { ClientsResponse } from '@/features/clients/types';
import { isOwnerModelOpen, ownerName } from '@/store';
import { PermissionGate } from '@/components/PermissionGate';

import AddOwner from './addOwner';
import ExcelUploadModal from './ExcelUploadModal';
import { OwnersColumns } from './columns';

interface IFetchOwners {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: ClientsResponse;
  onClientsUpdated?: () => void;
}

const SEARCHABLE_COLUMN_IDS = ["first_name", "last_name", "email"] as const;
export type ColumnKeyOwners = (typeof SEARCHABLE_COLUMN_IDS)[number];
const TABLEKEY = "owners" as const;

const FetchOwners: React.FC<IFetchOwners> = ({
  data,
  isError,
  isPending,
  error,
  onClientsUpdated,
}) => {
  const setName = useSetAtom(ownerName);
  const setIsOpen = useSetAtom(isOwnerModelOpen);
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
    <PermissionGate codename="view_owner">
      <div className="w-full h-full">
        <DataTable
          tableKey={TABLEKEY}
          data={data}
          columns={OwnersColumns}
          isLoading={isPending}
          isError={isError}
          options={[
            { label: "Verified", value: "Verified" },
            { label: "Unverified", value: "Unverified" },
          ]}
          errorMessage={(error as Error)?.message}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={filterSetters}
          actionButton={
            <div className="flex gap-2">
              <PermissionGate codename="add_owner" showFallback={false}>
                <Button
                  variant="outline"
                  className="flex gap-2 items-center h-10"
                  onClick={() => setIsExcelModalOpen(true)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Upload Excel
                </Button>
              </PermissionGate>
              <PermissionGate codename="add_owner" showFallback={false}>
                <Button
                  className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
                  onClick={() => setIsOpen((prev) => !prev)}
                >
                  <UserPlus className="h-4 w-4" />
                  New Owner
                </Button>
              </PermissionGate>
            </div>
          }
        />
        <PermissionGate codename="add_owner" showFallback={false}>
          <AddOwner />
        </PermissionGate>
        <PermissionGate codename="add_owner" showFallback={false}>
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
export default FetchOwners;
