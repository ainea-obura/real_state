"use client";
import {
    AlertTriangle, BarChart3, Building2, CheckCircle, Clock, FileText, Home, Users,
} from 'lucide-react';

import { fetchDashboardStats } from '@/actions/dahsboard';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

import { DashboardStats as DashboardStatsType } from '../schema/dashboard';

export const DashboardStats = () => {
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  // Get stats from the first result in the API response
  const stats: DashboardStatsType | null =
    dashboardData?.data?.results?.[0] || null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Card
            key={idx}
            className="relative bg-gray-100 shadow-none border-none overflow-hidden"
          >
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 p-2.5 rounded-md animate-pulse">
                      <div className="bg-gray-300 rounded w-5 h-5" />
                    </div>
                    <div className="flex flex-col justify-between items-start">
                      <div className="bg-gray-200 rounded w-20 h-4 animate-pulse" />
                      <div className="bg-gray-200 mt-2 rounded w-12 h-6 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <div className="bg-gray-200 rounded w-32 h-3 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h3 className="font-medium">Error loading dashboard stats</h3>
                <p className="text-red-600 text-sm">
                  Please try refreshing the page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show stats when data is available
  if (!stats) {
    return (
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-gray-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h3 className="font-medium">No data available</h3>
                <p className="text-gray-600 text-sm">
                  Dashboard stats could not be loaded
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      icon: Building2,
      title: "Total Properties",
      value: stats.totalProperties.toString(),
      bg: "bg-blue-100 hover:bg-blue-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-blue-200",
      valueClass: "text-blue-700",
      description: "All properties managed in the system",
    },
    {
      icon: Home,
      title: "Fully Managed",
      value: stats.fullManagement.toString(),
      bg: "bg-green-100 hover:bg-green-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-green-200",
      valueClass: "text-green-700",
      description: "Properties under full management",
    },
    {
      icon: BarChart3,
      title: "Services Only",
      value: stats.servicesOnly.toString(),
      bg: "bg-purple-100 hover:bg-purple-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-purple-200",
      valueClass: "text-purple-700",
      description: "Properties we offer service-only",
    },
    {
      icon: CheckCircle,
      title: "Occupancy Rate",
      value: `${stats.occupancyRate}%`,
      bg: "bg-emerald-100 hover:bg-emerald-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-emerald-200",
      valueClass: "text-emerald-700",
      description: "Occupied units as a percentage",
    },
    {
      icon: Users,
      title: "Active Tenants",
      value: stats.activeTenants.toString(),
      bg: "bg-indigo-100 hover:bg-indigo-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-indigo-200",
      valueClass: "text-indigo-700",
      description: "Current tenants with active leases",
    },
    {
      icon: FileText,
      title: "Active Contracts",
      value: stats.activeContracts.toString(),
      bg: "bg-pink-100 hover:bg-pink-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-pink-200",
      valueClass: "text-pink-700",
      description: "Valid/active lease contracts",
    },
    {
      icon: AlertTriangle,
      title: "Leases Ending Soon",
      value: stats.leasesEndingSoon.toString(),
      bg: "bg-amber-100 hover:bg-amber-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-amber-200",
      valueClass: "text-amber-700",
      description: "Leases expiring within 30 days",
    },
    {
      icon: Clock,
      title: "Expired Leases",
      value: stats.expiredLeases.toString(),
      bg: "bg-red-100 hover:bg-red-200 transition-all duration-200 ease-in-out",
      iconBg: "bg-gray-200",
      valueClass: "text-gray-700",
      description: "Leases that have already expired",
    },
  ];

  return (
    <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, idx) => (
        <Card
          key={idx}
          className={`relative ${card.bg} shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out`}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`${card.iconBg} p-2.5 rounded-md`}>
                    <card.icon className={`w-5 h-5 ${card.valueClass}`} />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-sm">{card.title}</h3>
                    <span
                      className={`text-2xl font-semibold tracking-tight ${card.valueClass}`}
                    >
                      {card.value}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="text-gray-500 text-xs">{card.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
