import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAgencies } from "@/actions/clients";
import { AgenciesColumns } from "./columns";
import { UserPlus } from "lucide-react";
import { useSetAtom } from "jotai";
import { isAgencyModelOpen, selectedAgencyAtom } from "@/store";
import AddAgency from "./addAgency";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import { PermissionGate } from '@/components/PermissionGate';

const SEARCHABLE_COLUMN_IDS = ["first_name", "last_name", "email"] as const;
const TABLEKEY = "agencies" as const;

const FetchAgency: React.FC = () => {
  const setIsOpen = useSetAtom(isAgencyModelOpen);
  const setSelectedAgency = useSetAtom(selectedAgencyAtom);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filterSetters: ((val: string) => void)[] = [];

  const handleNewAgency = () => {
    setSelectedAgency({ data: null, error: false });
    setIsOpen(true);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["agencies", pageIndex, pageSize],
    queryFn: () => getAgencies(pageIndex + 1, pageSize),
  });

  return (
    <PermissionGate codename="view_agents">
      <div className="w-full h-full">
        <DataTable
          tableKey={TABLEKEY}
          data={data || { error: false, data: { count: 0, results: [] } }}
          columns={AgenciesColumns}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          options={[]}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={filterSetters}
          actionButton={
            <PermissionGate codename="add_agents" showFallback={false}>
              <Button className="flex gap-4 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary" onClick={handleNewAgency}>
                <UserPlus />
                New Agent
              </Button>
            </PermissionGate>
          }
        />
        <PermissionGate codename="add_agents" showFallback={false}>
          <AddAgency />
        </PermissionGate>
      </div>
    </PermissionGate>
  );
};
export default FetchAgency; 