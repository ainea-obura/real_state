"use client";
import {
    AlertCircle, BarChart3, Building2, Coins, Hammer, Home, ParkingCircleIcon, Users, Wrench,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getProjectDetail } from '@/actions/projects';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

import Basement from './tabs/Components/basement/basement';
import Maintenance from './tabs/Components/maintenance/maintenance';
import Payment from './tabs/Components/payment/payment';
import ProjectOverview from './tabs/projectOverview';
import ProjectOwners from './tabs/projectOwners';
import ProjectStructureTab from './tabs/projectStructureTab';
import { ServiceTab } from './tabs/ServiceTab';
import TenantTab from './tabs/tenantTab';

import type { ProjectsResponse, ProjectDetail } from "@/schema/projects/schema";
const ProjectDetail = ({ projectId }: { projectId: string }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Read tab and modal from query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    // Optionally, you could handle modal here if you want to trigger it only once
  }, [searchParams]);

  let projectData: ProjectDetail | undefined = undefined;

  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      // No permission needed
    },
    {
      id: "structure",
      label: "Structure",
      icon: Building2,
      permission: "view_structure",
    },
    {
      id: "tenants",
      label: "Allocate Tenants",
      icon: Users,
      permission: "view_tenants",
    },
    {
      id: "owners",
      label: "Assign Owners",
      icon: Home,
      permission: "view_owners",
    },
    {
      id: "payments",
      label: "Payments",
      icon: Coins,
      permission: "view_payments",
    },
    {
      id: "services",
      label: "Services",
      icon: Hammer,
      permission: "view_services",
    },
    {
      id: "basement",
      label: "Parking",
      icon: ParkingCircleIcon,
      permission: "view_basement",
    },
    {
      id: "maintenance",
      label: "Maintenance",
      icon: Wrench,
      permission: "view_maintenance",
    },
  ];

  const { isSuperuser, hasPermission } = usePermissions();
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.permission || hasPermission(item.permission) || isSuperuser
  );

  const queryResult = useQuery<ProjectsResponse>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await getProjectDetail(projectId);
      if (res.error) {
        throw res;
      }
      return res;
    },
  });

  const { data, error, isLoading } = queryResult;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full min-h-screen">
        <div className="border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert className="my-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No project data found</AlertDescription>
      </Alert>
    );
  }

  if (data.data && data.data.results) {
    if (Array.isArray(data.data.results)) {
      projectData = data.data.results[0];
    } else {
      projectData = data.data.results;
    }
  }
  if (!projectData) {
    return (
      <Alert className="my-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No project data found</AlertDescription>
      </Alert>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <ProjectOverview projectData={projectData} />;
      case "structure": {
        // Pass modal param to ProjectStructureTab
        const modal = searchParams.get("modal");
        return <ProjectStructureTab projectId={projectId} openModal={modal} />;
      }
      case "tenants":
        return <TenantTab projectId={projectId} />;
      case "payments":
        return <Payment projectId={projectId} />;
      case "services":
        return (
          <ServiceTab
            projectId={projectId}
            projectName={projectData.node?.name || ""}
            projectNodeId={projectData.node?.id || ""}
          />
        );
      case "owners":
        return <ProjectOwners projectId={projectId} />;
      case "maintenance":
        return <Maintenance projectId={projectId} />;
      case "basement":
        return <Basement projectId={projectId} />;
      default:
        return <div>overview</div>;
    }
  };

  return (
    <PermissionGate codename="view_projects_profile">
      <div className="flex flex-col gap-4">
        <div className="gap-6 grid grid-cols-12">
          <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
            {/* Property Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="bg-white/10 p-2.5 rounded-md">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-lg">
                    {projectData.node?.name || "-"}
                  </h2>
                  <p className="text-white/80 text-sm line-clamp-2">
                    {projectData.location?.address || "-"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Navigation Section */}
            <div className="p-4">
              <h3 className="mb-3 px-2 font-medium text-white/70 text-xs uppercase tracking-wider">
                Navigation
              </h3>

              {/* Navigation Grid */}
              <ScrollArea className="h-[calc(100vh-300px)]">
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
                            activeTab === item.id
                              ? "text-primary"
                              : "text-white",
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
                          activeTab === item.id
                            ? "text-primary"
                            : "text-white/90",
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
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>
          </div>
          <div className="col-span-9 p-4 rounded-md h-full">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};

export default ProjectDetail;
