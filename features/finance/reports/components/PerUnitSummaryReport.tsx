"use client";

import {
  Building,
  ChevronDown,
  ChevronRight,
  Filter,
  Home,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Unit {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  rentFee: string;
  serviceCharge: string;
  serviceFee: string;
  totalIncome: string;
  totalExpenses: string;
  netIncome: string;
  occupancyStatus: "OCCUPIED" | "VACANT" | "MAINTENANCE";
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  nodeType?: "UNIT" | "HOUSE";
  attachedServices: Array<{
    id: string;
    name: string;
    cost: string;
    description?: string;
  }>;
}

interface PerUnitSummaryReportProps {
  units: Unit[];
  projects: Array<{
    id: string;
    name: string;
    summary?: {
      collectedRent: string;
      serviceCharge: string;
      servicesFee: string;
      net: string;
      unitsCount: number;
    };
  }>;
}

export function PerUnitSummaryReport({
  units,
  projects,
}: PerUnitSummaryReportProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Debug logging
  console.log("PerUnitSummaryReport received units:", units);
  console.log(
    "Units with OCCUPIED status:",
    units.filter((u) => u.occupancyStatus === "OCCUPIED")
  );

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  const filteredUnits =
    selectedProject === "all"
      ? units
      : units.filter((unit) => unit.projectId === selectedProject);

  const getOccupancyColor = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "bg-green-100 text-green-800 border border-green-200";
      case "VACANT":
        return "bg-red-100 text-red-800 border border-red-200";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default:
        return "bg-muted text-muted-foreground border";
    }
  };

  const getOccupancyIcon = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return "🏠";
      case "VACANT":
        return "🏚️";
      case "MAINTENANCE":
        return "🔧";
      default:
        return "❓";
    }
  };

  // Group units by project for better organization
  const groupedUnits = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.projectName]) {
      acc[unit.projectName] = [];
    }
    acc[unit.projectName].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  return (
    <Card className="bg-background shadow-none mb-8 border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Per Unit Summary Report
          </CardTitle>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedUnits).map(([projectName, projectUnits]) => (
            <div key={projectName} className="space-y-2">
              <h3 className="flex items-center gap-2 pb-2 border-b font-semibold text-primary text-lg">
                <Building className="w-5 h-5" />
                {projectName} ({projectUnits.length} properties)
              </h3>

              {/* Project Summary */}
              <div className="bg-muted mb-6 p-6 border rounded-lg">
                <h4 className="mb-4 font-semibold text-muted-foreground text-sm">
                  Project Summary
                </h4>
                <div className="gap-8 grid grid-cols-4">
                  <div className="text-center">
                    <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Collected Rent
                    </div>
                    <div className="font-semibold text-foreground text-base">
                      {(() => {
                        const total = projectUnits.reduce((sum, unit) => {
                          const numericValue = parseFloat(
                            unit.rentFee.replace(/[^\d.-]/g, "") || "0"
                          );
                          return sum + numericValue;
                        }, 0);
                        return `KES ${total.toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Service Charge
                    </div>
                    <div className="font-semibold text-foreground text-base">
                      {(() => {
                        const total = projectUnits.reduce((sum, unit) => {
                          const numericValue = parseFloat(
                            unit.serviceCharge.replace(/[^\d.-]/g, "") || "0"
                          );
                          return sum + numericValue;
                        }, 0);
                        return `KES ${total.toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Services Fee
                    </div>
                    <div className="font-semibold text-foreground text-base">
                      {(() => {
                        const total = projectUnits.reduce((sum, unit) => {
                          const numericValue = parseFloat(
                            unit.serviceFee.replace(/[^\d.-]/g, "") || "0"
                          );
                          return sum + numericValue;
                        }, 0);
                        return `KES ${total.toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Net
                    </div>
                    <div className="font-semibold text-primary text-base">
                      {(() => {
                        const totalRent = projectUnits.reduce((sum, unit) => {
                          const numericValue = parseFloat(
                            unit.rentFee.replace(/[^\d.-]/g, "") || "0"
                          );
                          return sum + numericValue;
                        }, 0);
                        const totalServiceCharge = projectUnits.reduce(
                          (sum, unit) => {
                            const numericValue = parseFloat(
                              unit.serviceCharge.replace(/[^\d.-]/g, "") || "0"
                            );
                            return sum + numericValue;
                          },
                          0
                        );
                        const totalServices = projectUnits.reduce(
                          (sum, unit) => {
                            const numericValue = parseFloat(
                              unit.serviceFee.replace(/[^\d.-]/g, "") || "0"
                            );
                            return sum + numericValue;
                          },
                          0
                        );
                        const net =
                          totalRent + totalServiceCharge + totalServices;
                        return `KES ${net.toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {projectUnits.map((unit) => (
                  <Collapsible
                    key={unit.id}
                    open={expandedUnits.has(unit.id)}
                    onOpenChange={() => toggleUnit(unit.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="justify-between hover:bg-accent p-4 border rounded-lg w-full h-auto"
                      >
                        <div className="flex items-center gap-3">
                          {expandedUnits.has(unit.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-lg">
                            {getOccupancyIcon(unit.occupancyStatus)}
                          </span>
                          <div className="text-left">
                            <h4 className="font-semibold">{unit.name}</h4>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getOccupancyColor(
                                  unit.occupancyStatus
                                )}`}
                              >
                                {unit.occupancyStatus}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                • {unit.nodeType || "UNIT"}
                              </span>
                              {unit.tenantName && (
                                <span className="text-muted-foreground text-sm">
                                  • {unit.tenantName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-8 text-sm">
                          <div className="min-w-[120px] text-left">
                            <p className="font-mono font-semibold text-green-600 text-sm">
                              {unit.rentFee}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              Rent
                            </p>
                          </div>
                          <div className="min-w-[120px] text-left">
                            <p className="font-mono font-semibold text-blue-600 text-sm">
                              {unit.serviceCharge}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              Service Charge
                            </p>
                          </div>
                          <div className="min-w-[120px] text-left">
                            <p className="font-mono font-semibold text-purple-600 text-sm">
                              {unit.serviceFee}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              Services
                            </p>
                          </div>
                          <div className="min-w-[120px] text-left">
                            <p className="font-mono font-semibold text-primary text-sm">
                              {(() => {
                                const rentValue = parseFloat(
                                  unit.rentFee.replace(/[^\d.-]/g, "") || "0"
                                );
                                const serviceChargeValue = parseFloat(
                                  unit.serviceCharge.replace(/[^\d.-]/g, "") ||
                                    "0"
                                );
                                const serviceValue = parseFloat(
                                  unit.serviceFee.replace(/[^\d.-]/g, "") || "0"
                                );
                                const net =
                                  rentValue + serviceChargeValue + serviceValue;
                                return `KES ${net.toLocaleString()}`;
                              })()}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              Net
                            </p>
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="px-4 pb-4">
                      <div className="mt-4 pt-4 border-t">
                        {/* Tenant/Owner Information */}
                        <div className="space-y-3 mb-4">
                          <h5 className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                            Current Assignment
                          </h5>
                          <div className="gap-6 grid grid-cols-2">
                            {/* Tenant Column */}
                            <div>
                              <div className="mb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Tenant
                              </div>
                              <div className="gap-4 grid grid-cols-2">
                                <div>
                                  <div className="mb-1 font-medium text-gray-900 text-sm">
                                    {unit.tenantName || "Not Assigned"}
                                  </div>
                                  {unit.tenantEmail && (
                                    <div className="text-muted-foreground text-xs">
                                      {unit.tenantEmail}
                                    </div>
                                  )}
                                  {unit.tenantPhone && (
                                    <div className="text-muted-foreground text-xs">
                                      {unit.tenantPhone}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="mb-1 font-medium text-gray-500 text-xs uppercase tracking-wide">
                                    Lease Period
                                  </div>
                                  <div className="text-gray-900 text-sm">
                                    {unit.leaseStartDate &&
                                    unit.leaseEndDate ? (
                                      <span>
                                        {unit.leaseStartDate} -{" "}
                                        {unit.leaseEndDate}
                                      </span>
                                    ) : (
                                      "Not specified"
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Owner Column */}
                            <div>
                              <div className="mb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Owner
                              </div>
                              <div className="gap-4 grid grid-cols-2">
                                <div>
                                  <div className="mb-1 font-medium text-gray-900 text-sm">
                                    {unit.ownerName || "Not Assigned"}
                                  </div>
                                  {unit.ownerPhone && (
                                    <div className="text-muted-foreground text-xs">
                                      {unit.ownerPhone}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Attached Services */}
                        {unit.attachedServices &&
                          unit.attachedServices.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                                Attached Services (
                                {unit.attachedServices.length})
                              </h5>
                              <div className="gap-4 grid grid-cols-3">
                                {unit.attachedServices.map((service, index) => (
                                  <div
                                    key={service.id}
                                    className="p-3 border rounded-lg text-center"
                                  >
                                    <div className="flex justify-center items-center bg-primary mx-auto mb-2 rounded-full w-6 h-6 font-semibold text-white text-xs">
                                      {index + 1}
                                    </div>
                                    <div className="mb-1 font-medium text-gray-900 text-sm">
                                      {service.name}
                                    </div>
                                    <div className="font-semibold text-primary text-sm">
                                      {service.cost}
                                    </div>
                                    {service.description && (
                                      <div className="mt-1 text-muted-foreground text-xs">
                                        {service.description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          ))}

          {filteredUnits.length === 0 && (
            <div className="py-8 text-muted-foreground text-center">
              <Home className="opacity-50 mx-auto mb-4 w-12 h-12" />
              <p>No properties found for the selected project.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
