"use client";

import { useAtomValue, useSetAtom } from "jotai";
import {
  BookKey,
  FolderKanban,
  Home,
  HousePlus,
  LucideIcon,
} from "lucide-react";
import React, { useMemo } from "react";

import { getProjects } from "@/actions/projects";
import SideBarCards from "@/components/sideBarCard";
import {
  isProjectModelOpen,
  pageIndexAtom,
  pageSizeAtom,
  projectName,
} from "@/store";
import { useQuery } from "@tanstack/react-query";
import { PermissionGate } from "@/components/PermissionGate";
import FetchProjects, { ColumnKeyProjects } from "./fetchProjects";

interface IStatistics {
  id: number;
  name: string;
  value: string;
  icon: LucideIcon;
  desc: string;
}

import type { ProjectsResponse } from "@/schema/projects/schema";
const ShowStatistics: React.FC = () => {
  const pageIndex = useAtomValue(pageIndexAtom);
  const pageSize = useAtomValue(pageSizeAtom);
  const setIsModelOpen = useSetAtom(isProjectModelOpen);
  const name = useAtomValue(projectName);

  const filter = useMemo<Record<ColumnKeyProjects, string>>(
    () => ({ name }),
    [name]
  );

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery<ProjectsResponse, Error>({
    queryKey: ["projects", pageIndex, pageSize, filter],
    queryFn: () =>
      getProjects({
        page: pageIndex + 1,
        pageSize: pageSize,
        status: "",
        branch: "",
      }),
  });

  const StatiscsData: IStatistics[] = useMemo(() => {
    if (!responseData?.data?.results?.length && !isLoading) {
      return [];
    }

    const projects = responseData?.data?.results || [];

    // Calculate total properties and units
    const totalProperties = 0;
    const unitsForSale = 0;
    const rentedUnits = 0;

    return [
      {
        id: 1,
        name: "Total Projects",
        value: projects.length.toString(),
        desc: "Total projects you have",
        icon: FolderKanban,
      },
      {
        id: 2,
        name: "Total Properties",
        value: totalProperties.toString(),
        desc: "Total properties across all projects",
        icon: HousePlus,
      },
      {
        id: 3,
        name: "For Sale",
        value: unitsForSale.toString(),
        desc: "Total units for sale",
        icon: Home,
      },
      {
        id: 4,
        name: "Rented Units",
        value: rentedUnits.toString(),
        desc: "Total rented units",
        icon: BookKey,
      },
    ];
  }, [responseData, isLoading]);

  if (isError || responseData?.isError) {
    return (
      <div className="p-4 text-red-600">
        {error?.message || "Failed to load projects."}
      </div>
    );
  }

  return (
    <PermissionGate codename="view_projects">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {StatiscsData.map((item) => (
            <div key={item.id} className="w-full">
              <SideBarCards
                icon={item.icon}
                title={item.name}
                value={item.value}
                desc={item.desc}
              />
            </div>
          ))}
        </div>

        <div className="w-full">
          <FetchProjects
            data={
              responseData || {
                isError: false,
                data: { count: 0, results: [] },
              }
            }
            isPending={isLoading}
            isError={isError}
            error={error}
          />
        </div>
      </div>
    </PermissionGate>
  );
};

export default ShowStatistics;
