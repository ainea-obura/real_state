"use client";

import { Download, Filter, TrendingUp } from "lucide-react";
import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { downloadServiceSummaryExcel } from "@/actions/reports";
import { useServiceSummaryReport } from "../hooks/useServiceSummaryReport";

interface ServiceSummaryReportProps {
  initialProject?: string;
  initialMonth?: string;
  initialYear?: number;
}

const getCurrentMonth = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // 1-12
    monthName: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][now.getMonth()],
    year: now.getFullYear(),
  };
};

const getAvailableMonths = () => {
  const current = getCurrentMonth();
  const allMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return allMonths.slice(0, current.month);
};

export function ServiceSummaryReport({
  initialProject = "all",
  initialMonth = "all",
  initialYear = new Date().getFullYear(),
}: ServiceSummaryReportProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedProject, setSelectedProject] =
    useState<string>(initialProject);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  // Fetch data using the hook
  const { data, isLoading, error, refetch } = useServiceSummaryReport({
    project: selectedProject === "all" ? undefined : selectedProject,
    month: selectedMonth === "all" ? undefined : selectedMonth,
    year: selectedYear,
  });

  // Parse summary totals from API data
  const summaryTotals = useMemo(() => {
    if (!data?.summary)
      return {
        totalCollected: 0,
        totalExpense: 0,
        totalManagementFee: 0,
        balance: 0,
      };

    const parseCurrency = (value: string) => {
      // Handle negative values properly
      const match = value.match(/KES\s*([-]?[\d,.]+)/);
      if (match) {
        const numericValue = match[1].replace(/,/g, "");
        return parseFloat(numericValue);
      }
      return 0;
    };

    const totals = {
      totalCollected: parseCurrency(data.summary.totalCollected),
      totalExpense: parseCurrency(data.summary.totalExpense),
      totalManagementFee: parseCurrency(data.summary.totalManagementFee),
      balance: parseCurrency(data.summary.balance),
    };

    return totals;
  }, [data]);

  // Get columns to display based on selected month
  const columnsToDisplay = useMemo(() => {
    if (selectedMonth === "all") {
      return getAvailableMonths(); // Only show current and past months
    }
    // Convert month number to month name
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIndex = parseInt(selectedMonth) - 1;
    return [monthNames[monthIndex]];
  }, [selectedMonth]);

  // Get unique projects from services data with both ID and name
  const availableProjects = useMemo(() => {
    if (!data?.services) return [{ id: "all", name: "All Projects" }];
    const projects = new Map<string, string>(); // id -> name
    data.services.forEach((service) => {
      service.attached_projects?.forEach((project) => {
        projects.set(project.id, project.name);
      });
    });
    return [
      { id: "all", name: "All Projects" },
      ...Array.from(projects.entries()).map(([id, name]) => ({ id, name })),
    ];
  }, [data]);

  // Filter services based on selected project
  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    if (selectedProject === "all") return data.services;

    return data.services.filter((service) =>
      service.attached_projects?.some(
        (project) => project.id === selectedProject
      )
    );
  }, [data, selectedProject]);

  // Calculate totals for each column from API data
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    if (!filteredServices.length) return totals;

    columnsToDisplay.forEach((month) => {
      const monthIndex =
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ].indexOf(month) + 1;

      totals[month] = filteredServices.reduce((sum, service) => {
        const monthData = service.monthly_breakdown?.find(
          (item) => item.month === monthIndex
        );
        if (monthData) {
          const amount =
            parseFloat(monthData.value.replace(/[^\d.-]/g, "")) || 0;
          return sum + amount;
        }
        return sum;
      }, 0);
    });

    return totals;
  }, [filteredServices, columnsToDisplay]);

  // Calculate grand total from API data
  const grandTotal = useMemo(() => {
    if (!filteredServices.length) return 0;
    return filteredServices.reduce((sum, service) => sum + service.total, 0);
  }, [filteredServices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currentMonth = getCurrentMonth();
  const availableMonths = getAvailableMonths();

  // Download Excel function
  const handleDownloadExcel = async () => {
    try {
      const result = await downloadServiceSummaryExcel({
        project: selectedProject === "all" ? undefined : selectedProject,
        month: selectedMonth === "all" ? undefined : selectedMonth,
        year: selectedYear,
      });

      if (result.success && result.data) {
        // Import and use the Excel export function on the client side
        const { exportServiceSummaryToExcel } = await import('@/lib/excel-export');
        
        try {
          const filename = exportServiceSummaryToExcel(result.data);
          toast.success("Excel file downloaded successfully!");
        } catch (exportError) {
          console.error("Error exporting Excel:", exportError);
          toast.error("Failed to generate Excel file");
        }
      } else {
        toast.error(result.message || "Failed to download Excel file");
      }
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast.error("Failed to download Excel file");
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-background shadow-none mb-8 border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Service Summary Report
            </CardTitle>
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            Loading service summary report...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background shadow-none mb-8 border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Service Summary Report
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mb-4 text-red-600">
              Error loading service summary report
            </div>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background shadow-none mb-8 border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Service Summary Report
          </CardTitle>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {selectedProject === "all"
                      ? "All Projects"
                      : availableProjects.find((p) => p.id === selectedProject)
                          ?.name || selectedProject}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {selectedMonth === "all"
                      ? "All Months (Current & Past)"
                      : availableMonths[parseInt(selectedMonth) - 1] ||
                        selectedMonth}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Months (Current & Past)
                  </SelectItem>
                  {availableMonths.map((month, index) => (
                    <SelectItem
                      key={month}
                      value={(index + 1).toString()}
                      disabled={index + 1 > currentMonth.month}
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>{selectedYear}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleDownloadExcel}
              disabled={isLoading || !data}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-primary/5 p-4 rounded-lg">
            <div className="font-medium text-muted-foreground text-sm">
              Total Collected
            </div>
            <div className="font-bold text-primary text-2xl">
              {formatCurrency(summaryTotals.totalCollected)}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="font-medium text-muted-foreground text-sm">
              Total Expenses
            </div>
            <div className="font-bold text-red-600 text-2xl">
              {formatCurrency(summaryTotals.totalExpense)}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="font-medium text-muted-foreground text-sm">
              Management Fee
            </div>
            <div className="font-bold text-orange-600 text-2xl">
              {formatCurrency(summaryTotals.totalManagementFee)}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2">
                  <TrendingUp className="mr-1 w-4 h-4" />
                  View Breakdown
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg">
                      Management Fee Breakdown
                    </h4>
                    <div className="text-muted-foreground text-sm">
                      Per Project
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data?.projectBreakdowns?.managementFees?.map((project) => (
                      <div
                        key={project.project_id}
                        className="flex justify-between items-center bg-muted/50 p-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="bg-orange-500 rounded-full w-2 h-2"></div>
                          <span className="font-medium">{project.project}</span>
                        </div>
                        <span className="font-semibold text-orange-600">
                          {project.amount}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-orange-500/20 border-t-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total:</span>
                        <span className="font-bold text-orange-600 text-lg">
                          {formatCurrency(summaryTotals.totalManagementFee)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div
            className={`p-4 rounded-lg ${
              summaryTotals.balance >= 0 ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <div className="font-medium text-muted-foreground text-sm">
              Balance
            </div>
            <div
              className={`font-bold text-2xl ${
                summaryTotals.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summaryTotals.balance)}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2">
                  <TrendingUp className="mr-1 w-4 h-4" />
                  View Breakdown
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-lg">Balance Breakdown</h4>
                    <div className="text-muted-foreground text-sm">
                      {data?.appliedFilters?.month !== "all"
                        ? `Month: ${data?.appliedFilters?.month}`
                        : "All Months"}
                    </div>
                  </div>

                  {/* Overall Calculation */}
                  <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium text-muted-foreground text-sm">
                      Overall Calculation
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Collected:</span>
                        <span className="font-medium text-primary">
                          {formatCurrency(summaryTotals.totalCollected)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Expenses:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(summaryTotals.totalExpense)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Management Fee:</span>
                        <span className="font-medium text-orange-600">
                          -{formatCurrency(summaryTotals.totalManagementFee)}
                        </span>
                      </div>
                      <div className="pt-2 border-primary/20 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Balance:</span>
                          <span
                            className={`font-bold text-lg ${
                              summaryTotals.balance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(summaryTotals.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Breakdown */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-muted-foreground text-sm">
                      By Project
                    </h5>
                    {data?.projectBreakdowns?.balance?.map((project) => (
                      <div
                        key={project.project_id}
                        className="flex justify-between items-center bg-muted/50 p-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="bg-blue-500 rounded-full w-2 h-2"></div>
                          <span className="font-medium">{project.project}</span>
                        </div>
                        <span className="font-semibold">{project.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/5 font-semibold text-primary text-left">
                <th className="px-6 py-3 text-left">Service Name</th>
                {columnsToDisplay.map((month) => (
                  <th key={month} className="px-6 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>{month}</span>
                      {month === currentMonth.monthName && (
                        <div className="flex items-center gap-1">
                          <div className="bg-primary rounded-full w-2 h-2 animate-pulse"></div>
                          <span className="font-medium text-primary text-xs">
                            Current
                          </span>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="bg-primary/10 px-6 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service, index) => (
                <tr
                  key={service.id}
                  className={
                    index % 2 === 0
                      ? "bg-white border-b last:border-0"
                      : "bg-muted/50 border-b last:border-0"
                  }
                >
                  <td className="px-6 py-3 font-medium text-gray-900">
                    <div className="font-semibold">{service.name}</div>
                  </td>
                  {columnsToDisplay.map((month) => {
                    const monthIndex =
                      [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                      ].indexOf(month) + 1;

                    const monthData = service.monthly_breakdown?.find(
                      (item) => item.month === monthIndex
                    );
                    const amount = monthData
                      ? parseFloat(monthData.value.replace(/[^\d.-]/g, "")) || 0
                      : 0;

                    return (
                      <td
                        key={month}
                        className="px-6 py-3 font-semibold text-green-700 text-center"
                      >
                        {formatCurrency(amount)}
                      </td>
                    );
                  })}
                  <td className="bg-primary/5 px-6 py-3 font-bold text-primary text-center">
                    {formatCurrency(service.total)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-primary/10 border-primary/20 border-t-2">
                <td className="px-6 py-3 font-bold text-primary">Total</td>
                {columnsToDisplay.map((month) => (
                  <td
                    key={month}
                    className="px-6 py-3 font-bold text-primary text-center"
                  >
                    {formatCurrency(columnTotals[month] || 0)}
                  </td>
                ))}
                <td className="bg-primary/20 px-6 py-3 font-bold text-primary text-center">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
