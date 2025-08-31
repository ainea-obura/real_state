"use client";
import { Building03Icon } from "hugeicons-react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  DollarSign,
  Hammer,
  Home,
  Users,
  File,
  Receipt,
  CheckCircle,
  CreditCard,
} from "lucide-react";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useAtom } from "jotai";
import { isTenantModelOpen, selectedTenantAtom } from "@/store";
import AddTenant from "./addTenant";

import {
  getTenantDashboard,
  getTenantPropertyAssignments,
  getTenantPropertyAssignmentStats,
} from "@/actions/clients/tenantDashboard";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/components/providers/PermissionProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

import TenantBills from "./tabs/tenantBills";
import TenantDocuments from "./tabs/tenantDocuments";
import TenantOverview from "./tabs/tenantOverview";
import TenantProperties from "./tabs/tenantProperties";
import TenantVerification from "./tabs/tenantVerification";
import TenantAccounts from "./tabs/tenantAccounts";

import type { TenantDashboardResponse } from "./tabs/schema/tenantDashboard";
import { useSearchParams } from "next/navigation";
const ClientDetail = ({ tenantId }: { tenantId: string }) => {
  // All hooks at the top!
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(initialTab || "overview");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const { isSuperuser, hasPermission } = usePermissions();
  const [isEditOpen, setIsEditOpen] = useAtom(isTenantModelOpen);
  const [selectedTenant, setSelectedTenant] = useAtom(selectedTenantAtom);

  // Navigation items and permissions
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      permission: "view_tenant_overview",
    },
    {
      id: "properties",
      label: "Properties",
      icon: Building03Icon,
      permission: "view_tenant_properties",
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: CreditCard,
      permission: "view_tenant_accounts",
    },
    // {
    //   id: "bills",
    //   label: "Bills",
    //   icon: Receipt,
    //   permission: "view_tenant_bills",
    // },
    {
      id: "documents",
      label: "Documents",
      icon: File,
      permission: "view_tenant_documents",
    },
    {
      id: "verification",
      label: "Verification",
      icon: CheckCircle,
      permission: "view_tenant_verification",
    },
  ];
  const visibleNavigationItems = navigationItems.filter(
    (item: any) => !item.permission || hasPermission(item.permission)
  );

  // Fetch property assignments for the tenant
  const {
    data: propertyAssignmentsData,
    isLoading: isAssignmentsLoading,
    error: assignmentsError,
  } = useQuery({
    queryKey: ["tenant-property-assignments", tenantId],
    queryFn: () => getTenantPropertyAssignments(tenantId),
    enabled: !!tenantId,
  });

  // Fetch property assignment stats for the tenant
  const {
    data: propertyAssignmentStatsData,
    isLoading: isStatsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["tenant-property-assignment-stats", tenantId],
    queryFn: () => getTenantPropertyAssignmentStats(tenantId),
    enabled: !!tenantId,
  });

  // Fetch real data from backend
  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant-dashboard", tenantId],
    queryFn: () => getTenantDashboard(tenantId),
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }
  if (error || data?.error || !data?.data) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        {data?.message ||
          (error as Error)?.message ||
          "Failed to load tenant dashboard."}
      </div>
    );
  }

  // For properties tab, handle loading/error for assignments
  if (activeTab === "properties") {
    if (isAssignmentsLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          Loading property assignments...
        </div>
      );
    }
    if (
      assignmentsError ||
      propertyAssignmentsData?.error ||
      !propertyAssignmentsData?.data
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-red-600">
          {propertyAssignmentsData?.message ||
            (assignmentsError as Error)?.message ||
            "Failed to load property assignments."}
        </div>
      );
    }
  }

  const dashboardData = data;
  const property_assignments = (
    propertyAssignmentsData?.data?.results || []
  ).map((assignment: any) => ({
    ...assignment,
    rent_amount:
      assignment.rent_amount !== undefined
        ? String(assignment.rent_amount)
        : "",
  }));

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <PermissionGate codename="view_tenant_overview">
            {/* Removed Edit button above stats cards */}
            <TenantBills tenantId={tenantId} />
          </PermissionGate>
        );
      case "properties":
        return (
          <PermissionGate codename="view_tenant_properties">
            <TenantProperties
              property_assignments={property_assignments}
              tenantId={tenantId}
              propertyAssignmentStats={
                propertyAssignmentStatsData
                  ? {
                      ...propertyAssignmentStatsData,
                      data: propertyAssignmentStatsData.data ?? undefined,
                    }
                  : undefined
              }
              isStatsLoading={isStatsLoading}
              statsError={statsError}
            />
          </PermissionGate>
        );
      case "accounts":
        return (
          <PermissionGate codename="view_tenant_accounts">
            <TenantAccounts tenantId={tenantId} />
          </PermissionGate>
        );
      // case "bills":
      //   return <TenantBills />;
      case "documents":
        return (
          <PermissionGate codename="view_tenant_documents">
            <TenantDocuments tenantId={tenantId} />
          </PermissionGate>
        );
      case "verification":
        return (
          <PermissionGate codename="view_tenant_verification">
            <TenantVerification tenantId={tenantId} />
          </PermissionGate>
        );
      default:
        return (
          <PermissionGate codename="view_tenant_overview">
            <TenantOverview tenantId={tenantId} />
          </PermissionGate>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
          {/* Property Header */}
          <div className="p-6 pb-4">
            <div className="flex gap-3 items-start">
              <div className="bg-white/10 p-2.5 rounded-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {data.data.tenant.first_name} {data.data.tenant.last_name}
                </h2>
                <p className="text-sm text-white/80 line-clamp-2">
                  {data.data.tenant.email}
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Navigation Section */}
          <div className="p-4">
            <h3 className="px-2 mb-3 text-xs font-medium tracking-wider uppercase text-white/70">
              Navigation
            </h3>

            {/* Navigation Grid */}
            <nav className="gap-2.5 grid grid-cols-2">
              {visibleNavigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={cn(
                    "group flex cursor-pointer flex-col items-center p-3 rounded-lg transition-all duration-300 relative",
                    activeTab === item.id
                      ? "bg-white shadow-lg"
                      : "bg-secondary/20 hover:bg-secondary/30",
                    hoveredTab === item.id &&
                      activeTab !== item.id &&
                      "scale-[1.02]"
                  )}
                >
                  {/* Icon Container */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-all duration-300 relative",
                      activeTab === item.id
                        ? "bg-primary/10 shadow-sm"
                        : "bg-white/10",
                      hoveredTab === item.id &&
                        activeTab !== item.id &&
                        "bg-white/20"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-[22px] h-[22px] transition-all duration-300",
                        activeTab === item.id ? "text-primary" : "text-white",
                        hoveredTab === item.id &&
                          activeTab !== item.id &&
                          "scale-110"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "font-medium text-sm transition-all duration-300",
                      activeTab === item.id ? "text-primary" : "text-white/90",
                      hoveredTab === item.id &&
                        activeTab !== item.id &&
                        "text-white"
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator Dot */}
                  {activeTab === item.id && (
                    <div className="-bottom-0.5 left-1/2 absolute bg-primary rounded-full w-1 h-1 -translate-x-1/2" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="col-span-9 p-4 h-full rounded-md">
          {renderTabContent()}
        </div>
      </div>
      <AddTenant />
    </div>
  );
};

export default ClientDetail;
