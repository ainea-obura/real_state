"use client";

import { Users, BookKey, Home, HousePlus, LucideIcon } from "lucide-react";
import React, { useMemo } from "react";
import SideBarCards from "@/components/sideBarCard";
import FetchAgency from "./fetchAgency";

interface IStatistics {
  id: number;
  name: string;
  value: string;
  icon: LucideIcon;
  desc: string;
}

// Mock agency data for table
const mockAgencyData = {
  isError: false,
  data: {
    count: 3,
    results: [
      {
        id: "1b2c3d4e-0000-0000-0000-000000000001",
        email: "contact@agencyalpha.com",
        first_name: "Agency",
        last_name: "Alpha",
        phone: "+1234567890",
        gender: "N/A",
        type: "owner",
        is_active: true,
        is_owner_verified: true,
        created_at: "2024-01-01T00:00:00Z",
        modified_at: "2024-06-01T00:00:00Z",
      },
      {
        id: "1b2c3d4e-0000-0000-0000-000000000002",
        email: "info@betarealty.com",
        first_name: "Beta",
        last_name: "Realty",
        phone: "+1987654321",
        gender: "N/A",
        type: "owner",
        is_active: false,
        is_owner_verified: false,
        created_at: "2024-02-15T00:00:00Z",
        modified_at: "2024-06-10T00:00:00Z",
      },
      {
        id: "1b2c3d4e-0000-0000-0000-000000000003",
        email: "hello@gammagroup.com",
        first_name: "Gamma",
        last_name: "Group",
        phone: "+1122334455",
        gender: "N/A",
        type: "owner",
        is_active: true,
        is_owner_verified: true,
        created_at: "2024-03-10T00:00:00Z",
        modified_at: "2024-06-15T00:00:00Z",
      },
    ],
  },
};

const ShowAgencyStatistics: React.FC = () => {
  // Calculate statistics from mock data
  const StatiscsData: IStatistics[] = useMemo(() => {
    const agencies = mockAgencyData.data.results;
    const activeAgencies = agencies.filter((a) => a.is_active).length;
    const inactiveAgencies = agencies.filter((a) => !a.is_active).length;
    return [
      {
        id: 1,
        name: "Total Agencies",
        value: agencies.length.toString(),
        desc: "Total agencies registered",
        icon: Users,
      },
      {
        id: 2,
        name: "Active Agencies",
        value: activeAgencies.toString(),
        desc: "Currently active agencies",
        icon: BookKey,
      },
      {
        id: 3,
        name: "Inactive Agencies",
        value: inactiveAgencies.toString(),
        desc: "Currently inactive agencies",
        icon: Home,
      },
      {
        id: 4,
        name: "New This Month",
        value: "1",
        desc: "Agencies added this month",
        icon: HousePlus,
      },
    ];
  }, []);

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
        <FetchAgency
          data={mockAgencyData}
          isPending={false}
          isError={false}
          error={null}
        />
      </div>
    </div>
  );
};

export default ShowAgencyStatistics; 