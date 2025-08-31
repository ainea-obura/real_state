"use client";

import {
    Activity, AlertTriangle, Building2, Coins, Eye, Mail, Phone, TrendingUp, Users,
} from 'lucide-react';
import { useParams } from 'next/navigation';

import { getOwnerDashboard } from '@/actions/clients/ownerDashboardAction';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

const OwnerOverview = () => {
  const params = useParams();
  const ownerId = params.id as string;

  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["owner-dashboard", ownerId],
    queryFn: () => getOwnerDashboard(ownerId),
    enabled: !!ownerId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getVerificationColor = (verified: boolean) => {
    return verified
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto mb-4 border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="text-muted-foreground">Loading owner data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData || dashboardData.error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 w-8 h-8 text-red-500" />
          <p className="font-medium text-red-600">Failed to load owner data</p>
          <p className="text-muted-foreground text-sm">
            {dashboardData?.message || "Please try again later"}
          </p>
        </div>
      </div>
    );
  }

  // Extract data from the response
  const ownerData = dashboardData.data.results[0];
  if (!ownerData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 w-8 h-8 text-yellow-500" />
          <p className="font-medium text-yellow-600">No owner data found</p>
        </div>
      </div>
    );
  }

  const { owner, stats } = ownerData;

  // Use actual data from API response
  const totalProperties = stats.owned_properties;
  const totalIncome = stats.total_income;
  const outstandingAmount = stats.total_outstanding;
  const pendingInvoices = stats.pending_invoices;
  const totalServiceCost = stats.total_service_cost;
  const totalManagementCost = stats.total_management_cost;
  const occupancyRate = stats.occupancy_rate;

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Owner Management
            </h1>
            <p className="text-muted-foreground">
              Managing {owner.first_name} {owner.last_name}&apos;s portfolio
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          <Badge
            className={getStatusColor(owner.is_active ? "active" : "inactive")}
          >
            {owner.is_active ? "Active Account" : "Inactive Account"}
          </Badge>
          <Badge
            className={getVerificationColor(owner.is_owner_verified || false)}
          >
            {owner.is_owner_verified
              ? "Verified Owner"
              : "Pending Verification"}
          </Badge>
          <Badge variant="outline">{totalProperties} Properties</Badge>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative bg-primary/5 hover:bg-primary/10 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-md">
                    <Coins className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-sm">
                      Total <br /> Income
                    </h3>
                    <span className="font-semibold tracking-tight">
                      {totalIncome}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="text-gray-500 text-xs">All-time rental income</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-blue-100 hover:bg-blue-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-200 p-2.5 rounded-md">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-sm">Properties Managed</h3>
                    <span className="font-semibold tracking-tight">
                      {totalProperties}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="text-gray-500 text-xs">Active properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-yellow-50 hover:bg-yellow-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 p-2.5 rounded-md">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-sm">
                      Outstanding <br />
                      Invoices
                    </h3>
                    <span className="font-semibold tracking-tight">
                      {pendingInvoices}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="text-gray-500 text-xs">
                  This month&apos;s income
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-orange-100 hover:bg-orange-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-200 p-2.5 rounded-md">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-sm">Pending Payouts </h3>
                    <span className="font-semibold text-red-600 tracking-tight">
                      {outstandingAmount}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="text-gray-500 text-xs">Requires attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner Information & Quick Actions */}
      <div className="gap-4 grid md:grid-cols-3">
        <Card className="relative md:col-span-2 bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              Owner Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="gap-4 grid grid-cols-2">
              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <p className="font-medium text-muted-foreground text-sm">
                  Full Name
                </p>
                <p className="font-semibold text-sm">
                  {owner.first_name} {owner.last_name}
                </p>
              </div>
              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <p className="font-medium text-muted-foreground text-sm">
                  Email
                </p>
                <p className="text-sm">{owner.email}</p>
              </div>
              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <p className="font-medium text-muted-foreground text-sm">
                  Phone
                </p>
                <p className="text-sm">{owner.phone || "Not provided"}</p>
              </div>
              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <p className="font-medium text-muted-foreground text-sm">
                  Member Since
                </p>
                <p className="text-sm">{owner.created_at}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="bg-green-100 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              Portfolio Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">Occupancy Rate</span>
                  <span className="font-semibold text-green-600 text-sm">
                    {Math.round(parseFloat(occupancyRate))}%
                  </span>
                </div>
                <Progress
                  value={Math.round(parseFloat(occupancyRate))}
                  className="h-2"
                />
              </div>

              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <div className="flex flex-col items-start gap-2">
                  <span className="font-medium text-sm">
                    Monthly Service Cost
                  </span>
                  <span className="font-semibold text-blue-600 text-sm">
                    {totalServiceCost}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50/50 hover:bg-gray-100/50 p-3 rounded-lg transition-colors duration-200">
                <div className="flex flex-col items-start gap-2">
                  <span className="font-medium text-sm">
                    Monthly Management Cost
                  </span>
                  <span className="font-semibold text-purple-600 text-sm">
                    {totalManagementCost}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerOverview;
