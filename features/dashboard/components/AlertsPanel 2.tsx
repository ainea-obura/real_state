"use client";
import { AlertTriangle, Building2, Clock, DollarSign } from 'lucide-react';

import { fetchAlerts } from '@/actions/dahsboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export const AlertsPanel = () => {
  const {
    data: alertsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
  });

  const alerts = alertsData?.data?.alerts || [];

  // Show loading state
  if (isLoading) {
    return (
      <Card className="relative bg-transparent shadow-none border h-full overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-red-200 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            Penalties & Alerts
          </CardTitle>
          <CardDescription>
            Recent penalties, overdue payments, and important alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-pink-100/50 p-3 rounded-lg"
            >
              <div className="bg-gray-200 p-1.5 rounded-lg animate-pulse">
                <div className="bg-gray-300 rounded w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-gray-200 rounded w-32 h-4 animate-pulse" />
                  <div className="bg-gray-200 rounded w-16 h-5 animate-pulse" />
                </div>
                <div className="bg-gray-200 mb-2 rounded w-48 h-3 animate-pulse" />
                <div className="flex justify-between items-center">
                  <div className="bg-gray-200 rounded w-20 h-3 animate-pulse" />
                  <div className="bg-gray-200 rounded w-12 h-6 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="relative bg-red-50 shadow-none border-red-200 h-full overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-red-200 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            Penalties & Alerts
          </CardTitle>
          <CardDescription>
            Recent penalties, overdue payments, and important alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-medium">Error loading alerts</h3>
              <p className="text-red-600 text-sm">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!alerts || alerts.length === 0) {
    return (
      <Card className="relative bg-gray-50 shadow-none border-gray-200 h-full overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-gray-200 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
            Penalties & Alerts
          </CardTitle>
          <CardDescription>
            Recent penalties, overdue payments, and important alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-gray-700">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-medium">No alerts available</h3>
              <p className="text-gray-600 text-sm">
                All caught up! No pending penalties or overdue invoices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "penalty":
        return DollarSign;
      case "overdue_invoice":
        return DollarSign;
      case "maintenance":
        return Building2;
      case "expiring":
        return Clock;
      case "payment":
        return DollarSign;
      default:
        return AlertTriangle;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="relative bg-transparent shadow-none border h-full overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-red-200 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          Penalties & Alerts
        </CardTitle>
        <CardDescription>
          Recent penalties, overdue payments, and important alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const IconComponent = getTypeIcon(alert.type);

          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 bg-pink-100/50 hover:bg-pink-200/50 p-3 rounded-lg transition-colors"
            >
              <div className="bg-red-100 p-1.5 rounded-lg">
                <IconComponent className="w-4 h-4 text-red-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{alert.title}</span>
                  <Badge className={getPriorityColor(alert.priority)}>
                    {alert.priority}
                  </Badge>
                  {alert.count > 1 && (
                    <Badge variant="secondary">{alert.count}</Badge>
                  )}
                </div>
                <p className="mb-2 text-gray-600 text-xs">
                  {alert.description}
                </p>
                {(alert.tenant_name || alert.property_name) && (
                  <p className="mb-1 text-gray-500 text-xs">
                    {alert.tenant_name && (
                      <span>Tenant: {alert.tenant_name}</span>
                    )}
                    {alert.tenant_name && alert.property_name && (
                      <span> • </span>
                    )}
                    {alert.property_name && <span>{alert.property_name}</span>}
                  </p>
                )}
                {alert.amount && (
                  <p className="mb-1 font-medium text-gray-700 text-xs">
                    Amount: {alert.amount}
                  </p>
                )}
                {alert.days_overdue && (
                  <p className="mb-1 font-medium text-red-600 text-xs">
                    {alert.days_overdue} days overdue
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">
                    {formatDate(alert.date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
