import { format } from 'date-fns';
import { useAtom } from 'jotai';
import {
    AlertCircle, Calendar, CheckCircle, Clock, Coins, Edit, FileText, Receipt, TrendingDown,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { getTenantFinanceSummary } from '@/actions/clients/tenantDashboard';
import { DateRangePicker } from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { isTenantModelOpen, selectedTenantAtom } from '@/store';
import { useQuery } from '@tanstack/react-query';

const TenantBills = ({ tenantId }: { tenantId: string }) => {
  // Date range state
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateRange, setDateRange] = useState({
    from: firstDayOfMonth,
    to: today,
  });

  // Jotai hooks MUST be at the top level
  const [isEditOpen, setIsEditOpen] = useAtom(isTenantModelOpen);
  const [selectedTenant, setSelectedTenant] = useAtom(selectedTenantAtom);

  // Fetch data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenantFinanceSummary", tenantId],
    queryFn: () => getTenantFinanceSummary(tenantId),
    enabled: !!tenantId,
  });

  // Tenant Info Card should always show if selectedTenant.data exists
  const tenantInfoCard = selectedTenant.data && (
    <Card className="bg-primary/5 shadow-none mb-4 px-6 py-5 border border-primary/20 rounded-xl w-full">
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-primary text-lg">
          Tenant Information
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="group bg-primary/20 hover:bg-primary p-0 border-primary/30 rounded-full w-8 h-8 hover:text-white"
          onClick={() => {
            setSelectedTenant({ data: selectedTenant.data, error: false });
            setIsEditOpen(true);
          }}
          aria-label="Edit Tenant"
        >
          <Edit className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
        </Button>
      </div>
      <div className="gap-x-8 gap-y-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Name
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.first_name} {selectedTenant.data.last_name}
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Email
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.email}
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Phone
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.phone || "N/A"}
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Gender
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.gender}
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Status
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.is_tenant_verified
              ? "Verified"
              : "Not Verified"}
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-medium text-muted-foreground text-xs">
            Created
          </div>
          <div className="text-[1.05rem] text-gray-900 dark:text-white">
            {selectedTenant.data.created_at
              ? new Date(selectedTenant.data.created_at).toLocaleDateString()
              : "N/A"}
          </div>
        </div>
      </div>
      <Separator className="bg-secondary/20 my-4" />
    </Card>
  );

  // Loading skeletons
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        {tenantInfoCard}
        <div className="bg-gray-200 mb-2 rounded w-1/3 h-8" />
        <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-gray-100 h-24" />
          ))}
        </div>
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-40" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  function isErrorResponse(
    data: any
  ): data is { error: true; message: string } {
    return (
      !!data &&
      typeof data === "object" &&
      "error" in data &&
      data.error === true
    );
  }

  if (isError || !data || isErrorResponse(data)) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-500">
        {tenantInfoCard}
        <AlertCircle className="mb-2 w-8 h-8" />
        <span>No finance summary available for this tenant.</span>
      </div>
    );
  }

  // Destructure API data
  const stats = data.stats;
  const lease = data.lease;
  const penalties = data.penalties || [];
  const invoices = data.recent_invoices || [];
  const payments = data.recent_payments || [];
  const billHealthScore = data.bill_health_score ?? 0;

  // Stat cards config (8 cards)
  const statCards = [
    {
      icon: FileText,
      title: "Total Billed",
      value: stats.total_billed,
      bg: "bg-primary/5 hover:bg-primary/10",
      iconBg: "bg-primary/10",
      valueClass: "text-primary",
      description: "All invoices issued",
    },
    {
      icon: Coins,
      title: "Total Paid",
      value: stats.total_paid,
      bg: "bg-green-50 hover:bg-green-100",
      iconBg: "bg-green-100",
      valueClass: "text-green-600",
      description: "All payments received",
    },
    {
      icon: AlertCircle,
      title: "Outstanding",
      value: stats.outstanding,
      bg: "bg-orange-100 hover:bg-orange-100",
      iconBg: "bg-orange-200",
      valueClass: "text-orange-600",
      description: "Current unpaid balance",
    },
    {
      icon: XCircle,
      title: "Overdue",
      value: stats.overdue,
      bg: "bg-red-50 hover:bg-red-100",
      iconBg: "bg-red-100",
      valueClass: "text-red-600",
      description: "Past due bills",
    },
    {
      icon: CheckCircle,
      title: "Paid Invoices",
      value: stats.paid_invoices,
      bg: "bg-blue-100 hover:bg-blue-100",
      iconBg: "bg-blue-200",
      valueClass: "text-blue-600",
      description: "Fully paid bills",
    },
    {
      icon: AlertCircle,
      title: "Overdue Invoices",
      value: stats.overdue_invoices,
      bg: "bg-yellow-100 hover:bg-yellow-100",
      iconBg: "bg-yellow-200",
      valueClass: "text-yellow-600",
      description: "Invoices overdue",
    },
    {
      icon: TrendingDown,
      title: "Penalties",
      value: stats.penalties,
      bg: "bg-red-50 hover:bg-red-100",
      iconBg: "bg-red-100",
      valueClass: "text-red-600",
      description: "Total penalties applied",
    },
    {
      icon: Clock,
      title: "Avg. Payment Delay",
      value: `${stats.avg_payment_delay} days`,
      bg: "bg-gray-50 hover:bg-gray-100",
      iconBg: "bg-gray-200",
      valueClass: "text-gray-700",
      description: "Average days late",
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 dark:text-gray-100 text-2xl">
              Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Full financial summary, bills, payments, and penalties for this
              tenant.
            </p>
          </div>
          <div>
            <div className="hidden">
              <DateRangePicker
                initialDateFrom={dateRange.from}
                initialDateTo={dateRange.to}
                onUpdate={({ range }) =>
                  setDateRange({
                    from: range.from,
                    to: range.to ?? today,
                  })
                }
                showCompare={false}
              />
            </div>
          </div>
        </div>
        {/* Tenant Info Section */}
        {selectedTenant.data && (
          <Card className="bg-primary/5 shadow-none mb-4 px-6 py-5 border border-primary/20 rounded-xl w-full">
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-primary text-lg">
                Tenant Information
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="group bg-primary/20 hover:bg-primary p-0 border-primary/30 rounded-full w-8 h-8 hover:text-white"
                onClick={() => {
                  setSelectedTenant({
                    data: selectedTenant.data,
                    error: false,
                  });
                  setIsEditOpen(true);
                }}
                aria-label="Edit Tenant"
              >
                <Edit className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
              </Button>
            </div>
            <div className="gap-x-8 gap-y-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Name
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.first_name}{" "}
                  {selectedTenant.data.last_name}
                </div>
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Email
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.email}
                </div>
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Phone
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.phone || "N/A"}
                </div>
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Gender
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.gender}
                </div>
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Status
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.is_tenant_verified
                    ? "Verified"
                    : "Not Verified"}
                </div>
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground text-xs">
                  Created
                </div>
                <div className="text-[1.05rem] text-gray-900 dark:text-white">
                  {selectedTenant.data.created_at
                    ? new Date(
                        selectedTenant.data.created_at
                      ).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>
            </div>
            <Separator className="bg-secondary/20 my-4" />
          </Card>
        )}
      </div>

      {/* Stat Cards */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => (
          <Card
            key={idx}
            className={`relative ${card.bg} shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`${card.iconBg} p-2.5 rounded-md`}>
                      <card.icon className={`w-5 h-5 ${card.valueClass}`} />
                    </div>
                    <div className="flex flex-col justify-between items-start">
                      <h3 className="font-medium text-sm">{card.title}</h3>
                      <span
                        className={`text-2xl font-semibold tracking-tight ${card.valueClass}`}
                      >
                        {card.value}
                      </span>
                    </div>
                  </div>
                </div>
                {card.description && (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-gray-500 text-xs">{card.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mt-2">
        {/* Lease Summary */}
        <div className="relative flex flex-col gap-2 bg-gradient-to-br from-primary/5 dark:from-primary/10 to-white dark:to-card p-6 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
          <FileText className="z-10 w-5 h-5 text-primary" />
          <div className="right-2 bottom-2 absolute opacity-10 text-primary/70 pointer-events-none select-none">
            <FileText className="w-20 h-20" />
          </div>
          <span className="mt-2 font-bold text-lg">Lease Summary</span>
          <div>
            <span className="font-semibold">Unit:</span> {lease.unit} (
            {lease.property})
          </div>
          <div>
            <span className="font-semibold">Rent:</span> {lease.rent}{" "}
            {lease.currency}
          </div>
          <div>
            <span className="font-semibold">Deposit:</span> {lease.deposit}{" "}
            {lease.currency}
          </div>
          <div>
            <span className="font-semibold">Contract:</span>{" "}
            {format(new Date(lease.contract_start), "MMM dd, yyyy")} -{" "}
            {format(new Date(lease.contract_end), "MMM dd, yyyy")}
          </div>
        </div>
        {/* Penalties */}
        <div className="relative flex flex-col gap-2 bg-gradient-to-br from-red-50 dark:from-red-900/10 to-white dark:to-card p-6 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
          <TrendingDown className="z-10 w-5 h-5 text-red-500" />
          <div className="right-2 bottom-2 absolute opacity-10 text-red-500/70 pointer-events-none select-none">
            <TrendingDown className="w-20 h-20" />
          </div>
          <span className="mt-2 font-bold text-lg">Penalties</span>
          {penalties.length === 0 ? (
            <div className="text-gray-500">No penalties</div>
          ) : (
            <ul className="space-y-2">
              {penalties.map((p: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className={`font-semibold ${
                      p.status === "Pending" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {p.type}
                  </span>
                  <span>{p.amount}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      p.status === "Pending"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="ml-auto text-gray-500 text-xs">
                    Due: {format(new Date(p.due), "MMM dd, yyyy")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Bill Health */}
        <div className="relative flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 dark:from-blue-900/10 to-white dark:to-card p-6 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
          <Clock className="top-6 left-6 z-10 absolute w-5 h-5 text-blue-500" />
          <div className="right-2 bottom-2 absolute opacity-10 text-blue-500/70 pointer-events-none select-none">
            <Clock className="w-20 h-20" />
          </div>
          <span className="mt-2 font-bold text-lg">Bill Health</span>
          <svg width="80" height="80" viewBox="0 0 80 80" className="my-2">
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="#3b82f6"
              strokeWidth="8"
              fill="none"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - billHealthScore / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s" }}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dy=".3em"
              fontSize="1.6em"
              className="fill-primary font-bold tabular-nums"
            >
              {billHealthScore}
            </text>
          </svg>
          <span className="mt-1 font-semibold text-primary text-xs">
            Based on payment timeliness & outstanding
          </span>
        </div>
        {/* Recent Invoices */}
        <div className="relative flex flex-col gap-2 bg-gradient-to-br from-yellow-50 dark:from-yellow-900/10 to-white dark:to-card p-6 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
          <Receipt className="z-10 w-5 h-5 text-yellow-500" />
          <div className="right-2 bottom-2 absolute opacity-10 text-yellow-400/70 pointer-events-none select-none">
            <Receipt className="w-20 h-20" />
          </div>
          <span className="mt-2 font-bold text-lg">Recent Invoices</span>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.map((inv: any, i: number) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <span className="font-mono font-semibold">{inv.number}</span>
                <span className="font-semibold text-blue-700 text-xs uppercase tracking-wide">
                  {inv.type}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    inv.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : inv.status === "OVERDUE"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {inv.status}
                </span>
                <span className="ml-auto font-bold">{inv.amount}</span>
                <span className="ml-2 text-gray-500 text-xs">
                  Due: {format(new Date(inv.due), "MMM dd, yyyy")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Recent Payments */}
        <div className="relative flex flex-col gap-2 col-span-2 bg-gradient-to-br from-green-50 dark:from-green-900/10 to-white dark:to-card p-6 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
          <Coins className="z-10 w-5 h-5 text-green-600" />
          <div className="right-2 bottom-2 absolute opacity-10 text-green-400/70 pointer-events-none select-none">
            <Coins className="w-20 h-20" />
          </div>
          <span className="mt-2 font-bold text-lg">Recent Payments</span>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {payments.map((pay: any, i: number) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <span className="font-mono">{pay.ref}</span>
                <span className="font-bold">{pay.amount}</span>
                <span className="text-gray-500 text-xs">
                  {format(new Date(pay.date), "MMM dd, yyyy")}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    pay.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {pay.status}
                </span>
                <span className="ml-auto text-gray-500 text-xs">
                  {pay.method}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TenantBills;
