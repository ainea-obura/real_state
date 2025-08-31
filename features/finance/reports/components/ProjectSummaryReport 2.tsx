"use client";

import {
    BarChart3, Building2, Calendar, ChevronDown, ChevronRight, DollarSign, PiggyBank, Receipt,
    TrendingUp, Wallet,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MonthlyBreakdown {
  month: number;
  month_name: string;
  year: number;
  value: string;
}

interface ProjectOwner {
  name: string;
  email: string;
  phone: string;
  type: "user" | "company";
}

interface FinancialSummary {
  totalCollections: string;
  totalExpenditures: string;
  balance: string;
  expendituresByService: Record<string, string>;
}

interface Service {
  id: string;
  name: string;
  type: "FIXED" | "VARIABLE" | "PERCENTAGE";
  total_cost: string;
  frequency: "MONTHLY" | "WEEKLY" | "ONE_TIME";
  description?: string;
  monthly_breakdown: MonthlyBreakdown[];
}

interface Project {
  id: string;
  name: string;
  unitsCount: number;
  services: Service[];
  owners: ProjectOwner[];
  financial_summary: FinancialSummary;
}

interface ProjectSummaryReportProps {
  projects: Project[];
}

// Helper function to extract numeric value from formatted currency string
const extractNumericValue = (formattedValue: string): number => {
  const numericString = formattedValue.replace(/[^\d.-]/g, "");
  return parseFloat(numericString) || 0;
};

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return `KES ${value.toLocaleString()}`;
};

// Helper function to get month status
const getMonthStatus = (month: number): "past" | "current" | "future" => {
  const currentMonth = new Date().getMonth() + 1;
  if (month < currentMonth) return "past";
  if (month === currentMonth) return "current";
  return "future";
};

