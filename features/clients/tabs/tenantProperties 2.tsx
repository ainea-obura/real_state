import { format } from 'date-fns';
import { Building2, Calendar, CheckCircle, Clock, Coins, Euro, Globe, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import Header from './components/Header';

interface TenantPropertiesProps {
  property_assignments: Array<{
    id: string;
    node: {
      id: string;
      name: string;
      node_type: string;
      parent?: { id: string; name: string } | null;
    };
    floor?: string;
    block?: string;
    contract_start: string;
    contract_end?: string;
    rent_amount: string;
    currency: string;
    created_at: string;
  }>;
  tenantId: string;
  propertyAssignmentStats?: {
    error: boolean;
    message?: string;
    data?: {
      uniqueProperties: number;
      longestTenure: string;
      leaseRenewals: number;
      mostRecentStart: string;
    };
  };
  isStatsLoading?: boolean;
  statsError?: unknown;
}

const TenantProperties = ({
  property_assignments,
  propertyAssignmentStats,
  isStatsLoading,
}: TenantPropertiesProps) => {
  // --- Unique Tenant Property Stat Cards ---
  const uniqueProperties =
    propertyAssignmentStats?.data?.uniqueProperties ?? "-";
  const longestTenure = propertyAssignmentStats?.data?.longestTenure ?? "-";
  const leaseRenewals = propertyAssignmentStats?.data?.leaseRenewals ?? "-";
  const mostRecentStart = propertyAssignmentStats?.data?.mostRecentStart ?? "-";

  const uniqueStatCards = [
    {
      label: "Unique Properties",
      value: isStatsLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        uniqueProperties
      ),
      icon: <MapPin className="w-7 h-7 text-primary" />,
      bg: "bg-gradient-to-tr from-primary/10 to-primary/5",
      iconBg: "bg-primary/10 bg-opacity-30",
      valueClass: "text-primary",
      subtitle: "Total unique properties ever assigned",
    },
    {
      label: "Longest Tenure",
      value: isStatsLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        longestTenure
      ),
      icon: <Clock className="w-7 h-7 text-green-600" />,
      bg: "bg-gradient-to-tr from-green-100 to-green-50",
      iconBg: "bg-green-100 bg-opacity-30",
      valueClass: "text-green-700",
      subtitle: "Longest continuous stay in one property",
    },
    {
      label: "Lease Renewals",
      value: isStatsLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        leaseRenewals
      ),
      icon: <CheckCircle className="w-7 h-7 text-blue-600" />,
      bg: "bg-gradient-to-tr from-blue-100 to-blue-50",
      iconBg: "bg-blue-100 bg-opacity-30",
      valueClass: "text-blue-700",
      subtitle: "Total lease renewals across all properties",
    },
    {
      label: "Recent Assignment",
      value: isStatsLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        mostRecentStart
      ),
      icon: <Calendar className="w-7 h-7 text-orange-600" />,
      bg: "bg-gradient-to-tr from-orange-100 to-orange-50",
      iconBg: "bg-orange-100 bg-opacity-30",
      valueClass: "text-orange-700",
      subtitle: "Start date of latest property assignment",
    },
  ];

  const getContractStatus = (contractEnd?: string) => {
    if (!contractEnd)
      return { status: "Active", color: "text-green-600", bg: "bg-green-100" };

    const endDate = new Date(contractEnd);
    const today = new Date();

    if (endDate < today) {
      return { status: "Expired", color: "text-red-600", bg: "bg-red-100" };
    } else if (endDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) {
      return {
        status: "Expiring Soon",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    } else {
      return { status: "Active", color: "text-green-600", bg: "bg-green-100" };
    }
  };

  // Helper for formatting currency - display as-is from backend
  const formatCurrency = (amount: string) => {
    if (!amount) return "-";
    return amount;
  };

  // Helper for currency icon
  const getCurrencyIcon = (currency: string) => {
    const code = currency?.toUpperCase();
    switch (code) {
      case "USD":
        return (
          <Coins className="w-4 h-4 text-green-500" aria-label="US Dollar" />
        );
      case "EUR":
        return <Euro className="w-4 h-4 text-blue-500" aria-label="Euro" />;
      case "KE":
      case "KES":
        return (
          <Globe
            className="w-4 h-4 text-yellow-500"
            aria-label="Kenyan Shilling"
          />
        );
      default:
        return (
          <Globe className="w-4 h-4 text-gray-400" aria-label="Currency" />
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Header
        title="Property Assignments"
        description="Properties currently assigned to this tenant"
      />
      {/* Redesigned Unique Tenant Property Stat Cards */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4 mb-6">
        {uniqueStatCards.map((card, idx) => (
          <div
            key={idx}
            className={`relative ${card.bg} shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out rounded-xl`}
          >
            <div className="flex flex-col justify-between gap-3 p-6 h-full">
              <div className="flex items-center gap-4 mb-2">
                <div
                  className={`p-3 rounded-lg ${card.iconBg} shadow-sm flex-shrink-0`}
                >
                  {card.icon}
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 font-medium text-[11px] text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </span>
                  <span
                    className={`$${
                      String(card.value).length > 8 ? "text-xl" : "text-3xl"
                    } font-bold ${card.valueClass} whitespace-nowrap`}
                  >
                    {card.value}
                  </span>
                </div>
              </div>
              <span className="block mt-2 text-gray-500 text-xs">
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>
      {property_assignments.length === 0 ? (
        <div className="py-12 text-center">
          <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100 text-lg">
            No Property Assignments
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This tenant is not currently assigned to any properties.
          </p>
        </div>
      ) : (
        <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {property_assignments.map((assignment) => {
            const contractStatus = getContractStatus(assignment.contract_end);
            let borderColor = "border-green-500";
            if (contractStatus.status === "Expired") {
              borderColor = "border-red-500";
            } else if (contractStatus.status === "Expiring Soon") {
              borderColor = "border-orange-500";
            }
            return (
              <div
                key={assignment.id}
                className={`relative bg-white dark:bg-gray-800 shadow-none border-l ${borderColor} border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out`}
              >
                <div className="flex flex-col gap-3 p-4">
                  {/* Property Info */}
                  <div className="flex items-center gap-3 mb-1">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {assignment.node.name}
                    </span>
                    <Badge className="bg-blue-100 dark:bg-blue-900 ml-2 font-medium text-blue-800 dark:text-blue-300 text-xs">
                      {assignment.node.node_type}
                    </Badge>
                  </div>
                  {assignment.node.parent && (
                    <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs">
                      <MapPin className="w-4 h-4" />
                      <span>{assignment.node.parent?.name ?? ""}</span>
                    </div>
                  )}
                  {/* Hirarchy*/}
                  {/* {assignment.node.node_type == "UNIT" &&
                    assignment.node.parent && (
                      <div>
                        <span>
                          {assignment.node.parent?.name ?? ""} /{" "}
                          {assignment.node.name}
                        </span>
                      </div>
                    )} */}

                  {/* Contract Info */}
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Allocated</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                        {format(
                          new Date(assignment.contract_start),
                          "MMM dd, yyyy"
                        )}
                      </span>
                    </div>
                    {assignment.contract_end && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Ends</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                          {format(
                            new Date(assignment.contract_end),
                            "MMM dd, yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Status</span>
                      <span
                        className={`ml-1 font-semibold ${contractStatus.color}`}
                      >
                        {contractStatus.status}
                      </span>
                    </div>
                  </div>
                  {/* Financial Info */}
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Coins className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Rent</span>
                    <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(assignment.rent_amount)}
                    </span>
                    {getCurrencyIcon(assignment.currency)}
                  </div>
                  {/* Apartment Details (optional, placeholder) */}
                  {/* <div className="flex flex-col gap-1 mt-2 text-muted-foreground text-xs">
                    <span className="text-gray-400 italic">
                      Apartment details not available
                    </span>
                  </div> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TenantProperties;
