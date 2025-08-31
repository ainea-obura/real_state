"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/actions/projects/index";
import { getProjectStructure } from "@/actions/projects/structure";
import RentCard from "./RentCard";
import DateRangeFilter from "./DateRangeFilter";
import { RentalUnit } from "./schema";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX } from "lucide-react"; // Use a valid Lucide icon for empty state
import { fetchRentList } from "@/actions/managements/rent";
import { PermissionGate } from "@/components/PermissionGate";

function isRentalInRange(rental: any, from?: Date, to?: Date) {
  if (!from && !to) return true;
  if (!rental.rental_start || !rental.rental_end) return false;
  const start = new Date(rental.rental_start);
  const end = new Date(rental.rental_end);
  // Overlaps if rental period intersects selected range
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
}

const RentList = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: firstDayOfMonth,
    to: today,
  });
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("");

  // Fetch projects for dropdown
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const data = await getProjects({ is_dropdown: true });

      if (data.error) return [];
      return data.data.results;
    },
  });

  // Fetch project structure (blocks) when a project is selected
  const {
    data: structureData,
    isLoading: isStructureLoading,
    isError: isStructureError,
  } = useQuery({
    queryKey: ["project-structure", selectedProject],
    queryFn: async () => {
      if (!selectedProject) return null;
      const data = await getProjectStructure(selectedProject);
      if (data.error) return null;
      return data.data.results;
    },
    enabled: !!selectedProject,
  });

  // Extract blocks from structure data
  const blocks = useMemo(() => {
    if (!structureData || !Array.isArray(structureData)) return [];
    return structureData.filter(
      (node: any) => node.node_type === "BLOCK" || node.node_type === "HOUSE"
    );
  }, [structureData]);

  // Reset block selection when project changes
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedBlock(""); // Reset block selection
  };

  // Fetch rentals from API
  const {
    data: rentalsData,
    isLoading: isRentalsLoading,
    isError: isRentalsError,
  } = useQuery({
    queryKey: [
      "rentals",
      selectedProject,
      selectedBlock,
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString(),
    ],
    queryFn: async () => {
      const data = await fetchRentList({
        project: selectedProject || undefined,
        block: selectedBlock || undefined,
        from: dateRange.from
          ? dateRange.from.toISOString().slice(0, 10)
          : undefined,
        to: dateRange.to ? dateRange.to.toISOString().slice(0, 10) : undefined,
      });
      if (data && data.error) return [];
      return data.data;
    },
  });

  // Skeletons
  const skeletonArray = Array.from({ length: 8 });
  const RentCardSkeleton = () => (
    <div className="flex flex-col min-h-[370px] h-full rounded-xl bg-gray-50 border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="flex overflow-hidden relative justify-center items-center w-full h-40 bg-gray-200">
        <Skeleton className="w-full h-40" />
      </div>
      {/* Header: Name & Location */}
      <div className="flex flex-row justify-between items-center px-4 pt-3 pb-2 bg-transparent">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex gap-2 items-center">
            <Skeleton className="w-32 h-5 rounded" />
          </div>
          <div className="flex gap-2 items-center pl-0 text-xs">
            <Skeleton className="w-24 h-3 rounded" />
          </div>
        </div>
        <Skeleton className="w-16 h-6 rounded" />
      </div>
      {/* Details */}
      <div className="flex flex-col flex-1 justify-between px-4 pb-4 space-y-2">
        {/* Unit Details */}
        <div className="pb-2 space-y-1 border-b border-gray-200 border-dashed">
          <div className="flex gap-2 items-center text-sm">
            <Skeleton className="w-10 h-4 rounded" />
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-10 h-4 rounded" />
          </div>
        </div>
        {/* Tenant & Agent Details */}
        <div className="pt-2 space-y-1">
          <div className="flex gap-2 items-center text-sm">
            <Skeleton className="w-24 h-4 rounded" />
          </div>
          <Skeleton className="w-24 h-4 rounded" />
          <Skeleton className="w-32 h-4 rounded" />
        </div>
        {/* Price at the bottom */}
        <div className="flex gap-2 items-center pt-2 mt-auto text-sm">
          <Skeleton className="w-16 h-6 rounded" />
          <Skeleton className="w-10 h-4 rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <PermissionGate codename="for_rent">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 mb-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight">
              Rented Units
            </h1>
            <p className="text-base text-muted-foreground">
              Manage rented properties and tenants
            </p>
          </div>
          <div className="flex flex-row gap-3 items-center">
            {isProjectsLoading ? (
              <Skeleton className="w-40 h-10 rounded-md" />
            ) : (
              <select
                className="px-3 py-2 text-sm bg-gray-100 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                style={{ minWidth: 160 }}
                disabled={isProjectsLoading || isProjectsError}
              >
                <option value="">
                  {isProjectsError ? "Failed to load" : "All Projects"}
                </option>
                {projectsData && Array.isArray(projectsData)
                  ? projectsData.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.node.name}
                      </option>
                    ))
                  : null}
              </select>
            )}
            {selectedProject && (
              <select
                className="px-3 py-2 text-sm bg-gray-100 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                style={{ minWidth: 160 }}
                disabled={isStructureLoading || isStructureError}
              >
                <option value="">
                  {isStructureError ? "Failed to load blocks" : "All Blocks"}
                </option>
                {blocks.map((block: any) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            )}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 items-stretch sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {isRentalsLoading ? (
            skeletonArray.map((_, i) => <RentCardSkeleton key={i} />)
          ) : (Array.isArray(rentalsData) ? rentalsData : []).length === 0 ? (
            <div className="flex flex-col col-span-full justify-center items-center py-16">
              <div className="mb-4 text-gray-400">
                <FileX size={56} />
              </div>
              <div className="mb-1 text-lg font-semibold text-gray-700">
                No rentals found
              </div>
              <div className="text-sm text-gray-500">
                Try adjusting your filters or date range.
              </div>
            </div>
          ) : (
            (Array.isArray(rentalsData) ? rentalsData : []).map(
              (rental: RentalUnit) => (
                <RentCard key={rental.id} rental={rental} />
              )
            )
          )}
        </div>
      </div>
    </PermissionGate>
  );
};

export default RentList;
