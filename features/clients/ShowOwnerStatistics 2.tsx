"use client";

import { useAtomValue, useSetAtom } from 'jotai';
import { BookKey, FolderKanban, Home, HousePlus, LucideIcon, Users } from 'lucide-react';
import React, { useMemo } from 'react';

import { getOwners } from '@/actions/clients';
import SideBarCards from '@/components/sideBarCard';
import { isOwnerModelOpen, ownerName, pageIndexAtom, pageSizeAtom } from '@/store';
import { useQuery } from '@tanstack/react-query';

import FetchOwners, { ColumnKeyOwners } from './fetchOwners';

interface IStatistics {
  id: number;
  name: string;
  value: string;
  icon: LucideIcon;
  desc: string;
}

import type { ClientsResponse } from "@/features/clients/types";

const ShowOwnerStatistics: React.FC = () => {
  const pageIndex = useAtomValue(pageIndexAtom);
  const pageSize = useAtomValue(pageSizeAtom);
  const setIsModelOpen = useSetAtom(isOwnerModelOpen);
  const name = useAtomValue(ownerName);

  const filter = useMemo<Record<ColumnKeyOwners, string>>(
    () => ({ name }),
    [name]
  );

  const {
    data: responseData,
    isLoading,
    isError,
    error,
  } = useQuery<ClientsResponse, Error>({
    queryKey: ["owners", pageIndex, pageSize, filter],
    queryFn: () => getOwners(pageIndex + 1, pageSize, filter),
  });

  const StatiscsData: IStatistics[] = useMemo(() => {
    if (!responseData?.data?.results?.length && !isLoading) {
      return [];
    }

    const owners = responseData?.data?.results || [];

    // Calculate statistics
    const activeOwners = owners.filter((owner) => owner.is_active).length;
    const inactiveOwners = owners.filter((owner) => !owner.is_active).length;

    return [
      {
        id: 1,
        name: "Total",
        value: owners.length.toString(),
        desc: "Total owners registered",
        icon: Users,
      },
      {
        id: 2,
        name: "Verified",
        value: activeOwners.toString(),
        desc: "Currently active owners",
        icon: BookKey,
      },
      {
        id: 3,
        name: "Unverified",
        value: inactiveOwners.toString(),
        desc: "Currently inactive owners",
        icon: Home,
      },
      {
        id: 4,
        name: "New",
        value: "0",
        desc: "New Owners",
        icon: Home,
      },
    ];
  }, [responseData, isLoading]);

  if (isError || responseData?.isError) {
    return (
      <div className="p-4 text-red-600">
        {error?.message || "Failed to load owners."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        <FetchOwners
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

export default ShowOwnerStatistics;
