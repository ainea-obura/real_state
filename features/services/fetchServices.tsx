"use client";

import {
  BarChart3,
  Calculator,
  Edit,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { getServices } from "@/actions/services";
import SideBarCard from "@/components/sideBarCard";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ServiceResponse,
  ServicesListResponse,
} from "@/features/services/schema/serviceSchema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PermissionGate } from "@/components/PermissionGate";
import Header from "../clients/tabs/components/Header";
import AttachServiceModal from "../projects/profile/tabs/Components/service/attachService";
import AddServiceModal from "./addServicesModel";

const FetchServices = () => {
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [isAttachServiceModalOpen, setIsAttachServiceModalOpen] =
    useState(false);
  const [selectedService, setSelectedService] =
    useState<ServiceResponse | null>(null);
  const queryClient = useQueryClient();

  // Fetch services from backend
  const {
    data: servicesData,
    isLoading,
    isError,
  } = useQuery<ServicesListResponse>({
    queryKey: ["services"],
    queryFn: () => getServices({ page: 1, pageSize: 50 }),
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false, // Disable automatic refetching
  });

  // Check for error in the response data
  const errorMessage = servicesData && servicesData.isError ? (servicesData.message || "Failed to fetch services") : null;

  // Sort services by created_at in descending order (newest first) for consistent ordering
  // This ensures services are always displayed in the same order regardless of cache updates
  // Newest services appear first, maintaining consistent UI layout
  // Sorting priority: created_at (desc) -> name (asc) -> id (asc) for guaranteed consistency
  const services: ServiceResponse[] = useMemo(() => {
    // Return empty array if there's an error in the response
    if (servicesData && servicesData.isError) {
      return [];
    }
    
    return (servicesData?.data.results || []).sort((a, b) => {
      try {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();

        // If dates are equal, sort by name for consistent ordering
        if (dateA === dateB) {
          const nameComparison = a.name.localeCompare(b.name);
          // If names are also equal, sort by ID for guaranteed unique ordering
          if (nameComparison === 0) {
            return a.id.localeCompare(b.id);
          }
          return nameComparison;
        }

        return dateB - dateA; // Descending order (newest first)
      } catch (error) {
        // Fallback to string comparison if date parsing fails
        
        return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [servicesData?.data.results]);

  // Calculate stats by service type
  const fixedServices = services.filter((s) => s.pricing_type === "FIXED");
  const percentageServices = services.filter(
    (s) => s.pricing_type === "PERCENTAGE"
  );
  const variableServices = services.filter(
    (s) => s.pricing_type === "VARIABLE"
  );

  const calculateStats = (services: ServiceResponse[]) => {
    return {
      count: services.length,
      properties: services.reduce(
        (sum, s) => sum + (s.total_properties || 0),
        0
      ),
    };
  };

  const allStats = calculateStats(services);
  const fixedStats = calculateStats(fixedServices);
  const percentageStats = calculateStats(percentageServices);
  const variableStats = calculateStats(variableServices);

  const getPricingTypeColor = (type: string) => {
    switch (type) {
      case "FIXED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "VARIABLE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "PERCENTAGE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "MONTHLY":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "WEEKLY":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "ONE_TIME":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatCurrency = (amount: string | null, currency: string = "USD") => {
    if (!amount) return "N/A";

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(Number(amount));
    } catch (error) {
      // Fallback to simple formatting if currency code is not supported
      
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbolMap: Record<string, string> = {
      USD: "$",
      EUR: "€",
      KSH: "KSh",
    };
    return symbolMap[currency] || currency;
  };

  const formatPercentage = (rate: string | null) => {
    if (!rate) return "N/A";
    return `${rate}%`;
  };

  const getPricingDisplay = (service: ServiceResponse) => {
    switch (service.pricing_type) {
      case "FIXED":
        return service.base_price
          ? formatCurrency(service.base_price, service.symbol)
          : "N/A";
      case "VARIABLE":
        return "N/A";
      case "PERCENTAGE":
        return service.percentage_rate
          ? formatPercentage(service.percentage_rate)
          : "N/A";
      default:
        return "N/A";
    }
  };

  const handleAddService = async () => {
    // Invalidate and refetch services cache to show new data instantly
    await queryClient.invalidateQueries({ queryKey: ["services"] });
    
  };

  const handleEditService = async () => {
    // Invalidate and refetch services cache to show updated data instantly
    await queryClient.invalidateQueries({ queryKey: ["services"] });
    
  };

  const handleOpenAddServiceModal = () => {
    setIsAddServiceModalOpen(true);
  };

  const handleCloseAddServiceModal = () => {
    setIsAddServiceModalOpen(false);
  };

  const handleOpenEditServiceModal = (service: ServiceResponse) => {
    setSelectedService(service);
    setIsEditServiceModalOpen(true);
  };

  const handleCloseEditServiceModal = () => {
    setSelectedService(null);
    setIsEditServiceModalOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header
          title="Services Management"
          description="Manage your property services, pricing, and performance"
        >
          <TooltipProvider>
            <div className="flex gap-2 items-center">
              <Tooltip>
                <PermissionGate codename="add_service" showFallback={false}>
                <TooltipTrigger
                  className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
                  onClick={handleOpenAddServiceModal}
                >
                  <Plus className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Create New Service</span>
                </TooltipTrigger>
                </PermissionGate>
                <TooltipContent>
                  <p>Add Service</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white">
                  <Users className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Assign To Properties</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign To Properties</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white">
                  <Settings className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Bulk Operations</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bulk Operations</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </Header>

        {/* Loading Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-lg border animate-pulse bg-background border-border"
            >
              <div className="flex gap-3 items-center mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted"></div>
                <div className="flex-1">
                  <div className="mb-2 w-24 h-4 rounded bg-muted"></div>
                  <div className="w-16 h-3 rounded bg-muted"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Service Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-lg border animate-pulse bg-background border-border"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex gap-2 items-start mb-2">
                    <div className="w-8 h-8 rounded-lg bg-muted"></div>
                    <div className="flex-1">
                      <div className="mb-2 w-32 h-5 rounded bg-muted"></div>
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-muted"></div>
                        <div className="w-16 h-3 rounded bg-muted"></div>
                        <div className="w-16 h-4 rounded bg-muted"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 w-full h-4 rounded bg-muted"></div>
                  <div className="w-24 h-3 rounded bg-muted"></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted"></div>
              </div>

              {/* Properties Count */}
              <div className="p-4 mb-4 rounded-lg border bg-muted/50 border-muted">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <div className="w-4 h-4 rounded bg-muted"></div>
                    <div className="w-24 h-4 rounded bg-muted"></div>
                  </div>
                  <div className="w-8 h-6 rounded bg-muted"></div>
                </div>
              </div>

              {/* Pricing Structure */}
              <div className="p-4 mb-3 rounded-lg border bg-muted/50 border-muted">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2 items-center">
                    <div className="w-4 h-4 rounded bg-muted"></div>
                    <div className="w-28 h-4 rounded bg-muted"></div>
                  </div>
                  <div className="w-16 h-5 rounded bg-muted"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-12 h-3 rounded bg-muted"></div>
                  <div className="w-16 h-5 rounded bg-muted"></div>
                </div>
              </div>

              {/* Billing Schedule */}
              <div className="p-4 rounded-lg border bg-muted/50 border-muted">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2 items-center">
                    <div className="w-4 h-4 rounded bg-muted"></div>
                    <div className="w-28 h-4 rounded bg-muted"></div>
                  </div>
                  <div className="w-20 h-5 rounded bg-muted"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="w-16 h-3 rounded bg-muted"></div>
                  <div className="w-12 h-4 rounded bg-muted"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load services. Please try again.
      </div>
    );
  }

  // Empty state
  if (!services.length) {
    return (
      <div className="flex flex-col justify-center items-center w-full h-full">
        <div className="flex flex-col items-center w-full max-w-md">
          <Zap className="mb-4 w-12 h-12 text-primary" aria-hidden="true" />
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            No Services Found
          </h2>
          <p className="mb-6 text-center text-muted-foreground">
            You haven&apos;t added any services yet. Get started by creating
            your first service.
          </p>
          <PermissionGate codename="add_service" showFallback={false}>
          <button
            className="inline-flex gap-2 items-center px-6 py-2 h-11 font-semibold rounded-md shadow transition bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-primary-foreground"
            aria-label="Add Service"
            tabIndex={0}
            role="button"
            onClick={handleOpenAddServiceModal}
          >
            <Plus className="w-5 h-5" />
            Add Service
          </button>
          </PermissionGate>
        </div>
        <PermissionGate codename="add_service" showFallback={false}>
        <AddServiceModal
          isOpen={isAddServiceModalOpen}
          onClose={handleCloseAddServiceModal}
          onSubmit={handleAddService}
        />
        </PermissionGate>
      </div>
    );
  }

  return (
    <PermissionGate codename="view_service">
      <div className="space-y-6">
        <Header
          title="Services Management"
          description="Manage your property services, pricing, and performance"
        >
          <TooltipProvider>
            <div className="flex gap-2 items-center">
              <Tooltip>
                <PermissionGate codename="add_service" showFallback={false}>
                <TooltipTrigger
                  className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
                  onClick={handleOpenAddServiceModal}
                >
                  <Plus className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Create New Service</span>
                </TooltipTrigger>
                </PermissionGate>
                <TooltipContent>
                  <p>Add Service</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white"
                  onClick={() => setIsAttachServiceModalOpen(true)}
                >
                  <Users className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Assign To Properties</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign To Properties</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger className="flex justify-center items-center w-8 h-8 rounded-md transition-all duration-300 cursor-pointer group bg-primary/10 hover:bg-primary hover:text-white">
                  <Settings className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                  <span className="sr-only">Bulk Operations</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bulk Operations</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </Header>

        {/* Service Type Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SideBarCard
            icon={Zap}
            title="All Services"
            value={allStats.count.toString()}
            desc={`${allStats.properties} properties`}
          />
          <SideBarCard
            icon={Calculator}
            title="Fixed Price"
            value={fixedStats.count.toString()}
            desc={`${fixedStats.properties} properties`}
          />
          <SideBarCard
            icon={BarChart3}
            title="Percentage"
            value={percentageStats.count.toString()}
            desc={`${percentageStats.properties} properties`}
          />
          <SideBarCard
            icon={TrendingUp}
            title="Variable Price"
            value={variableStats.count.toString()}
            desc={`${variableStats.properties} properties`}
          />
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className="relative group">
              {/* Main Service Card */}
              <div
                className="flex flex-col p-6 border hover:border-primary/60 border-border rounded-md h-full hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                onClick={() => {
                  /* Only allow edit if user has edit_service permission */
                  // This will be handled by the edit icon below
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 items-start mb-2">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          service.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="mb-1 text-lg font-bold leading-tight text-foreground line-clamp-2">
                          {service.name}
                        </h3>
                        <div className="flex gap-2 items-center">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              service.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {service.is_active ? "Active" : "Inactive"}
                          </span>
                          {service.pricing_type === "VARIABLE" && (
                            <Badge
                              className={getPricingTypeColor(
                                service.pricing_type
                              )}
                            >
                              Variable
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                    <div className="flex gap-3 items-center">
                      <span className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(service.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Hover Edit Button */}
                  <div className="ml-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <TooltipProvider>
                      <Tooltip>
                        <PermissionGate codename="edit_service" showFallback={false}>
                        <TooltipTrigger className="flex justify-center items-center w-8 h-8 rounded-lg transition-all duration-300 cursor-pointer bg-primary/10 hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleOpenEditServiceModal(service)}
                        >
                          <Edit className="w-4 h-4 text-primary hover:text-white" />
                          <span className="sr-only hover:!text-white">
                            Edit Service
                          </span>
                        </TooltipTrigger>
                        </PermissionGate>
                        <TooltipContent>
                          <p>Edit Service</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Properties Count */}
                <div className="p-4 mb-4 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <Settings className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        Active Properties
                      </span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {service.total_properties}
                    </span>
                  </div>
                </div>

                {/* Enhanced Pricing & Billing Section */}
                <div className="flex-grow space-y-3">
                  {/* Pricing Structure */}
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-2 items-center">
                        <Calculator className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          Pricing Structure
                        </span>
                      </div>
                      <Badge
                        className={getPricingTypeColor(service.pricing_type)}
                      >
                        {service.pricing_type}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Amount
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-foreground">
                          {getPricingDisplay(service)}
                        </span>
                        {service.pricing_type === "FIXED" && (
                          <span className="text-xs text-muted-foreground">
                            Currency: {service.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Schedule */}
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-2 items-center">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          Billing Schedule
                        </span>
                      </div>
                      <Badge className={getFrequencyColor(service.frequency)}>
                        {service.frequency.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Billed To
                      </span>
                      <span className="font-semibold text-foreground">
                        {service.billed_to}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Service Modal */}
        <PermissionGate codename="add_service" showFallback={false}>
        <AddServiceModal
          isOpen={isAddServiceModalOpen}
          onClose={handleCloseAddServiceModal}
          onSubmit={handleAddService}
        />
        </PermissionGate>
        {/* Edit Service Modal */}
        {selectedService && (
          <PermissionGate codename="edit_service" showFallback={false}>
            <AddServiceModal
              isOpen={isEditServiceModalOpen}
              onClose={handleCloseEditServiceModal}
              onSubmit={handleEditService}
              editMode={true}
              serviceData={selectedService}
            />
          </PermissionGate>
        )}
        {/* Attach Service Modal */}
        <AttachServiceModal
          open={isAttachServiceModalOpen}
          onClose={() => setIsAttachServiceModalOpen(false)}
          projectId="demo-project-id" // This should be passed from parent component
          blockCount={0}
          houseCount={0}
        />
      </div>
    </PermissionGate>
  );
};

export default FetchServices;