const ServiceTable: React.FC<{ services: Service[] }> = ({ services }) => {
  if (services.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto mb-4 w-10 h-10 text-muted-foreground/50" />
        <h4 className="mb-1 font-medium text-foreground">No Services</h4>
        <p className="text-muted-foreground text-sm">
          No services assigned to this project
        </p>
      </div>
    );
  }

  const monthHeaders =
    services[0]?.monthly_breakdown.map((breakdown) => breakdown.month_name) ||
    [];
  const columnTotals = monthHeaders.map((_, monthIndex) => {
    return services.reduce((total, service) => {
      const monthValue = extractNumericValue(
        service.monthly_breakdown[monthIndex]?.value || "0"
      );
      return total + monthValue;
    }, 0);
  });
  const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-10">
            <h4 className="font-semibold text-foreground text-sm">
              Service Breakdown
            </h4>
            <p className="text-muted-foreground text-xs">
              {services.length} {services.length === 1 ? "service" : "services"}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="bg-card border border-border rounded-xl overflow-scroll">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border">
                <th className="px-6 py-4 w-16 min-w-[64px] font-semibold text-foreground text-sm text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">#</span>
                  </div>
                </th>
                <th className="px-6 py-4 w-64 min-w-[256px] font-semibold text-foreground text-sm text-left">
                  <div className="flex items-center gap-2">
                    <span>Service Name</span>
                  </div>
                </th>
                {monthHeaders.map((month, index) => {
                  const monthNumber = index + 1;
                  const status = getMonthStatus(monthNumber);
                  return (
                    <th
                      key={index}
                      className={`px-4 py-4 text-center font-semibold text-sm w-32 min-w-[128px] ${
                        status === "current"
                          ? "bg-primary/10 text-primary"
                          : status === "past"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-xs">{month}</span>
                        {status === "current" && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span className="font-medium text-primary text-xs">
                              Current
                            </span>
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="bg-primary/5 px-6 py-4 w-40 min-w-[160px] font-semibold text-foreground text-sm text-center">
                  <div className="flex justify-center items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {services.map((service, serviceIndex) => {
                const rowTotal = extractNumericValue(service.total_cost);

                return (
                  <tr
                    key={service.id}
                    className={`transition-colors duration-150 ${
                      serviceIndex % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                  >
                    <td className="px-6 py-5 w-16 min-w-[64px] font-medium text-muted-foreground text-sm">
                      {serviceIndex + 1}
                    </td>
                    <td className="px-6 py-5 w-64 min-w-[256px]">
                      <div className="space-y-2">
                        <h5 className="font-semibold text-foreground text-sm">
                          {service.name}
                        </h5>
                        {service.description && (
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </td>
                    {service.monthly_breakdown.map((breakdown, monthIndex) => {
                      const value = extractNumericValue(breakdown.value);
                      const monthNumber = monthIndex + 1;
                      const status = getMonthStatus(monthNumber);

                      return (
                        <td
                          key={monthIndex}
                          className={`px-4 py-5 text-center text-sm w-32 min-w-[128px] ${
                            status === "current" ? "bg-primary/5" : ""
                          }`}
                        >
                          <span
                            className={`font-medium ${
                              value > 0
                                ? "text-foreground"
                                : status === "future"
                                ? "text-muted-foreground/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(value)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="bg-primary/5 px-6 py-5 w-40 min-w-[160px] font-semibold text-foreground text-sm text-center">
                      {formatCurrency(rowTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Totals Row */}
              <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-primary/20 border-t-2">
                <td className="px-6 py-4 w-16 min-w-[64px]"></td>
                <td className="px-6 py-4 w-64 min-w-[256px]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">
                      Monthly Totals
                    </span>
                  </div>
                </td>
                {columnTotals.map((total, index) => {
                  const monthNumber = index + 1;
                  const status = getMonthStatus(monthNumber);

                  return (
                    <td
                      key={index}
                      className={`px-4 py-4 text-center font-semibold text-foreground text-sm w-32 min-w-[128px] ${
                        status === "current" ? "bg-primary/10" : "bg-muted/30"
                      }`}
                    >
                      {formatCurrency(total)}
                    </td>
                  );
                })}
                <td className="bg-primary/10 px-6 py-4 w-40 min-w-[160px] font-bold text-foreground text-sm text-center">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ProjectSummaryReport: React.FC<ProjectSummaryReportProps> = ({
  projects,
}) => {
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projects.length > 0 && openProjects.size === 0) {
      setOpenProjects(new Set([projects[0].id]));
    }
  }, [projects]);

  const toggleProject = (projectId: string) => {
    const newOpenProjects = new Set(openProjects);
    if (newOpenProjects.has(projectId)) {
      newOpenProjects.delete(projectId);
    } else {
      newOpenProjects.add(projectId);
    }
    setOpenProjects(newOpenProjects);
  };

  // Calculate overall financial summary
  const overallFinancialSummary = projects.reduce(
    (summary, project) => {
      const collections = extractNumericValue(
        project.financial_summary.totalCollections
      );
      const expenditures = extractNumericValue(
        project.financial_summary.totalExpenditures
      );
      const balance = extractNumericValue(project.financial_summary.balance);

      return {
        totalCollections: summary.totalCollections + collections,
        totalExpenditures: summary.totalExpenditures + expenditures,
        balance: summary.balance + balance,
      };
    },
    { totalCollections: 0, totalExpenditures: 0, balance: 0 }
  );

  return (
    <Card className="bg-card shadow-none border border-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="mb-1 font-bold text-foreground text-2xl">
                Project Summary Report
              </h1>
              <div className="flex items-center gap-6 text-muted-foreground text-sm">
                <span>
                  {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </span>
                <span>•</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-600">
                      Collections:{" "}
                      {formatCurrency(overallFinancialSummary.totalCollections)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-600">
                      Expenditures:{" "}
                      {formatCurrency(
                        overallFinancialSummary.totalExpenditures
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span
                      className={`font-semibold ${
                        overallFinancialSummary.balance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Balance: {formatCurrency(overallFinancialSummary.balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => {
            const isOpen = openProjects.has(project.id);
            const projectTotal = project.services.reduce((sum, service) => {
              return sum + extractNumericValue(service.total_cost);
            }, 0);

            return (
              <Card
                key={project.id}
                className={`transition-all duration-300 shadow-none ${
                  isOpen
                    ? "bg-gradient-to-br from-card to-muted/20 border-primary/20"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleProject(project.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="hover:bg-muted/30 rounded-t-lg transition-colors duration-200 cursor-pointer">
                      <CardTitle className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg transition-colors duration-200 ${
                                isOpen ? "bg-primary/20" : "bg-muted"
                              }`}
                            >
                              {isOpen ? (
                                <ChevronDown className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                          <div>
                            <h3 className="mb-1 font-semibold text-foreground text-lg">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-4 text-muted-foreground text-sm">
                              <span>
                                {project.unitsCount}{" "}
                                {project.unitsCount === 1 ? "unit" : "units"}
                              </span>
                              <span>•</span>
                              <span>
                                {project.services.length}{" "}
                                {project.services.length === 1
                                  ? "service"
                                  : "services"}
                              </span>
                              <span>•</span>
                              <span>
                                {project.owners.length}{" "}
                                {project.owners.length === 1
                                  ? "owner"
                                  : "owners"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="mb-1 font-bold text-primary text-xl">
                            {formatCurrency(projectTotal)}
                          </div>
                          <div className="font-medium text-muted-foreground text-xs">
                            Project Total
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <div className="space-y-8">
                        <ServiceTable services={project.services} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {projects.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-block bg-muted/50 mb-4 p-4 rounded-2xl">
                <Building2 className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground text-lg">
                No Projects Found
              </h3>
              <p className="mx-auto max-w-md text-muted-foreground">
                No projects match the current filters. Try adjusting your search
                criteria.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSummaryReport;
