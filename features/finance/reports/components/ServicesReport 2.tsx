"use client";

import { Building, Calendar, ChevronDown, ChevronRight, Cog } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
// Import the new types from schema
import {
    ServicesReportService, ServicesReportSummary as ServicesReportSummaryType,
} from '@/features/finance/reports/schema';

interface ServicesReportProps {
  services: ServicesReportService[];
  summary?: ServicesReportSummaryType;
  isLoading?: boolean;
  error?: unknown;
}

export function ServicesReport({
  services,
  summary,
  isLoading,
  error,
}: ServicesReportProps) {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  const toggleService = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "FIXED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "VARIABLE":
        return "bg-green-100 text-green-800 border-green-200";
      case "PERCENTAGE":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "MONTHLY":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "WEEKLY":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ONE_TIME":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBilledToColor = (billedTo: string) => {
    switch (billedTo) {
      case "OWNER":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "TENANT":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to get month status
  const getMonthStatus = (month: number): "past" | "current" | "future" => {
    const currentMonth = new Date().getMonth() + 1;
    if (month < currentMonth) return "past";
    if (month === currentMonth) return "current";
    return "future";
  };

  // Use summary if provided, otherwise fallback to calculated values
  const totalServices = summary?.totalServices ?? services.length;
  const totalCost = summary?.totalCost ?? "KES 0";

  if (isLoading) {
    return (
      <Card className="bg-background shadow-none mb-8 border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5 text-primary" />
            Services Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-muted-foreground text-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background shadow-none mb-8 border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5 text-primary" />
            Services Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-red-600 text-center">
            Error loading services report.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background shadow-none mb-8 border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          Services Report
        </CardTitle>

        {/* Summary Stats */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-4 bg-muted mt-4 p-4 border rounded-lg">
          <div className="text-center">
            <p className="font-bold text-primary text-2xl">{totalServices}</p>
            <p className="text-muted-foreground text-sm">Total Services</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600 text-2xl">{totalCost}</p>
            <p className="text-muted-foreground text-sm">Total Cost</p>
          </div>
          {summary?.year && (
            <div className="text-center">
              <p className="font-bold text-green-600 text-2xl">
                {summary.year}
              </p>
              <p className="text-muted-foreground text-sm">Year</p>
            </div>
          )}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-1">
              <div className="bg-primary rounded-full w-2 h-2 animate-pulse"></div>
              <p className="font-bold text-primary text-2xl">
                {new Date().toLocaleString('default', { month: 'long' })}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">Current Month</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {services.map((service) => {
            return (
              <Collapsible
                key={service.id}
                open={expandedServices.has(service.id)}
                onOpenChange={() => toggleService(service.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="justify-between hover:bg-accent p-4 border rounded-lg w-full h-auto"
                  >
                    <div className="flex items-center gap-3">
                      {expandedServices.has(service.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <Cog className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <h4 className="font-semibold">{service.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getServiceTypeColor(
                              service.type
                            )}`}
                          >
                            {service.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getFrequencyColor(
                              service.frequency
                            )}`}
                          >
                            {service.frequency}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getBilledToColor(
                              service.billedTo
                            )}`}
                          >
                            {service.billedTo}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            • {service.attached_projects.length} projects
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">
                          {service.total_cost}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Total Cost
                        </p>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-6 mt-4 pt-4 border-t">
                    {/* Description */}
                    {service.description && (
                      <div className="space-y-1">
                        <h5 className="mb-1 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                          Description
                        </h5>
                        <p className="text-muted-foreground text-sm">
                          {service.description}
                        </p>
                      </div>
                    )}

                    {/* Monthly Breakdown */}
                    <div className="space-y-1">
                      <h5 className="flex items-center gap-1 mb-1 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                        <Calendar className="w-3 h-3" />
                        Monthly Breakdown
                      </h5>
                      <div className="gap-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                        {service.monthly_breakdown.map((month) => {
                          const monthNumber = month.month;
                          const status = getMonthStatus(monthNumber);
                          const value = parseFloat(month.value.replace(/[^\d.-]/g, "")) || 0;

                          return (
                            <div
                              key={`${month.year}-${month.month}`}
                              className={`p-2 border rounded-lg text-center transition-all duration-200 ${
                                status === "current"
                                  ? "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/50 shadow-lg ring-2 ring-primary/20"
                                  : status === "past"
                                  ? "bg-accent border-border"
                                  : "bg-muted/30 border-border/50"
                              }`}
                            >
                              <div className={`text-xs font-medium ${
                                status === "current" 
                                  ? "text-primary font-semibold" 
                                  : "text-muted-foreground"
                              }`}>
                                {month.month_name}
                              </div>
                              <div className={`font-semibold text-sm ${
                                value > 0
                                  ? status === "current"
                                    ? "text-primary"
                                    : "text-foreground"
                                  : status === "future"
                                  ? "text-muted-foreground/30"
                                  : "text-muted-foreground"
                              }`}>
                                {month.value}
                              </div>
                              {status === "current" && (
                                <div className="flex justify-center items-center gap-1 mt-1">
                                  <div className="bg-primary rounded-full w-1.5 h-1.5 animate-pulse"></div>
                                  <span className="font-medium text-primary text-xs">CURRENT</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Attached Projects */}
                    <div className="space-y-1">
                      <h5 className="flex items-center gap-1 mb-1 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                        <Building className="w-3 h-3" />
                        Attached Projects
                      </h5>
                      <div className="gap-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {service.attached_projects.length > 0 ? (
                          service.attached_projects.map((project, index) => (
                            <div
                              key={index}
                              className="bg-muted p-3 border rounded-lg"
                            >
                              <span className="font-medium text-sm">
                                {project}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-4 text-muted-foreground text-center">
                            No projects attached
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {services.length === 0 && (
            <div className="py-8 text-muted-foreground text-center">
              <Cog className="opacity-50 mx-auto mb-4 w-12 h-12" />
              <p>No services found for the selected period.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
