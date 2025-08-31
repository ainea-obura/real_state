"use client";

import { FileText } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { PermissionGate } from '@/components/PermissionGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Header } from '../clients/tabs/components';
import { AlertsPanel } from './components/AlertsPanel';
import { DashboardStats } from './components/DashboardStats';
import FinanceSummary from './components/FinanceSummary';
import { RecentTransactions } from './components/RecentTransactions';

const Dashboard = () => {
  const { data: session } = useSession();
  console.log(session);
  return (
    <PermissionGate codename="view_dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Header
            title="Dashboard"
            description={`Welcome back, <span class="font-bold">
              ${
                session?.user?.full_name || session?.user?.username || "User"
              }</span>
            ! Here's what's happening with your properties.`}
          />
        </div>

        {/* Stats Cards - Operational Metrics */}
        <DashboardStats />

        {/* Charts Row */}
        <FinanceSummary />

        {/* Bottom Row */}
        <div className="gap-6 grid md:grid-cols-3 mt-10">
          {/* Recent Transactions */}
          <Card className="relative md:col-span-2 bg-transparent shadow-none border overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-indigo-200 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Latest invoices, payments, and expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTransactions />
            </CardContent>
          </Card>

          {/* Property Performance & Alerts */}
          <div className="space-y-6 w-full h-full">
            <AlertsPanel />
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};

export default Dashboard;
