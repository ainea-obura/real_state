"use client";

import { Building2, Clock, ExternalLink, Home, MapPin, Users, Wrench } from 'lucide-react';
import { useParams } from 'next/navigation';
import { z } from 'zod';

import { getOwnerPropertiesDetailsTab } from '@/actions/clients/ownerDashboardAction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    CurrentTenantSchema, OwnerPropertiesResultSchema, PropertySchema,
} from '@/features/clients/tabs/schema/ownerPropertiesSchema';
import { useQuery } from '@tanstack/react-query';

// Infer types from Zod schema
export type OwnerPropertiesResult = z.infer<typeof OwnerPropertiesResultSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type CurrentTenant = z.infer<typeof CurrentTenantSchema>;

const OwnerProperties = () => {
  const params = useParams();
  const ownerId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["owner-properties", ownerId],
    queryFn: () => getOwnerPropertiesDetailsTab(ownerId),
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <div className="border-primary border-b-2 rounded-full w-12 h-12 animate-spin"></div>
        <div className="text-center">
          <h3 className="font-semibold">Loading Properties...</h3>
          <p className="text-muted-foreground">
            Fetching owner property portfolio data
          </p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <Building2 className="w-16 h-16 text-red-500" />
        <div className="text-center">
          <h3 className="font-semibold text-red-600">
            Error Loading Properties
          </h3>
          <p className="text-muted-foreground">
            Failed to load owner property data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Validate and extract the first result from the API response
  const ownerData = data?.data.results[0];
  

  // Guard: If ownerData is undefined, show fallback UI
  if (!ownerData) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <Building2 className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold">No Properties Data</h3>
          <p className="text-muted-foreground">
            No property portfolio data found for this owner.
          </p>
        </div>
      </div>
    );
  }

  // Only support summary/properties shape
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Property Portfolio
          </h1>
          <p className="text-muted-foreground">
            Managing {ownerData.summary.total_properties ?? 0} properties
          </p>
        </div>
      </div>

      {/* Portfolio Overview Cards - Always show, even if 0 */}
      <div className="gap-3 grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative bg-primary/5 hover:bg-primary/10 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Total Properties</h3>
                    <span className="font-semibold tracking-tight">
                      {ownerData.summary.total_properties ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Properties owned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-green-50 hover:bg-green-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-md">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Active Tenants</h3>
                    <span className="font-semibold tracking-tight">
                      {ownerData.summary.active_tenants ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Currently rented</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-blue-100 hover:bg-blue-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-200 p-2 rounded-md">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Occupancy Rate</h3>
                    <span className="font-semibold tracking-tight">
                      {ownerData.summary.occupancy_rate ?? 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Portfolio occupancy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-orange-100 hover:bg-orange-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-200 p-2 rounded-md">
                    <Wrench className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Maintenance</h3>
                    <span className="font-semibold tracking-tight">
                      {ownerData.summary.total_maintenance ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">
                  Urgent Requests (
                  {ownerData.summary.total_emergency_maintenance ?? 0})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      <div className="space-y-6">
        {ownerData.properties.length === 0 ? (
          <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
            <Building2 className="w-16 h-16 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold">No Properties Found</h3>
              <p className="text-muted-foreground">
                This owner doesn&apos;t have any properties registered yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="gap-4 grid grid-cols-2">
            {ownerData.properties.map((property) => {
              return (
                <div className="flex flex-col flex-1 gap-6" key={property.id}>
                  <Card
                    key={property.id}
                    className="relative flex flex-col bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl h-full overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">🏠</span>
                          <div>
                            <CardTitle className="text-xl">
                              {property.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {property.parent && (
                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <MapPin className="w-4 h-4" />
                                  <span>
                                    {property.property_node
                                      ?.split(">")
                                      .join("")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 justify-between space-y-6">
                      {/* Property Details */}
                      <div className="gap-4 grid md:grid-cols-2">
                        <div className="bg-gray-50/80 hover:bg-gray-100/80 p-4 rounded-lg text-center transition-colors duration-200">
                          <div className="flex justify-center items-center gap-2 mb-2">
                            <Home className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold">
                              {property.node_type ?? "N/A"}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            Property Type
                          </p>
                        </div>
                        <div className="bg-gray-50/80 hover:bg-gray-100/80 p-4 rounded-lg text-center transition-colors duration-200">
                          <div className="flex justify-center items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">
                              {property.created_at}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            Created At
                          </p>
                        </div>
                      </div>
                      {/* Current Tenant */}
                      <div>
                        {property.current_tenant ? (
                          <div className="space-y-2">
                            <h3 className="flex items-center gap-2 font-semibold">
                              <Users className="w-5 h-5" />
                              Current Tenant
                            </h3>
                            <div className="bg-green-50 p-4 border rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <div>
                                  <h4 className="font-medium text-sm">
                                    {property.current_tenant.name}
                                  </h4>
                                  <p className="text-muted-foreground text-xs">
                                    Lease:{" "}
                                    {property.current_tenant.contract_start} -{" "}
                                    {property.current_tenant.contract_end}
                                  </p>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">
                                  Rent:
                                </span>
                                <span className="font-medium">
                                  {property.current_tenant.rent_amount}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col justify-center items-center bg-gray-50 p-4 border rounded-lg min-h-[90px]">
                            <Users className="mb-2 w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-500">
                              No Active Tenant
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Maintenance Requests */}
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-2 font-semibold">
                          <Wrench className="w-5 h-5" />
                          Maintenance Requests (
                          {property.maintenance_requests.length})
                        </h3>
                        {property.maintenance_requests.length > 0 ? (
                          <div className="gap-3 grid md:grid-cols-2">
                            {property.maintenance_requests.map(
                              (m: {
                                id?: string;
                                title?: string;
                                status?: string;
                                priority?: string;
                                created_at?: string;
                              }) => (
                                <div
                                  key={m.id || m.title}
                                  className="bg-orange-50 p-4 border rounded-lg"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium text-sm">
                                      {m.title}
                                    </h4>
                                    <Badge className="bg-orange-100 text-orange-800">
                                      {m.status}
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {m.created_at}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col justify-center items-center bg-gray-50 p-4 border rounded-lg min-h-[90px]">
                            <Wrench className="mb-2 w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-500">
                              No maintenance this month
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerProperties;
