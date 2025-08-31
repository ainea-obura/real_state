import { Building2, DollarSign, Grid3X3, TrendingUp, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { fetchAvailabilityMatrix, fetchProjects } from '@/actions/properties/availabilityMatrix';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

import type { UnitData } from "@/actions/properties/availabilityMatrix";

// Types
type UnitStatus = "available" | "sold" | "booked" | "deposit";

interface AvailabilityMatrixProps {
  // Component will fetch its own data
}

const AvailabilityMatrix = ({}: AvailabilityMatrixProps) => {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [floorSearch, setFloorSearch] = useState<string>("");

  // Fetch projects list
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // Set default project when projects load
  React.useEffect(() => {
    if (
      projectsData?.success &&
      projectsData.data?.length &&
      !selectedProject
    ) {
      setSelectedProject(projectsData.data[0].id);
    }
  }, [projectsData, selectedProject]);

  // Fetch availability matrix data - ALWAYS get ALL projects
  const {
    data: matrixData,
    isLoading: matrixLoading,
    error,
  } = useQuery({
    queryKey: ["availability-matrix", selectedBlock],
    queryFn: () =>
      fetchAvailabilityMatrix({
        project_id: undefined, // NEVER pass project_id - always get all projects
        block_id: selectedBlock !== "all" ? selectedBlock : undefined,
      }),
    enabled: true, // Always fetch
  });

  // Extract projects and blocks from API data
  const projects = projectsData?.success ? projectsData.data || [] : [];
  const availabilityData = matrixData?.success ? matrixData.data || [] : [];

  // Set default project when availability data loads (if no project selected)
  React.useEffect(() => {
    if (availabilityData?.length && !selectedProject) {
      setSelectedProject(availabilityData[0].id);
    }
  }, [availabilityData, selectedProject]);

  // Get the selected project data - filter from ALL projects data
  const selectedProjectData = useMemo(() => {
    if (!selectedProject || !availabilityData?.length) {
      return null;
    }
    // Filter from the complete availability data (all projects)
    return availabilityData.find((p) => p?.id === selectedProject);
  }, [selectedProject, availabilityData]);

  // Debug logging
  console.log("=== AVAILABILITY MATRIX DEBUG ===");
  console.log("projectsData:", projectsData);
  console.log("matrixData:", matrixData);
  console.log("projects:", projects);
  console.log("availabilityData:", availabilityData);
  console.log("selectedProject:", selectedProject);
  console.log("selectedProjectData:", selectedProjectData);
  console.log("=================================");

  // Get blocks for selected project
  const blocks = useMemo(() => {
    // Extract blocks from the new nested structure
    if (!selectedProjectData?.blocks) {
      return [];
    }

    // Get block letters from the blocks object keys
    const blockLetters = Object.keys(selectedProjectData.blocks);

    return blockLetters.map((letter) => ({
      id: letter,
      name: `Block ${letter}`,
    }));
  }, [selectedProject, selectedProjectData]);

  // Process floors and units from API data
  const { filteredFloors, summaryData } = useMemo(() => {
    if (!availabilityData?.length || !selectedProjectData?.blocks) {
      return {
        filteredFloors: [],
        summaryData: {
          totalUnits: 0,
          sold: 0,
          available: 0,
          booked: 0,
          deposit: 0,
          occupancyRate: "0",
        },
      };
    }

    // Process only selected project with new nested structure
    const allUnits: UnitData[] = [];
    let totalUnits = 0;
    const statusCounts = { available: 0, sold: 0, booked: 0, deposit: 0 };

    // Extract all units from nested structure
    for (const [blockLetter, floors] of Object.entries(
      selectedProjectData.blocks
    )) {
      for (const [floorNumber, units] of Object.entries(floors)) {
        allUnits.push(...units);
        totalUnits += units.length;

        // Count statuses
        for (const unit of units) {
          if (unit?.status) {
            switch (unit.status) {
              case "available":
                statusCounts.available++;
                break;
              case "sold":
                statusCounts.sold++;
                break;
              case "booked":
                statusCounts.booked++;
                break;
              case "deposit_paid":
                statusCounts.deposit++;
                break;
              default:
                console.log("Unknown unit status:", unit.status, unit.name);
            }
          }
        }
      }
    }

    // Create floor layout from nested structure
    const allFloors: Array<{
      block: string;
      floor: number;
      units: UnitData[];
    }> = [];

    for (const [blockLetter, floors] of Object.entries(
      selectedProjectData.blocks
    )) {
      for (const [floorNumber, units] of Object.entries(floors)) {
        allFloors.push({
          block: blockLetter,
          floor: parseInt(floorNumber),
          units: units.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }

    // Sort by block letter, then by floor number
    allFloors.sort((a, b) => {
      if (a.block !== b.block) {
        return a.block.localeCompare(b.block);
      }
      return a.floor - b.floor;
    });

    // Apply floor search filter
    const filteredFloors = floorSearch
      ? allFloors.filter((f) => f.floor.toString().includes(floorSearch))
      : allFloors;

    console.log("Floor processing:", {
      allUnits: allUnits.length,
      allFloors: allFloors.length,
      filteredFloors: filteredFloors.length,
      blocks: Object.keys(selectedProjectData.blocks || {}),
    });

    const occupancyRate =
      totalUnits > 0
        ? (((totalUnits - statusCounts.available) / totalUnits) * 100).toFixed(
            1
          )
        : "0";

    return {
      filteredFloors,
      summaryData: {
        totalUnits,
        sold: statusCounts.sold,
        available: statusCounts.available,
        booked: statusCounts.booked,
        deposit: statusCounts.deposit,
        occupancyRate,
      },
    };
  }, [availabilityData, floorSearch, selectedProject, selectedProjectData]);

  // Debug logging
  console.log("=== AVAILABILITY MATRIX DEBUG ===");
  console.log("projectsData:", projectsData);
  console.log("matrixData:", matrixData);
  console.log("projects:", projects);
  console.log("availabilityData:", availabilityData);
  console.log("filteredFloors:", filteredFloors);
  console.log("summaryData:", summaryData);
  console.log("=================================");

  // Helper functions
  function money(x: number | string | undefined) {
    if (!x) return "—";

    // Convert string to number if needed
    const numValue = typeof x === "string" ? parseFloat(x) : x;

    if (isNaN(numValue)) return "—";

    return `KES ${numValue.toLocaleString()}`;
  }

  // Loading state
  if (projectsLoading || matrixLoading) {
    return (
      <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
        <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500 text-lg">
              Loading availability matrix...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No project selected state
  if (!selectedProject) {
    return (
      <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
        <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-2 text-gray-500 text-lg">
                Please select a project to view availability
              </div>
              <div className="text-gray-400 text-sm">
                Choose a project from the dropdown above
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || (matrixData && !matrixData.success)) {
    return (
      <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
        <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
          <div className="flex justify-center items-center h-64">
            <div className="text-red-500 text-lg">
              {matrixData?.message || "Failed to load availability matrix"}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No data state
  if (!availabilityData?.length) {
    return (
      <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
        <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500 text-lg">
              No availability data found
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No units found for selected project
  if (
    selectedProject !== "all" &&
    selectedProjectData &&
    !selectedProjectData.blocks
  ) {
    return (
      <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
        <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="mb-2 text-gray-500 text-lg">
                No units found for selected project
              </div>
              <div className="text-gray-400 text-sm">
                Try selecting a different project or "All Projects"
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="gap-4 grid grid-cols-1 2xl:grid-cols-3">
      <Card className="2xl:col-span-2 bg-transparent shadow-none backdrop-blur-sm border">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r border-b">
          <div className="px-6 pt-6 pb-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="font-bold text-gray-900 text-2xl">
                  Property Availability Matrix
                </CardTitle>
                <CardDescription className="mt-1 text-gray-600">
                  Real-time unit availability across all floors and blocks
                </CardDescription>
                {availabilityData.length > 1 && (
                  <div className="bg-blue-50 mt-2 p-2 border border-blue-200 rounded-md">
                    <p className="text-blue-700 text-sm">
                      📋 {availabilityData.length} projects available • Switch
                      between projects using the dropdown
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls Section */}
        <div className="">
          <div className="px-6">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="project-select"
                  className="flex items-center gap-2 font-semibold text-gray-700 text-sm"
                >
                  <Building2 className="size-4 text-blue-600" />
                  Project
                  {availabilityData.length > 0 && (
                    <span className="font-normal text-gray-500 text-xs">
                      ({availabilityData.length} available)
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedProject}
                  onValueChange={(value) => {
                    setSelectedProject(value);
                    setFloorSearch("");
                    setSelectedBlock("all"); // Reset block when project changes
                  }}
                >
                  <SelectTrigger
                    id="project-select"
                    className="bg-gray-50/50 hover:bg-gray-50 border-gray-200 w-full !h-11 transition-colors"
                  >
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {matrixLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading projects...
                      </SelectItem>
                    ) : availabilityData.length === 0 ? (
                      <SelectItem value="no-projects" disabled>
                        No projects available
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem
                          value="info"
                          disabled
                          className="text-gray-500 text-xs"
                        >
                          {availabilityData.length} project
                          {availabilityData.length !== 1 ? "s" : ""} available
                        </SelectItem>
                        {availabilityData.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Block Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="block-select"
                  className="flex items-center gap-2 font-semibold text-gray-700 text-sm"
                >
                  <Grid3X3 className="size-4 text-emerald-600" />
                  Block
                </Label>
                <Select
                  value={selectedBlock}
                  onValueChange={(value) => {
                    setSelectedBlock(value);
                    if (value === "all") {
                      setFloorSearch("");
                    }
                  }}
                >
                  <SelectTrigger
                    id="block-select"
                    className="bg-gray-50/50 hover:bg-gray-50 disabled:opacity-50 border-gray-200 w-full !h-11 transition-colors"
                  >
                    <SelectValue placeholder="Choose block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blocks</SelectItem>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Floor Search */}
              <div className="space-y-2">
                <Label
                  htmlFor="floor-search"
                  className="font-semibold text-gray-700 text-sm"
                >
                  Floor Search
                </Label>
                <Input
                  id="floor-search"
                  placeholder={
                    selectedBlock === "all"
                      ? "Select block first..."
                      : "Search floors..."
                  }
                  value={floorSearch}
                  onChange={(e) => setFloorSearch(e.target.value)}
                  className="bg-gray-50/50 hover:bg-gray-50 disabled:opacity-50 border-gray-200 transition-colors"
                  disabled={selectedBlock === "all"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Summary Section */}
        <div className="border-b">
          <div className="px-6 py-5">
            <div className="">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-lg">
                  {availabilityData.find((p) => p?.id === selectedProject)
                    ?.name || "Unknown Project"}
                  {selectedBlock !== "all"
                    ? ` - ${
                        blocks.find((b) => b?.id === selectedBlock)?.name ||
                        "Unknown Block"
                      }`
                    : " - All Blocks"}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 px-2 py-1 rounded-full text-gray-500 text-xs">
                    {summaryData.totalUnits} Total Units
                  </div>
                  {availabilityData.length > 1 && (
                    <div className="bg-blue-100 px-2 py-1 rounded-full text-blue-600 text-xs">
                      {availabilityData.length} Projects
                    </div>
                  )}
                </div>
              </div>

              {/* Feature Cards Grid */}
              <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                <FeatureCard
                  icon={Grid3X3}
                  title="Available"
                  value={summaryData.available.toString()}
                  desc="Units ready for sale"
                />

                <FeatureCard
                  icon={Users}
                  title="Booked"
                  value={summaryData.booked.toString()}
                  desc="Units with reservations"
                />

                <FeatureCard
                  icon={DollarSign}
                  title="Deposit"
                  value={summaryData.deposit.toString()}
                  desc="Deposit paid units"
                />

                <FeatureCard
                  icon={TrendingUp}
                  title="Sold"
                  value={summaryData.sold.toString()}
                  desc="Units already sold"
                />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="bg-white">
            {/* Enhanced Legend */}
            <div className="top-0 z-20 sticky px-6 py-4 border border-b">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">
                  Unit Status Legend
                </h4>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="bg-white border-2 border-gray-300 rounded-lg size-4"></div>
                    <span className="font-medium text-gray-700">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 rounded-lg size-4"></div>
                    <span className="font-medium text-gray-700">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-red-100 border-2 border-red-400 rounded-lg size-4"></div>
                    <span className="font-medium text-gray-700">
                      Deposit Paid
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-black rounded-lg size-4"></div>
                    <span className="font-medium text-gray-700">Sold</span>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="bg-gray-50/30 min-w-full">
                {/* Grid-Based Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      {filteredFloors.map((layout, floorIndex) => {
                        // Group units into rows of 4
                        const unitRows: UnitData[][] = [];
                        for (let i = 0; i < layout.units.length; i += 4) {
                          unitRows.push(layout.units.slice(i, i + 4));
                        }

                        // Alternating floor colors for visual separation
                        const isEvenFloor = floorIndex % 2 === 0;
                        const floorBgClass = isEvenFloor
                          ? "bg-white"
                          : "bg-gray-50/50";

                        return unitRows.map((unitRow, rowIndex) => {
                          // Add thicker border for last row of each floor for visual separation
                          const isLastRowOfFloor =
                            rowIndex === unitRows.length - 1;
                          const borderClass = isLastRowOfFloor
                            ? "border-gray-300 border-b-2"
                            : "border-gray-100 border-b";

                          return (
                            <tr
                              key={`${layout.floor}-${rowIndex}`}
                              className={`${borderClass} ${floorBgClass}`}
                            >
                              {/* Floor Column (only show on first row of each floor) */}
                              {rowIndex === 0 ? (
                                <td
                                  rowSpan={unitRows.length}
                                  className="left-0 z-10 sticky bg-gradient-to-r from-slate-100 to-gray-100 px-4 py-6 border-gray-200 border-r align-top"
                                  style={{ width: "18%" }}
                                >
                                  <div className="text-center whitespace-nowrap">
                                    <div className="mb-1 font-medium text-gray-600 text-xs">
                                      Block {layout.block}
                                    </div>
                                    <div className="font-bold text-gray-900 text-lg">
                                      Floor {layout.floor}
                                    </div>
                                  </div>
                                </td>
                              ) : null}

                              {/* Unit Columns */}
                              {Array.from({ length: 4 }, (_, colIndex) => {
                                const unit = unitRow[colIndex];

                                if (!unit) {
                                  // Empty cell if no unit
                                  return (
                                    <td
                                      key={`empty-${colIndex}`}
                                      className={`p-4 border-gray-100 border-r ${floorBgClass}`}
                                      style={{ width: "20.5%" }}
                                    >
                                      <div className="w-full h-28"></div>
                                    </td>
                                  );
                                }

                                // Enhanced status-based styling
                                const getStatusStyles = (
                                  status: UnitData["status"]
                                ) => {
                                  switch (status) {
                                    case "available":
                                      return "bg-white text-black cursor-pointer border-gray-300";
                                    case "booked":
                                      return "bg-green-100 text-black border-green-400";
                                    case "deposit_paid":
                                      return "bg-red-100 text-black border-red-400";
                                    case "sold":
                                      return "bg-gray-800 text-white border-gray-700";
                                    default:
                                      return "bg-white text-black border-gray-300";
                                  }
                                };

                                const getStatusDotColor = (
                                  status: UnitData["status"]
                                ) => {
                                  switch (status) {
                                    case "available":
                                      return "bg-white border border-gray-400";
                                    case "booked":
                                      return "bg-green-500";
                                    case "deposit_paid":
                                      return "bg-red-500";
                                    case "sold":
                                      return "bg-black";
                                    default:
                                      return "bg-gray-300";
                                  }
                                };

                                return (
                                  <td
                                    key={unit.id}
                                    className={`p-4 border-gray-100 border-r ${floorBgClass}`}
                                    style={{ width: "20.5%" }}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn(
                                            "p-2 rounded-lg border-2 transition-all duration-300 text-center hover:shadow-md cursor-pointer w-full h-28 flex flex-col justify-between overflow-hidden",
                                            getStatusStyles(unit.status)
                                          )}
                                        >
                                          {/* Unit Header */}
                                          <div className="flex justify-between items-center min-h-0">
                                            <div className="flex-1 mr-1 font-semibold text-sm truncate">
                                              {unit.name ?? "N/A"}
                                            </div>
                                            <div
                                              className={cn(
                                                "size-2 rounded-full flex-shrink-0",
                                                getStatusDotColor(unit.status)
                                              )}
                                            />
                                          </div>

                                          {/* Unit Type */}
                                          <div
                                            className={cn(
                                              "text-xs truncate leading-tight",
                                              unit.status === "sold"
                                                ? "text-white/80"
                                                : "text-gray-600"
                                            )}
                                            title={
                                              unit.unit_detail?.unit_type ??
                                              "Unknown"
                                            }
                                          >
                                            {unit.unit_detail?.unit_type ??
                                              "Unknown"}
                                          </div>

                                          {/* Size */}
                                          <div
                                            className={cn(
                                              "text-xs truncate leading-tight",
                                              unit.status === "sold"
                                                ? "text-white/70"
                                                : "text-gray-500"
                                            )}
                                            title={
                                              unit.unit_detail?.size ?? "N/A"
                                            }
                                          >
                                            {unit.unit_detail?.size ?? "N/A"}
                                          </div>

                                          {/* Price */}
                                          <div
                                            className={cn(
                                              "text-xs font-semibold truncate leading-tight",
                                              unit.status === "sold"
                                                ? "text-white"
                                                : "text-green-700"
                                            )}
                                            title={money(
                                              unit.unit_detail?.sale_price
                                            )}
                                          >
                                            {money(
                                              unit.unit_detail?.sale_price
                                            )}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-64"
                                      >
                                        {unit.status === "available" ? (
                                          <div>
                                            <div className="mb-1 font-medium">
                                              {unit.unit_detail?.unit_type ??
                                                "Unknown"}
                                            </div>
                                            <div className="mb-1 text-muted-foreground text-xs">
                                              Floor {layout.floor} • Unit{" "}
                                              {unit.name ?? "N/A"}
                                            </div>
                                            <div className="mb-1 text-xs">
                                              Size:{" "}
                                              {unit.unit_detail?.size ?? "N/A"}
                                            </div>
                                            <div className="mb-1 text-xs">
                                              Price:{" "}
                                              <span className="font-medium">
                                                {money(
                                                  unit.unit_detail?.sale_price
                                                )}
                                              </span>
                                            </div>
                                            <div className="mt-2 font-medium text-green-600 text-xs">
                                              ✅ Available for Sale
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="mb-1 font-medium">
                                              {unit.unit_detail?.unit_type ??
                                                "Unknown"}
                                            </div>
                                            <div className="mb-1 text-muted-foreground text-xs">
                                              Floor {layout.floor} • Unit{" "}
                                              {unit.name ?? "N/A"}
                                            </div>
                                            <div className="mb-1 text-xs">
                                              Size:{" "}
                                              {unit.unit_detail?.size ?? "N/A"}
                                            </div>
                                            <div className="mb-2 text-xs">
                                              Price:{" "}
                                              <span className="font-medium">
                                                {money(
                                                  unit.unit_detail?.sale_price
                                                )}
                                              </span>
                                            </div>
                                            {unit.buyer_info && (
                                              <div className="pt-2 border-t">
                                                <div className="mb-1 font-medium text-xs">
                                                  {unit.status === "sold"
                                                    ? "👤 Owner:"
                                                    : unit.status === "booked"
                                                    ? "📋 Booked by:"
                                                    : "💰 Deposit from:"}
                                                </div>
                                                <div className="space-y-0.5 text-xs">
                                                  <div className="font-medium">
                                                    {unit.buyer_info.name ??
                                                      "N/A"}
                                                  </div>
                                                  <div>
                                                    {unit.buyer_info.phone ??
                                                      "N/A"}
                                                  </div>
                                                  <div>
                                                    {unit.buyer_info.email ??
                                                      "N/A"}
                                                  </div>
                                                  <div className="mt-1 text-[10px] text-muted-foreground">
                                                    {unit.status === "sold"
                                                      ? "Sold"
                                                      : unit.status === "booked"
                                                      ? "Deposit paid"
                                                      : unit.sale_info
                                                          ?.possession_date ??
                                                        unit.reservation_info
                                                          ?.end_date ??
                                                        "N/A"}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityMatrix;
