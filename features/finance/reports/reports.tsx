"use client";

import React, { useState } from "react";

import { fetchEnhancedSummary, fetchPerUnitSummary } from "@/actions/reports";
import { DateRangePicker } from "@/components/date-range-picker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

import { EnhancedSummaryCards } from "./components/EnhancedSummaryCards";
import { PerUnitSummaryReport } from "./components/PerUnitSummaryReport";
import { ServiceSummaryReport } from "./components/ServiceSummaryReport";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date("2024-01-01"),
    to: new Date("2024-12-31"),
  });

  // Enhanced summary query - disabled for now as endpoint doesn't exist
  const {
    data: enhancedSummary,
    isLoading: isLoadingEnhancedSummary,
    error: enhancedSummaryError,
  } = useQuery({
    queryKey: ["enhanced-summary"],
    queryFn: () => fetchEnhancedSummary(),
    enabled: false, // Disabled until endpoint is available
  });

  // Per unit summary query - disabled for now as endpoint might not exist
  const {
    data: perUnitSummary,
    isLoading: isLoadingPerUnitSummary,
    error: perUnitSummaryError,
  } = useQuery({
    queryKey: ["per-unit-summary"],
    queryFn: () => fetchPerUnitSummary(),
    enabled: false, // Disabled until endpoint is available
  });

  // Debug logging
  console.log("Per unit summary query state:", {
    data: perUnitSummary,
    isLoading: isLoadingPerUnitSummary,
    error: perUnitSummaryError,
    dateRange,
    enabled: !!dateRange.from,
  });
  console.log(
    "Units with OCCUPIED status:",
    perUnitSummary?.units?.filter((u) => u.occupancyStatus === "OCCUPIED")
  );

  return (
    <div className="p-8 mx-auto max-w-full">
      {/* Header with Date Filter and Actions */}
      <div className="flex gap-4 justify-between items-end mb-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Financial Reports
          </h1>
          <p className="text-gray-600">
            Comprehensive property management financial overview
          </p>
        </div>
      </div>

      {/* Service Summary Report */}
      <ServiceSummaryReport />

      {/* Per Unit Summary Report - hidden for now */}
      {/* <PerUnitSummaryReport
        units={perUnitSummary?.units || []}
        projects={perUnitSummary?.projects || []}
      />

      {perUnitSummaryError && (
        <div className="p-4 mb-8 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">
            ⚠️ {perUnitSummaryError.message}
          </p>
        </div>
      )} */}

      {/* Footer */}
      <div className="pt-8 mt-12 text-sm text-center border-t text-muted-foreground">
        <p>
          Report generated on {new Date().toLocaleDateString()} • Trait Property
          Management Ltd
        </p>
      </div>
    </div>
  );
}
