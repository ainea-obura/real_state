import { useAtomValue, useSetAtom } from 'jotai';
import { FolderPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { DataTable } from '@/components/datatable/data-table';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { Button } from '@/components/ui/button';
import { ProjectsResponse } from '@/schema/projects/schema';
import { deleteProjectId, isProjectModelOpen, projectName } from '@/store';

import AddProject from './addProject';
// import AddProject from './addProject';
import { ProjectsColumns } from './columns';
import DeleteProjectModal from './DeleteProjectModal';

interface IFetchProjects {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: ProjectsResponse;
}

const SEARCHABLE_COLUMN_IDS = ["name", "management_fee"] as const;
export type ColumnKeyProjects = (typeof SEARCHABLE_COLUMN_IDS)[number];
const TABLEKEY = "projects" as const;

const FetchProjects: React.FC<IFetchProjects> = ({
  data,
  isError,
  isPending,
  error,
}) => {
  const setName = useSetAtom(projectName);
  const setIsOpen = useSetAtom(isProjectModelOpen);
  const projectId = useAtomValue(deleteProjectId);
  const filterSetters = useMemo(
    () => [setName] as ((val: string) => void)[],
    [setName]
  );

  const ACTION_PERMISSIONS = [
    "view_projects_profile",
    "edit_projects",
    "delete_projects",
  ];

  const { data: session } = useSession();
  const { isSuperuser, hasPermission } = usePermissions();

  // Filter columns: remove "actions" column if user has no permissions
  const columns =
    isSuperuser || hasPermission(ACTION_PERMISSIONS)
      ? ProjectsColumns
      : ProjectsColumns.filter((col) => col.id !== "actions");

  return (
    <div className="w-full h-full">
      <DataTable
        tableKey={TABLEKEY}
        data={{
          ...data,
          data: {
            ...data.data,
            count: data.data?.count ?? 0,
            results: Array.isArray(data.data?.results)
              ? data.data.results
              : data.data?.results
              ? [data.data.results]
              : [],
          },
        }}
        columns={columns}
        isLoading={isPending}
        isError={isError}
        options={[
          { label: "residential", value: "residential" },
          { label: "commercial", value: "commercial" },
        ]}
        errorMessage={(error as Error)?.message}
        searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
        searchableColumnsSetters={filterSetters}
        actionButton={
          <PermissionGate codename="add_projects" showFallback={false}>
            <Button
              className={
                "flex gap-4 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
              }
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <FolderPlus />
              New Project
            </Button>
          </PermissionGate>
        }
      />
      <AddProject />
      <DeleteProjectModal
        project={
          projectId
            ? Array.isArray(data.data.results)
              ? data.data.results.find((p) => p.id === projectId)
              : data.data.results && data.data.results.id === projectId
              ? data.data.results
              : undefined
            : undefined
        }
      />
    </div>
  );
};
export default FetchProjects;
