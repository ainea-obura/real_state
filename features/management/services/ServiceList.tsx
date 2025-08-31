"use client";

import { useState, useMemo } from "react";

import { fetchServiceCardList } from "@/actions/managements/service";
import { getProjects } from "@/actions/projects/index";
import { getProjectStructure } from "@/actions/projects/structure";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

import ServiceCard from "./ServiceCard";
import { PermissionGate } from "@/components/PermissionGate";

const ServiceList = () => {
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
      return Array.isArray(data.data.results) ? data.data.results : [];
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

  // Fetch service cards
  const {
    data: serviceData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["service-cards", selectedProject, selectedBlock],
    queryFn: async () => {
      const data = await fetchServiceCardList({
        project: selectedProject || undefined,
        block: selectedBlock || undefined,
      });
      if (data && data.error) return [];
      return data.data;
    },
  });

  const skeletonArray = Array.from({ length: 8 });

  // Filter service cards by selected project and block
  const filteredServiceCards = (serviceData?.data ?? []).filter((card) => {
    // Filter by project
    if (selectedProject && card.project_id !== selectedProject) {
      return false;
    }
    // Filter by block if selected
    if (selectedBlock && card.block_id !== selectedBlock) {
      return false;
    }
    return true;
  });

  return (
    <PermissionGate codename="for_service">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 mb-2 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight">
              Property Services
            </h1>
            <p className="text-base text-muted-foreground">
              Manage services provided to properties and units
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
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 items-stretch sm:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-3">
          {isLoading ? (
            skeletonArray.map((_, i) => (
              <div
                key={i}
                className="flex flex-col shadow-sm border rounded-xl h-full min-h-[270px] overflow-hidden"
              >
                <div className="flex overflow-hidden relative justify-center items-center w-full h-32 bg-gray-200">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="flex flex-col flex-1 gap-2 p-4">
                  <Skeleton className="mb-2 w-2/3 h-6" />
                  <Skeleton className="mb-1 w-1/2 h-4" />
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="w-16 h-5 rounded" />
                    <Skeleton className="w-12 h-5 rounded" />
                  </div>
                  <Skeleton className="w-1/3 h-3" />
                </div>
              </div>
            ))
          ) : isError ? (
            <div className="col-span-full py-8 text-center text-red-500">
              Failed to load services.
            </div>
          ) : filteredServiceCards.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              No services found.
            </div>
          ) : (
            filteredServiceCards.map((serviceCard) => (
              <ServiceCard key={serviceCard.id} serviceCard={serviceCard} />
            ))
          )}
        </div>
      </div>
    </PermissionGate>
  );
};

export default ServiceList;
