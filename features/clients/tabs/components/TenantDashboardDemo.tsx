"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  mockTenantDashboardData, 
  mockEmptyTenantDashboardData,
  mockErrorTenantDashboardData,
  generateMockTenantData,
  generateMockPropertyData,
  generateMockPaymentData
} from "./mockData";

import TenantOverview from "../tenantOverview";
import TenantProperties from "../tenantProperties";
import TenantBills from "../tenantBills";
import TenantDocuments from "../tenantDocuments";
import type { TenantDashboardResponse } from "../schema/tenantDashboard";

const TenantDashboardDemo = () => {
  const [currentData, setCurrentData] = useState<TenantDashboardResponse>(mockTenantDashboardData);
  const [activeTab, setActiveTab] = useState("overview");

  const demoScenarios = [
    {
      name: "Full Data",
      description: "Complete tenant dashboard with all data",
      data: mockTenantDashboardData,
      badge: "Complete",
    },
    {
      name: "Empty State",
      description: "Tenant with no assignments, payments, or documents",
      data: mockEmptyTenantDashboardData,
      badge: "Empty",
    },
    {
      name: "Error State",
      description: "Simulated error response",
      data: mockErrorTenantDashboardData,
      badge: "Error",
    },
    {
      name: "Custom Tenant",
      description: "Tenant with custom information",
      data: generateMockTenantData({
        first_name: "Alice",
        last_name: "Johnson",
        email: "alice.johnson@example.com",
        phone: "+1 (555) 999-8888",
        gender: "Female",
        is_tenant_verified: false,
      }),
      badge: "Custom",
    },
    {
      name: "Single Property",
      description: "Tenant with only one property assignment",
      data: generateMockPropertyData([
        {
          id: "123e4567-e89b-12d3-a456-426614174001",
          node: {
            id: "123e4567-e89b-12d3-a456-426614174002",
            name: "Studio Apartment 301",
            node_type: "UNIT",
            parent: {
              id: "123e4567-e89b-12d3-a456-426614174003",
              name: "Urban Heights",
            },
          },
          contract_start: "2024-01-01",
          contract_end: "2024-12-31",
          rent_amount: 1800,
          currency: "USD",
          created_at: "2023-12-15T10:00:00Z",
        },
      ]),
      badge: "Single",
    },
    {
      name: "High Payments",
      description: "Tenant with extensive payment history",
      data: generateMockPaymentData([
        {
          id: "123e4567-e89b-12d3-a456-426614174007",
          payment_type: "TENANT_TO_COMPANY",
          amount: 5000,
          currency: "USD",
          method: "Bank Transfer",
          reference: "PAY-20240101-9999",
          status: "COMPLETED",
          payment_date: "2024-01-01T10:00:00Z",
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "123e4567-e89b-12d3-a456-426614174008",
          payment_type: "TENANT_TO_COMPANY",
          amount: 7500,
          currency: "USD",
          method: "Credit Card",
          reference: "PAY-20231201-8888",
          status: "COMPLETED",
          payment_date: "2023-12-01T14:30:00Z",
          created_at: "2023-12-01T14:30:00Z",
        },
      ]),
      badge: "High",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <TenantOverview dashboardData={currentData} />;
      case "properties":
        return <TenantProperties dashboardData={currentData} />;
      case "bills":
        return <TenantBills dashboardData={currentData} />;
      case "documents":
        return <TenantDocuments dashboardData={currentData} />;
      default:
        return <TenantOverview dashboardData={currentData} />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Demo Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Tenant Dashboard Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive demonstration of the tenant dashboard with various data scenarios
        </p>
      </div>

      {/* Scenario Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Scenarios</CardTitle>
          <CardDescription>
            Select different scenarios to see how the dashboard handles various data states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoScenarios.map((scenario, index) => (
              <Card 
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentData === scenario.data ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setCurrentData(scenario.data)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {scenario.name}
                    </h3>
                    <Badge variant={scenario.badge === "Error" ? "destructive" : "secondary"}>
                      {scenario.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {scenario.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Scenario Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {demoScenarios.find(s => s.data === currentData)?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {demoScenarios.find(s => s.data === currentData)?.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tenant</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {currentData.data.tenant.first_name} {currentData.data.tenant.last_name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Dashboard</CardTitle>
          <CardDescription>
            Interactive dashboard with all tenant information and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="bills">Bills</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-6">
              {renderTabContent()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>
            Overview of the current scenario's data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {currentData.data.property_assignments.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Properties</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {currentData.data.payments.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Payments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {currentData.data.invoices.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {currentData.data.documents.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantDashboardDemo; 