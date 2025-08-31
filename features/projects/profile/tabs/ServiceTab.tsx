"use client";

import { differenceInDays, parseISO } from 'date-fns';
import {
    Activity, AlertTriangle, Building2, Droplets, Gauge, Globe, Grid, Home, Layers, PauseCircle,
    Percent, PlayCircle, PlusCircle, Shield, Timer, Trash2, User, Users, XCircle, Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
    deleteProjectServiceAssignment, getProjectServiceOverview,
} from '@/actions/projects/services';
import { ProjectServiceOverview, ServiceAssignment } from '@/actions/projects/services-schemas';
import { PermissionGate } from '@/components/PermissionGate';
import StatisticsCard from '@/components/statisticsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation, useQuery } from '@tanstack/react-query';

import AttachServiceModal from './Components/service/attachService';
import ServiceActionModal from './RemoveServiceModal';

// Update ServiceTabProps
type ServiceTabProps = {
  projectId: string;
  projectName: string;
  projectNodeId: string;
};

export const ServiceTab: React.FC<ServiceTabProps> = ({
  projectId,
  projectName,
  projectNodeId,
}) => {
  // All hooks at the top
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProjectServiceOverview, Error>({
    queryKey: ["project-service-overview", projectId],
    queryFn: () => getProjectServiceOverview(projectId),
    enabled: !!projectId,
  });

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [serviceActionType, setServiceActionType] = useState<
    "remove" | "pause" | "cancel" | "activate"
  >("remove");
  const [serviceActionTarget, setServiceActionTarget] = useState<{
    id: string | number;
    name: string;
  } | null>(null);
  const [attachServiceModalOpen, setAttachServiceModalOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: ({
      projectId,
      assignmentId,
    }: {
      projectId: string;
      assignmentId: string;
    }) => deleteProjectServiceAssignment(projectId, assignmentId),
    onSuccess: () => {
      toast.success("Service assignment deleted!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete service assignment");
    },
  });

  // Group assignments by service_name (since service_id does not exist)
  const groupedServices = useMemo(() => {
    const map = new Map<
      string,
      { service: ServiceAssignment; assignments: ServiceAssignment[] }
    >();
    for (const s of overview?.service_assignments || []) {
      const key = s.service_name;
      if (!map.has(key)) {
        map.set(key, { service: s, assignments: [] });
      }
      map.get(key)!.assignments.push(s);
    }
    return Array.from(map.values());
  }, [overview?.service_assignments]);

  // Loading/skeleton state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-2xl">Services</h2>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-lg h-32 animate-pulse"
            />
          ))}
        </div>
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-lg h-40 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-6 text-destructive">
        Error loading services: {error?.message}
      </div>
    );
  }

  // Extract stats and assignments
  const stats = overview.statistics;
  const serviceAssignments = overview.service_assignments;

  // Compute structure counts for cards
  const structureCounts = {
    all: stats.total_structures,
    units: stats.total_units,
    houses: stats.total_houses,
  };
  const totalServices = stats.total_services;
  const meteredServices = stats.metered_services;
  const unmeteredServices = stats.unmetered_services;

  // Stat computations
  const now = new Date();
  const active = serviceAssignments.filter(
    (s: ServiceAssignment) => s.status === "ACTIVE"
  );
  const billingFixed = active.filter(
    (s: ServiceAssignment) => s.service_pricing_type === "FIXED"
  ).length;
  const billingVariable = active.filter(
    (s: ServiceAssignment) => s.service_pricing_type === "VARIABLE"
  ).length;
  const billingPercentage = active.filter(
    (s: ServiceAssignment) => s.service_pricing_type === "PERCENTAGE"
  ).length;
  const expiringSoon = active.filter((s: ServiceAssignment) => {
    if (!s.end_date) return false;
    const days = differenceInDays(parseISO(s.end_date), now);
    return days >= 0 && days <= 30;
  }).length;
  // Top service types (show up to 4)
  const typeCounts: Record<string, number> = {};
  active.forEach((s: ServiceAssignment) => {
    typeCounts[s.service_name] = (typeCounts[s.service_name] || 0) + 1;
  });
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const typeIcons: Record<string, any> = {
    Water: Droplets,
    Electricity: Zap,
    Internet: Globe,
    Security: Shield,
    "Management Fee": Percent,
  };

  const pricingTypeColors: Record<string, string> = {
    FIXED: "bg-blue-100 text-blue-800",
    VARIABLE: "bg-purple-100 text-purple-800",
    PERCENTAGE: "bg-pink-100 text-pink-800",
  };

  // Structure type icon and color mapping
  const structureTypeMap = {
    Project: {
      icon: Building2,
      color: "indigo",
      border: "border-indigo-400",
      iconColor: "text-indigo-600",
    },
    Block: {
      icon: Layers,
      color: "teal",
      border: "border-teal-400",
      iconColor: "text-teal-600",
    },
    Unit: {
      icon: Grid,
      color: "blue",
      border: "border-blue-400",
      iconColor: "text-blue-600",
    },
    House: {
      icon: Home,
      color: "orange",
      border: "border-orange-400",
      iconColor: "text-orange-600",
    },
  } as const;
  type StructureType = keyof typeof structureTypeMap;
  function getStructureTypeMap(type: string) {
    return structureTypeMap[type as StructureType] || structureTypeMap.Project;
  }

  // Helper for card row
  const CardRow = ({
    items,
  }: {
    items: { label: string; value: string | number }[];
  }) => (
    <div className="gap-2 grid grid-cols-3 mt-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <span className="font-medium text-muted-foreground text-xs">
            {item.label}
          </span>
          <span className="font-semibold text-lg">{item.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-2xl">Services</h2>
          <p className="text-muted-foreground">
            Manage and assign services to blocks, apartments, and houses in this
            project.
          </p>
        </div>
        <PermissionGate codename="add_services" showFallback={false}>
          <Button
            variant="default"
            className="flex items-center gap-2"
            aria-label="Assign Service"
            onClick={() => setAttachServiceModalOpen(true)}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Assign Service</span>
          </Button>
        </PermissionGate>
      </div>

      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Structure Overview */}
        <div className="flex flex-col bg-blue-50 shadow-none p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Structure Overview</span>
          </div>
          <CardRow
            items={[
              { label: "Project", value: structureCounts.all },
              { label: "Units", value: structureCounts.units },
              { label: "Houses", value: structureCounts.houses },
            ]}
          />
        </div>
        {/* Card 2: Metering Overview */}
        <div className="flex flex-col bg-green-50 shadow-none p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Metering Overview</span>
          </div>
          <CardRow
            items={[
              { label: "Total", value: totalServices },
              { label: "Metered", value: meteredServices },
              { label: "Unmetered", value: unmeteredServices },
            ]}
          />
        </div>
        {/* Card 3: Service Status */}
        <div className="flex flex-col bg-yellow-50 shadow-none p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Service Status</span>
          </div>
          <CardRow
            items={[
              { label: "Active", value: stats.active_services },
              { label: "Paused", value: stats.paused_services },
              { label: "Cancelled", value: stats.cancelled_services },
            ]}
          />
        </div>
        {/* Card 4: Billing Type */}
        <div className="flex flex-col bg-purple-50 shadow-none p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Billing Type</span>
          </div>
          <CardRow
            items={[
              { label: "Fixed", value: stats.fixed_billing },
              { label: "Variable", value: stats.variable_billing },
              { label: "%", value: stats.percentage_billing },
            ]}
          />
        </div>
      </div>

      {/* Registered Services Section */}
      <div className="mt-12">
        {serviceAssignments.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-16 text-muted-foreground">
            <AlertTriangle className="mb-2 w-10 h-10 text-yellow-500" />
            <div className="font-semibold text-lg">No services assigned</div>
            <div className="mt-1 text-sm">
              Assign a service to this project to get started.
            </div>
          </div>
        ) : (
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {groupedServices.map(({ service, assignments }) => {
              const isMetered = service.is_metered;
              const isActive = service.status === "ACTIVE";
              const isPausedOrCancelled =
                service.status === "PAUSED" || service.status === "CANCELLED";
              return (
                <div
                  key={service.service_name}
                  className="group relative flex flex-col gap-4 bg-white/30 dark:bg-card/30 backdrop-blur-md p-5 border border-border rounded-xl"
                  tabIndex={0}
                  role="region"
                  aria-label={`Service card for ${service.service_name}`}
                >
                  {/* Header: Name + Action Icons (on hover) + Metered Icon (right) */}
                  <div className="flex justify-between items-center px-3 py-0.5 rounded-t-lg font-semibold">
                    <span className="font-bold text-lg">
                      {service.service_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                        {isActive && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    aria-label="Pause"
                                    tabIndex={0}
                                    className="p-0.5 focus:outline-none text-muted-foreground hover:text-yellow-600 cursor-pointer"
                                    onClick={() => {
                                      setServiceActionTarget({
                                        id: service.id,
                                        name: service.service_name,
                                      });
                                      setServiceActionType("pause");
                                      setActionModalOpen(true);
                                    }}
                                  >
                                    <PauseCircle className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Pause Service</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    aria-label="Cancel"
                                    tabIndex={0}
                                    className="p-0.5 focus:outline-none text-muted-foreground hover:text-yellow-600 cursor-pointer"
                                    onClick={() => {
                                      setServiceActionTarget({
                                        id: service.id,
                                        name: service.service_name,
                                      });
                                      setServiceActionType("cancel");
                                      setActionModalOpen(true);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Cancel Service</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <PermissionGate
                              codename="delete_services"
                              showFallback={false}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      aria-label="Remove"
                                      tabIndex={0}
                                      className="p-0.5 focus:outline-none text-muted-foreground hover:text-destructive cursor-pointer"
                                      onClick={() => {
                                        setServiceActionTarget({
                                          id: service.id,
                                          name: service.service_name,
                                        });
                                        setServiceActionType("remove");
                                        setActionModalOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Remove Service
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </PermissionGate>
                          </>
                        )}
                        {isPausedOrCancelled && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  aria-label="Activate"
                                  tabIndex={0}
                                  className="p-0.5 focus:outline-none text-muted-foreground hover:text-green-600 cursor-pointer"
                                  onClick={() => {
                                    setServiceActionTarget({
                                      id: service.id,
                                      name: service.service_name,
                                    });
                                    setServiceActionType("activate");
                                    setActionModalOpen(true);
                                  }}
                                >
                                  <PlayCircle className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Activate Service</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {isMetered ? (
                        <Gauge
                          className="w-5 h-5 text-blue-600"
                          aria-label="Metered"
                        />
                      ) : (
                        <Zap
                          className="w-5 h-5 text-gray-400"
                          aria-label="Unmetered"
                        />
                      )}
                    </div>
                  </div>
                  {/* Description below header */}
                  <div className="px-3 pb-0.5 min-h-[18px] text-muted-foreground text-xs">
                    {service.service_description}
                  </div>
                  {/* Border below header+description */}
                  <div
                    className={`border-b-1 w-full ${
                      getStructureTypeMap(service.structure_type).border
                    }`}
                  ></div>
                  {/* List of assignments for this service as badges */}
                  <div className="mt-2">
                    <div className="mb-1 font-semibold text-muted-foreground text-xs">
                      Assigned to:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center bg-muted px-3 py-1 border border-border rounded-full font-medium text-xs"
                        >
                          {a.structure_type === "Block"
                            ? a.structure_value
                            : `${a.structure_type}: ${a.structure_value}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Row 2: Price, Pricing Type */}
                  <div className="flex justify-between items-center mt-1 px-3">
                    <span className="font-bold text-primary text-base">
                      {service.service_pricing_type === "FIXED" &&
                        service.service_base_price}
                      {service.service_pricing_type === "VARIABLE" &&
                        (service.service_base_price
                          ? `${service.service_base_price} / unit`
                          : "Metered")}
                      {service.service_pricing_type === "PERCENTAGE" &&
                        `${service.service_percentage_rate}%`}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        pricingTypeColors[service.service_pricing_type]
                      }`}
                    >
                      {service.service_pricing_type}
                    </span>
                  </div>
                  {/* Row 3: Frequency and Billed To */}
                  <div className="flex justify-between items-center mt-1 px-3 text-muted-foreground text-xs">
                    <span
                      className="bg-muted px-2 py-1 rounded"
                      aria-label="Frequency"
                    >
                      {service.service_frequency}
                    </span>
                    <span
                      className="bg-muted px-2 py-1 rounded"
                      aria-label="Billed To"
                    >
                      Billed to:{" "}
                      <span className="font-medium text-foreground">
                        {service.service_billed_to}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ServiceActionModal
        open={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        service={serviceActionTarget}
        actionType={serviceActionType}
        onAction={(id, type) => {
          if (type === "remove" && id) {
            deleteMutation.mutate({ projectId, assignmentId: id as string });
          }
          setActionModalOpen(false);
        }}
      />
      <AttachServiceModal
        open={attachServiceModalOpen}
        onClose={() => setAttachServiceModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        projectNodeId={projectNodeId}
      />
    </div>
  );
};
