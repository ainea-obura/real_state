"use client";

import { useAtomValue, useSetAtom } from "jotai";
import {
  BookKey,
  FolderKanban,
  Home,
  HousePlus,
  LucideIcon,
  Users,
} from "lucide-react";
import React, { useMemo } from "react";

import { getTenants } from "@/actions/clients";
import SideBarCards from "@/components/sideBarCard";
import {
  isTenantModelOpen,
  pageIndexAtom,
  pageSizeAtom,
  tenantName,
} from "@/store";
import { useQuery } from "@tanstack/react-query";

import FetchTenants, { ColumnKeyTenants } from "./fetchTenants";

interface IStatistics {
  id: number;
  name: string;
  value: string;
  icon: LucideIcon;
  desc: string;
}

import type { ClientsResponse } from "@/features/clients/types";

const ShowTenantStatistics: React.FC = () => {
  const pageIndex = useAtomValue(pageIndexAtom);
  const pageSize = useAtomValue(pageSizeAtom);
  const setIsModelOpen = useSetAtom(isTenantModelOpen);
  const name = useAtomValue(tenantName);

  const filter = useMemo<Record<ColumnKeyTenants, string>>(
    () => ({ name }),
    [name]
  );

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery<ClientsResponse, Error>({
    queryKey: ["tenants", pageIndex, pageSize, filter],
    queryFn: async ()=>{
        const res = await getTenants(pageIndex + 1, pageSize, filter)
        return res
    },
  });

  const StatiscsData: IStatistics[] = useMemo(() => {
    if (!responseData?.data?.results?.length && !isLoading) {
      return [];
    }

    const tenants = responseData?.data?.results || [];

    // Calculate statistics
    const activeTenants = tenants.filter((tenant) => tenant.is_active).length;
    const inactiveTenants = tenants.filter(
      (tenant) => !tenant.is_active
    ).length;

    return [
      {
        id: 1,
        name: "Total Tenants",
        value: tenants.length.toString(),
        desc: "Total tenants registered",
        icon: Users,
      },
      {
        id: 2,
        name: "Active Tenants",
        value: activeTenants.toString(),
        desc: "Currently active tenants",
        icon: BookKey,
      },
      {
        id: 3,
        name: "Inactive Tenants",
        value: inactiveTenants.toString(),
        desc: "Currently inactive tenants",
        icon: Home,
      },
      {
        id: 4,
        name: "New This Month",
        value: "0",
        desc: "Tenants added this month",
        icon: HousePlus,
      },
    ];
  }, [responseData, isLoading]);

  if (isError || responseData?.isError) {
    return (
      <div className="p-4 text-red-600">
        {error?.message || "Failed to load tenants."}
      </div>
    );
  }

  return (
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
        <FetchTenants
          data={
            responseData || { isError: false, data: { count: 0, results: [] } }
          }
          isPending={isLoading}
          isError={isError}
          error={error}
        />
      </div>
    </div>
  );
};

export default ShowTenantStatistics;
