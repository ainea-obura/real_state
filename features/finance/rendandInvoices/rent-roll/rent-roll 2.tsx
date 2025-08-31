"use client";

import { useAtom } from 'jotai';
import { Building2, Coins, Download, HandCoins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { fetchRentRollList, fetchRentRollSummary } from '@/actions/finance/rent-roll';
import { DataTable } from '@/components/datatable/data-table';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/features/projects/profile/tabs/Components/structure/header';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { pageIndexAtom, pageSizeAtom } from '@/store';
import { useQuery } from '@tanstack/react-query';

import { columns } from './columns';
import AddPenaltyModal from './components/AddPenaltyModal';
import AdjustRentModal from './components/AdjustRentModal';
import MarkAsPaidModal from './components/MarkAsPaidModal';
import SendReminderModal from './components/SendReminderModal';
import ViewLeaseModal from './components/ViewLeaseModal';
import ViewLedgerModal from './components/ViewLedgerModal';
import { exportRentRoll } from './utils/export';

import type { RentRollProperty } from "@/features/finance/rendandInvoices/rent-roll/schema";

// Types
interface DateRange {
  from?: Date;
  to?: Date;
}

interface RentRollProps {
  statusOptions?: { label: string; value: string }[];
}

const defaultStatusOptions = [
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
  { label: "Late", value: "late" },
  { label: "Vacant", value: "vacant" },
];

const RentRoll = ({ statusOptions = defaultStatusOptions }: RentRollProps) => {
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderUnit, setReminderUnit] = useState<RentRollProperty | null>(
    null
  );
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [markPaidUnit, setMarkPaidUnit] = useState<RentRollProperty | null>(
    null
  );
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerUnit, setLedgerUnit] = useState<RentRollProperty | null>(null);
  const [leaseModalOpen, setLeaseModalOpen] = useState(false);
  const [leaseUnit, setLeaseUnit] = useState<RentRollProperty | null>(null);
  const [adjustRentModalOpen, setAdjustRentModalOpen] = useState(false);
  const [adjustRentUnit, setAdjustRentUnit] = useState<RentRollProperty | null>(
    null
  );
  const [addPenaltyModalOpen, setAddPenaltyModalOpen] = useState(false);
  const [addPenaltyUnit, setAddPenaltyUnit] = useState<RentRollProperty | null>(
    null
  );

  // Pagination state from store
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize] = useAtom(pageSizeAtom);

  // Build query parameters
  const queryParams = {
    date_from: dateRange.from ? formatDateForAPI(dateRange.from) : undefined,
    date_to: dateRange.to ? formatDateForAPI(dateRange.to) : undefined,
    page: pageIndex + 1, // API expects 1-based pagination
    page_size: pageSize,
    search: searchTerm || undefined, // Only include if search term exists
  };

  // Helper function to format date for API (YYYY-MM-DD)
  function formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Fetch rent roll list data
  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
  } = useQuery({
    queryKey: ["rent-roll-list", queryParams],
    queryFn: () => fetchRentRollList(queryParams),
    enabled: true,
  });

  // Fetch rent roll summary data
  const { data: summaryData } = useQuery({
    queryKey: [
      "rent-roll-summary",
      { date_from: queryParams.date_from, date_to: queryParams.date_to },
    ],
    queryFn: () =>
      fetchRentRollSummary({
        date_from: queryParams.date_from,
        date_to: queryParams.date_to,
      }),
    enabled: true,
  });

  // Reset pagination and search when date range changes
  useEffect(() => {
    setPageIndex(0);
    setSearchTerm("");
  }, [dateRange, setPageIndex]);

  // Reset search when page changes to avoid stale results
  useEffect(() => {
    setSearchTerm("");
  }, [pageIndex]);

  // Adapter function to convert RentRollProperty to modal-compatible format
  const adaptForModals = (property: RentRollProperty) => ({
    ...property,
    unit: property.property, // Map property to unit for backward compatibility
    rent: parseCurrencyString(property.monthlyRent), // Convert string to number for modals
    balance: parseCurrencyString(property.balance), // Convert string to number for modals
    monthlyRent: parseCurrencyString(property.monthlyRent), // Convert string to number for modals
  });

  // Helper function to parse currency string to number
  const parseCurrencyString = (currencyString: string): number => {
    if (!currencyString) return 0;
    // Remove currency code and commas, then parse
    const numericPart = currencyString.replace(/[^\d.-]/g, "");
    return parseFloat(numericPart) || 0;
  };

  // Helper function to format number as currency string
  const formatAsCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate summary metrics from API data
  const summary = summaryData?.results?.[0] || {
    total_properties: 0,
    occupied_properties: 0,
    vacant_properties: 0,
    rent_expected: "KES 0",
    total_expected: "KES 0",
    collected: "KES 0",
  };

  const totalUnits = summary.total_properties;
  const occupiedUnits = summary.occupied_properties;
  const rentExpected = parseCurrencyString(summary.rent_expected);
  const totalExpected = parseCurrencyString(summary.total_expected);
  const collected = parseCurrencyString(summary.collected);

  // Prepare data for DataTable
  const tableData = {
    data: {
      count: listData?.count || 0,
      results: listData?.results || [],
    },
  };


  const handleDateRangeUpdate = (values: {
    range: DateRange;
    rangeCompare?: DateRange;
  }) => {
    setDateRange(values.range);
  };

  const handleExport = async (format: "CSV" | "Excel" | "PDF") => {
    if (!listData?.results || !summaryData?.results?.[0]) {
      return;
    }

    setIsExporting(true);
    try {
      const exportData = {
        properties: listData.results,
        summary: summaryData.results[0],
        dateRange: dateRange,
        exportDate: new Date(),
      };

      exportRentRoll(format, exportData);
      toast.success(`Rent roll exported successfully as ${format}`);
    } catch (error) {
      toast.error(`Failed to export rent roll as ${format}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with integrated filters */}
      <Header title="View Rents" description="Track tenant rent">
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={handleDateRangeUpdate}
            showCompare={false}
          />

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-10"
                      disabled={
                        isExporting ||
                        !listData?.results ||
                        listData.results.length === 0
                      }
                    >
                      <Download className="mr-2 w-4 h-4" />
                      {isExporting ? "Exporting..." : "Export"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {!listData?.results || listData.results.length === 0
                        ? "No data available to export"
                        : "Export data to CSV, Excel, or PDF"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => handleExport("PDF")}
                disabled={isExporting}
              >
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("Excel")}
                disabled={isExporting}
              >
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("CSV")}
                disabled={isExporting}
              >
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>

      {/* Summary Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={Building2}
          title="Properties & Occupancy"
          value={`${totalUnits} Units`}
          desc={`${occupiedUnits} Occupied • ${Math.round(
            (occupiedUnits / totalUnits) * 100
          )}% Rate`}
        />
        <FeatureCard
          icon={Coins}
          title="Rent Amount"
          value={formatAsCurrency(rentExpected)}
          desc={`${
            totalExpected > 0
              ? Math.round((rentExpected / totalExpected) * 100)
              : 0
          }% of Total Expected`}
        />
        <FeatureCard
          icon={Coins}
          title="Total Expected"
          value={formatAsCurrency(totalExpected)}
          desc={`Rent: ${formatAsCurrency(
            rentExpected
          )} • Services: ${formatAsCurrency(totalExpected - rentExpected)}`}
        />
        <FeatureCard
          icon={HandCoins}
          title="Collection Rate"
          value={`${
            totalExpected > 0
              ? Math.round((collected / totalExpected) * 100)
              : 0
          }%`}
          desc={`${formatAsCurrency(collected)} of ${formatAsCurrency(
            totalExpected
          )} collected`}
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns({
          onSendReminder: (unit) => {
            setReminderUnit(unit);
            setReminderModalOpen(true);
          },
          onMarkAsPaid: (unit) => {
            setMarkPaidUnit(unit);
            setMarkPaidModalOpen(true);
          },
          onViewLedger: (unit) => {
            setLedgerUnit(unit);
            setLedgerModalOpen(true);
          },
          onViewLease: (unit) => {
            setLeaseUnit(unit);
            setLeaseModalOpen(true);
          },
          onAdjustRent: (unit) => {
            setAdjustRentUnit(unit);
            setAdjustRentModalOpen(true);
          },
          onAddPenalty: (unit) => {
            setAddPenaltyUnit(unit);
            setAddPenaltyModalOpen(true);
          },
        })}
        data={tableData}
        isLoading={isListLoading}
        isError={isListError}
        errorMessage={listError?.message}
        options={statusOptions}
        tableKey="rent-roll"
        searchableColumnIds={["property", "tenantName"]}
        searchableColumnsSetters={[setSearchTerm]}
        isUpper={false}
        searchPlaceholder="Search properties, tenants, or units..."
      />

      {/* Modals */}
      {reminderUnit && (
        <SendReminderModal
          open={reminderModalOpen}
          onClose={() => setReminderModalOpen(false)}
          unit={adaptForModals(reminderUnit)}
        />
      )}
      {markPaidUnit && (
        <MarkAsPaidModal
          open={markPaidModalOpen}
          onClose={() => setMarkPaidModalOpen(false)}
          unit={adaptForModals(markPaidUnit)}
        />
      )}
      {ledgerUnit && (
        <ViewLedgerModal
          open={ledgerModalOpen}
          onClose={() => setLedgerModalOpen(false)}
          unit={adaptForModals(ledgerUnit)}
        />
      )}
      {leaseUnit && (
        <ViewLeaseModal
          open={leaseModalOpen}
          onClose={() => setLeaseModalOpen(false)}
          unit={adaptForModals(leaseUnit)}
        />
      )}
      {adjustRentUnit && (
        <AdjustRentModal
          open={adjustRentModalOpen}
          onClose={() => setAdjustRentModalOpen(false)}
          unit={adaptForModals(adjustRentUnit)}
        />
      )}
      {addPenaltyUnit && (
        <AddPenaltyModal
          open={addPenaltyModalOpen}
          onClose={() => setAddPenaltyModalOpen(false)}
          unit={adaptForModals(addPenaltyUnit)}
        />
      )}
    </div>
  );
};

export default RentRoll;
