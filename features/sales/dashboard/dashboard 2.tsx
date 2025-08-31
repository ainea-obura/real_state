"use client";

import { Calendar } from 'lucide-react';
import React, { useState } from 'react';

import { fetchDashboard } from '@/actions/sales/dashboard';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '@/features/projects/profile/tabs/Components/structure/header';
import { useQuery } from '@tanstack/react-query';

import { ReservePropertyModal } from '../owner/components';
import AvailabilityMatrix from './components/AvailabilityMatrix';
import FeatureCards from './components/FeatureCards';
import FinanceCollection from './components/FinanceCollection';
import SalespeopleSection from './components/SalespeopleSection';

// ---------------------------
// Component
// ---------------------------
export default function SalesDashboard() {
  // Date range state for filtering
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Reserve Property Modal state
  const [showReservePropertyModal, setShowReservePropertyModal] =
    useState(false);

  // React Query for dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sales-dashboard", dateRange.from, dateRange.to],
    queryFn: () =>
      fetchDashboard(
        dateRange.from?.toISOString().split("T")[0],
        dateRange.to?.toISOString().split("T")[0]
      ),
    enabled: true, // Always enabled, will use undefined dates if not set
  });

  // Handle date range changes
  const handleDateRangeChange = (
    from: Date | undefined,
    to: Date | undefined
  ) => {
    setDateRange({ from, to });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <Header title="Sales Dashboard" description="View all sales data" />
          <DateRangePicker />
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 text-lg">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  // Show error banner if there's an error, but don't block the entire dashboard
  const showErrorBanner = error || !dashboardData?.success;

  // Extract data from API response with fallbacks
  const { feature_cards, finance_collection, salespeople } =
    dashboardData.data || {};

  // Pricing bands per floor based on your price list image
  const priceBands: {
    range: [number, number];
    A1?: number;
    A2?: number;
    A3?: number;
    A4?: number;
    A5?: number;
    S?: number;
    B?: number;
  }[] = [
    {
      range: [1, 5],
      A1: 15450000,
      A2: 13250000,
      A3: 11250000,
      A4: 13250000,
      A5: 11850000,
      S: 7200000,
      B: 8150000,
    },
    {
      range: [6, 10],
      A1: 15650000,
      A2: 13450000,
      A3: 11450000,
      A4: 13450000,
      A5: 12050000,
      S: 7300000,
      B: 8350000,
    },
    {
      range: [11, 13],
      A1: 15850000,
      A2: 13650000,
      A3: 11650000,
      A4: 13650000,
      A5: 12250000,
      S: 7400000,
      B: 8550000,
    },
    {
      range: [14, 16],
      A1: 15950000,
      A2: 13750000,
      A3: 11750000,
      A4: 13750000,
      A5: 12350000,
      S: 7500000,
      B: 8650000,
    },
    {
      range: [17, 19],
      A1: 16050000,
      A2: 13850000,
      A3: 11850000,
      A4: 13850000,
      A5: 12450000,
      S: 7600000,
      B: 8750000,
    },
    {
      range: [20, 22],
      A1: 16150000,
      A2: 13950000,
      A3: 11950000,
      A4: 13950000,
      A5: 12550000,
      S: 7700000,
      B: 8850000,
    },
    {
      range: [23, 23],
      A1: 16250000,
      A2: 14050000,
      A3: 12050000,
      A4: 14050000,
      A5: 12650000,
      S: 7800000,
      B: 8950000,
    },
    {
      range: [24, 24],
      A1: 16350000,
      A2: 14150000,
      A3: 12150000,
      A4: 14150000,
      A5: 12750000,
      S: 7900000,
      B: 9050000,
    },
    {
      range: [25, 25],
      A1: 16450000,
      A2: 14250000,
      A3: 12250000,
      A4: 14250000,
      A5: 12850000,
      S: 8000000,
      B: 9150000,
    },
  ];

  type UnitStatus = "available" | "sold" | "booked" | "deposit";

  // Enhanced unit type system for flexible floor layouts
  type UnitType = {
    id: string;
    name: string;
    bedrooms: number;
    sizeSqft: number;
    sizeSqm: number;
    priceKey: PriceKey;
    color: string; // For column color coding
  };

  type PriceKey = "A1" | "A2" | "A3" | "A4" | "A5" | "B" | "S";

  // Define unit types without color coding (colors will be based on status)
  const unitTypes: Record<string, UnitType> = {
    studio: {
      id: "studio",
      name: "Studio",
      bedrooms: 0,
      sizeSqft: 484,
      sizeSqm: 45,
      priceKey: "S",
      color: "",
    },
    oneBed: {
      id: "oneBed",
      name: "1 Bedroom",
      bedrooms: 1,
      sizeSqft: 646,
      sizeSqm: 60,
      priceKey: "B",
      color: "",
    },
    oneBedroomPlus: {
      id: "oneBedroomPlus",
      name: "1 Bedroom Plus",
      bedrooms: 1,
      sizeSqft: 689,
      sizeSqm: 64,
      priceKey: "B",
      color: "",
    },
    twoBed: {
      id: "twoBed",
      name: "2 Bedroom",
      bedrooms: 2,
      sizeSqft: 1109,
      sizeSqm: 103,
      priceKey: "A5",
      color: "",
    },
    twoBedPlus: {
      id: "twoBedPlus",
      name: "2 Bedroom Plus",
      bedrooms: 2,
      sizeSqft: 1216,
      sizeSqm: 113,
      priceKey: "A4",
      color: "",
    },
    premium2Bed: {
      id: "premium2Bed",
      name: "Premium 2 Bedroom",
      bedrooms: 2,
      sizeSqft: 1399,
      sizeSqm: 130,
      priceKey: "A1",
      color: "",
    },
  };

  // Flexible floor layout system - each floor can have different unit combinations
  type FloorUnit = {
    unitId: string;
    unitType: UnitType;
    status: UnitStatus;
    unitNumber: string; // e.g., "A101", "B205"
  };

  type FloorLayout = {
    floor: number;
    units: FloorUnit[];
  };

  // Generate realistic floor layouts with varying unit types per floor
  const generateFloorLayouts = (): FloorLayout[] => {
    const layouts: FloorLayout[] = [];

    for (let floor = 1; floor <= 25; floor++) {
      const units: FloorUnit[] = [];

      // Different layouts for different floor ranges
      if (floor >= 1 && floor <= 5) {
        // Ground to 5th: Mixed layout with more variety
        units.push(
          {
            unitId: `${floor}01`,
            unitType: unitTypes.studio,
            status: getRandomStatus(floor, 1),
            unitNumber: `A${floor}01`,
          },
          {
            unitId: `${floor}02`,
            unitType: unitTypes.oneBed,
            status: getRandomStatus(floor, 2),
            unitNumber: `B${floor}02`,
          },
          {
            unitId: `${floor}03`,
            unitType: unitTypes.twoBed,
            status: getRandomStatus(floor, 3),
            unitNumber: `C${floor}03`,
          },
          {
            unitId: `${floor}04`,
            unitType: unitTypes.twoBedPlus,
            status: getRandomStatus(floor, 4),
            unitNumber: `D${floor}04`,
          }
        );
      } else if (floor >= 6 && floor <= 15) {
        // Mid floors: Standard layout
        units.push(
          {
            unitId: `${floor}01`,
            unitType: unitTypes.oneBed,
            status: getRandomStatus(floor, 1),
            unitNumber: `A${floor}01`,
          },
          {
            unitId: `${floor}02`,
            unitType: unitTypes.oneBedroomPlus,
            status: getRandomStatus(floor, 2),
            unitNumber: `B${floor}02`,
          },
          {
            unitId: `${floor}03`,
            unitType: unitTypes.twoBed,
            status: getRandomStatus(floor, 3),
            unitNumber: `C${floor}03`,
          },
          {
            unitId: `${floor}04`,
            unitType: unitTypes.twoBedPlus,
            status: getRandomStatus(floor, 4),
            unitNumber: `D${floor}04`,
          },
          {
            unitId: `${floor}05`,
            unitType: unitTypes.premium2Bed,
            status: getRandomStatus(floor, 5),
            unitNumber: `E${floor}05`,
          }
        );
      } else {
        // Top floors: Premium units
        units.push(
          {
            unitId: `${floor}01`,
            unitType: unitTypes.twoBed,
            status: getRandomStatus(floor, 1),
            unitNumber: `A${floor}01`,
          },
          {
            unitId: `${floor}02`,
            unitType: unitTypes.twoBedPlus,
            status: getRandomStatus(floor, 2),
            unitNumber: `B${floor}02`,
          },
          {
            unitId: `${floor}03`,
            unitType: unitTypes.premium2Bed,
            status: getRandomStatus(floor, 3),
            unitNumber: `C${floor}03`,
          },
          {
            unitId: `${floor}04`,
            unitType: unitTypes.premium2Bed,
            status: getRandomStatus(floor, 4),
            unitNumber: `D${floor}04`,
          }
        );
      }

      layouts.push({ floor, units });
    }

    return layouts;
  };

  // Helper function to generate deterministic but varied status
  function getRandomStatus(floor: number, unitIndex: number): UnitStatus {
    const seed = (floor * 7 + unitIndex * 3) % 100;

    // Higher floors more likely to be sold/booked
    if (floor > 20) {
      return seed < 40
        ? "sold"
        : seed < 65
        ? "booked"
        : seed < 80
        ? "deposit"
        : "available";
    } else if (floor > 10) {
      return seed < 25
        ? "sold"
        : seed < 45
        ? "booked"
        : seed < 65
        ? "deposit"
        : "available";
    } else {
      return seed < 15
        ? "sold"
        : seed < 30
        ? "booked"
        : seed < 50
        ? "deposit"
        : "available";
    }
  }

  const floorLayouts = generateFloorLayouts();

  // Mock people details for non-available units (deterministic from floor/column)
  const mockPeople = [
    {
      name: "Liam Kariuki",
      phone: "+254 712 345 678",
      email: "liam.k@example.com",
    },
    {
      name: "Aisha Ouma",
      phone: "+254 701 555 234",
      email: "aisha.o@example.com",
    },
    {
      name: "John Mwangi",
      phone: "+254 733 987 111",
      email: "john.m@example.com",
    },
    {
      name: "Zara Ahmed",
      phone: "+254 710 456 009",
      email: "zara.a@example.com",
    },
    {
      name: "Peter Njoroge",
      phone: "+254 728 888 222",
      email: "peter.n@example.com",
    },
    {
      name: "Mary Wangari",
      phone: "+254 725 123 456",
      email: "mary.w@example.com",
    },
  ];

  // Mock salesperson outstanding list (fallback if API fails)
  const mockSalespeople = [
    {
      name: "Asha Noor",
      assigned: 12,
      outstanding: 2_450_000,
      overdueFollowUps: 3,
    },
    {
      name: "Brian Otieno",
      assigned: 9,
      outstanding: 1_720_000,
      overdueFollowUps: 1,
    },
    {
      name: "Chen Li",
      assigned: 7,
      outstanding: 3_100_000,
      overdueFollowUps: 4,
    },
    {
      name: "Deka Farah",
      assigned: 11,
      outstanding: 950_000,
      overdueFollowUps: 0,
    },
  ];

  // Use API data or fallback to mock data
  const finalSalespeople = salespeople || mockSalespeople;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Error Banner - only show if there's an error */}
      {showErrorBanner && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <span className="font-medium">Dashboard Data Unavailable</span>
              <p className="mt-1 text-red-600 text-sm">
                {dashboardData?.message ||
                  "Failed to load dashboard data. Some features may be limited."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Header title="Sales Dashboard" description="View all sales data" />
        <div className="flex items-center gap-2">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={(values) => {
              handleDateRangeChange(values.range.from, values.range.to);
            }}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="bg-green-600 hover:bg-green-700 hover:shadow-md border-green-600 hover:border-green-700 text-white hover:scale-105 transition-all duration-200"
                  onClick={() => setShowReservePropertyModal(true)}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reserve Property</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Feature Cards Row */}
      <FeatureCards
        startDate={dateRange.from?.toISOString().split("T")[0]}
        endDate={dateRange.to?.toISOString().split("T")[0]}
      />

      {/* Finance Collection */}
      <FinanceCollection
        selectedDateRange={{
          from: dateRange.from?.toISOString().split("T")[0] || "",
          to: dateRange.to?.toISOString().split("T")[0] || "",
        }}
      />

      {/* Availability Matrix */}
      <AvailabilityMatrix
        floorLayouts={floorLayouts}
        priceBands={priceBands}
        unitTypes={unitTypes}
        mockPeople={mockPeople}
      />

      {/* Salespeople */}
      <SalespeopleSection salespeople={finalSalespeople} />

      {/* Reserve Property Modal */}
      <ReservePropertyModal
        isOpen={showReservePropertyModal}
        onClose={() => setShowReservePropertyModal(false)}
      />
    </div>
  );
}
