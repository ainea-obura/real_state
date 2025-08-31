import React, { useState, useEffect } from "react";
import { Home, Building2, Users } from "lucide-react";
import FetchTenants from "./fetchTenants";
import PropertyStatCard from "./PropertyStatCard";
import AllocateTenantModal from "./AllocateTenantModal";
import { Button } from "@/components/ui/button";
import { getProjectStructure } from "@/actions/projects/structure";
import { getPropertyStats } from "@/actions/clients/tenantDashboard";
import type { StructureNode } from "./Components/schema/projectStructureSchema";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { PermissionGate } from '@/components/PermissionGate';

const ShowTenantStatistics: React.FC<{ projectId: string }> = ({ projectId }) => {
  // Backend stats state
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Allocate modal state
  const [open, setOpen] = useState(false);
  // Structure state
  const [structure, setStructure] = useState<StructureNode[]>([]);
  const [structureLoading, setStructureLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);
      const response = await getPropertyStats(projectId);
      if (!response.error && response.data?.results) {
        setStats(response.data.results);
      } else {
        setStatsError(response.message || "Failed to load stats");
        setStats(null);
      }
      setStatsLoading(false);
    }
    fetchStats();
  }, [projectId]);

  useEffect(() => {
    async function fetchStructure() {
      setStructureLoading(true);
      const response = await getProjectStructure(projectId);
      if (!response.error) {
        setStructure((response.data.results as StructureNode[]) || []);
      } else {
        setStructure([]);
      }
      setStructureLoading(false);
    }
    fetchStructure();
  }, [projectId]);

  // Skeleton loader for stats
  const StatSkeleton = () => (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3 p-4 w-full h-full rounded-md border min-h-32">
          <div className="flex gap-3 items-center mb-2">
            <Skeleton className="p-4 w-12 h-12 rounded-md" />
            <Skeleton className="w-24 h-6 rounded" />
          </div>
          <div className="flex flex-row gap-2 justify-between text-center">
            <div className="flex-1">
              <Skeleton className="mx-auto mb-1 w-10 h-4" />
              <Skeleton className="mx-auto w-10 h-6" />
            </div>
            <div className="flex-1">
              <Skeleton className="mx-auto mb-1 w-10 h-4" />
              <Skeleton className="mx-auto w-10 h-6" />
            </div>
            <div className="flex-1">
              <Skeleton className="mx-auto mb-1 w-10 h-4" />
              <Skeleton className="mx-auto w-10 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <PermissionGate codename="add_tenants" showFallback={false}>
          <Button onClick={() => setOpen(true)} className="text-white bg-primary">
            Allocate Tenant
          </Button>
        </PermissionGate>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsLoading ? (
          <StatSkeleton />
        ) : statsError ? (
          <div className="col-span-3 py-8 text-center text-red-500">{statsError}</div>
        ) : stats ? (
          <>
            <PropertyStatCard
              type="Tenants"
              icon={Users}
              total={stats.total_tenants}
              occupied={stats.active_tenants}
              available={stats.inactive_tenants}
            />
            <PropertyStatCard
              type="Units"
              icon={Building2}
              total={stats.total_units}
              occupied={stats.occupied_units}
              available={stats.available_units}
            />
            <PropertyStatCard
              type="Houses"
              icon={Home}
              total={stats.total_houses}
              occupied={stats.occupied_houses}
              available={stats.available_houses}
            />
          </>
        ) : null}
      </div>
      <div className="w-full">
        <FetchTenants projectId={projectId} key={projectId + (open ? "-alloc" : "")}/>
      </div>
      {/* Only render AllocateTenantModal when structure is loaded */}
      {open && structureLoading ? (
        <div className="py-8 text-center text-gray-500">Loading structure...</div>
      ) : (
        <AllocateTenantModal
          open={open}
          onClose={() => {
            setOpen(false);
            // Refetch tenants and stats after closing modal (after assignment)
            queryClient.invalidateQueries({ queryKey: ["property-tenants", projectId] });
            queryClient.invalidateQueries({ queryKey: ["property-stats", projectId] });
          }}
          structure={structure}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default ShowTenantStatistics;
