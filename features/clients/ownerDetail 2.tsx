"use client";
import { Building03Icon } from "hugeicons-react";
import {
  AlertCircle,
  BarChart3,
  FileText,
  Receipt,
  Shield,
  TrendingUp,
  Users,
  CreditCard,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { getOwnerDashboard } from '@/actions/clients/ownerDashboardAction';
import { uploadVerificationDocument } from '@/actions/clients';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import OwnerDocuments from "./tabs/ownerDocuments";
import OwnerIncome from "./tabs/ownerIncome";
import OwnerInvoices from "./tabs/ownerInvoices";
import OwnerOverview from "./tabs/ownerOverview";
import OwnerProperties from "./tabs/ownerProperties";
import OwnerVerification from "./tabs/ownerVerification";
import OwnerAccounts from "./tabs/ownerAccounts";

import type { OwnerDashboardResponse } from "./tabs/schema/ownerDashboardSchema";
const OwnerDetail = ({ ownerId }: { ownerId: string }) => {
  // All hooks at the top!
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(initialTab || "overview");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (payload: { category: string; idNumber: string; documentImage: File; userImage?: File }) => {
      return uploadVerificationDocument(
        ownerId,
        "owner",
        payload.category,
        payload.idNumber,
        payload.documentImage,
        payload.userImage
      );
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to upload document");
        return;
      }
      toast.success(data.message || "Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["owner-verification-documents", ownerId] });
      setIsVerificationModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
    }
  });

  const handleUpload = (data: { category: string; idNumber: string; documentImage: File; userImage?: File }) => {
    uploadMutation.mutate(data);
  };

  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      permission: "view_owner_overview",
    },
    {
      id: "properties",
      label: "Properties",
      icon: Building03Icon,
      permission: "view_owner_properties",
    },
    {
      id: "income",
      label: "Income",
      icon: TrendingUp,
      permission: "view_owner_income",
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: Receipt,
      permission: "view_owner_invoices",
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: CreditCard,
      permission: "view_owner_accounts",
    },
    // {
    //   id: "documents",
    //   label: "Documents",
    //   icon: FileText,
    //   permission: "view_owner_documents",
    // },
    {
      id: "verification",
      label: "Verification",
      icon: Shield,
      permission: "view_owner_verification",
    },
  ];

  const { isSuperuser, hasPermission } = usePermissions();
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const queryResult = useQuery<OwnerDashboardResponse>({
    queryKey: ["owner-dashboard", ownerId],
    queryFn: async () => {
      const res = await getOwnerDashboard(ownerId);
      if (res.error) {
        throw new Error(res.message || "Failed to fetch owner data");
      }
      return res;
    },
    enabled: !!ownerId,
  });

  const { data, error, isLoading } = queryResult;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full min-h-screen">
        <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.error) {
    return (
      <Alert className="my-4">
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>
          {data?.message || "No owner data found"}
        </AlertDescription>
      </Alert>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <PermissionGate codename="view_owner_overview">
            <OwnerOverview />
          </PermissionGate>
        );
      case "properties":
        return (
          <PermissionGate codename="view_owner_properties">
            <OwnerProperties />
          </PermissionGate>
        );
      case "income":
        return (
          <PermissionGate codename="view_owner_income">
            <OwnerIncome />
          </PermissionGate>
        );
      case "invoices":
        return (
          <PermissionGate codename="view_owner_invoices">
            <OwnerInvoices ownerId={ownerId} />
          </PermissionGate>
        );
      // case "documents":
      //   return <OwnerDocuments dashboardData={data} />;
      case "verification":
        return (
          <PermissionGate codename="view_owner_verification">
            <OwnerVerification ownerId={ownerId} />
          </PermissionGate>
        );
      case "accounts":
        return (
          <PermissionGate codename="view_owner_accounts">
            <OwnerAccounts ownerId={ownerId} />
          </PermissionGate>
        );
      default:
        return (
          <PermissionGate codename="view_owner_overview">
            <OwnerOverview />
          </PermissionGate>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
          {/* Owner Header */}
          <div className="p-6 pb-4">
            <div className="flex gap-3 items-start">
              <div className="bg-white/10 p-2.5 rounded-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                {(() => {
                  const owner = data?.data?.results?.[0]?.owner;
                  const stats = data?.data?.results?.[0]?.stats;
                  return (
                    <>
                      <h2 className="text-lg font-semibold text-white">
                        {owner?.first_name} {owner?.last_name}
                      </h2>
                      <p className="text-sm text-white/80 line-clamp-2">
                        {owner?.email}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (!owner?.is_owner_verified) {
                              setIsVerificationModalOpen(true);
                            }
                          }}
                          className={cn(
                            "px-2 py-1 text-xs text-white rounded transition-all duration-200",
                            owner?.is_owner_verified 
                              ? "bg-white/20 cursor-default" 
                              : "bg-amber-500/80 hover:bg-amber-500 cursor-pointer"
                          )}
                          disabled={owner?.is_owner_verified}
                          title={owner?.is_owner_verified ? "Owner is verified" : "Click to verify owner"}
                        >
                          {owner?.is_owner_verified ? "Verified" : "Pending"}
                        </button>
                        <span className="px-2 py-1 text-xs text-white rounded bg-white/20">
                          {stats?.owned_properties} Properties
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Navigation Section */}
          <div className="p-4">
            <h3 className="px-2 mb-3 text-xs font-medium tracking-wider uppercase text-white/70">
              Navigation
            </h3>

            {/* Navigation Grid */}
            <nav className="gap-2.5 grid grid-cols-2">
              {visibleNavigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={cn(
                    "group flex cursor-pointer flex-col items-center p-3 rounded-lg transition-all duration-300 relative",
                    activeTab === item.id
                      ? "bg-white shadow-lg"
                      : "bg-secondary/20 hover:bg-secondary/30",
                    hoveredTab === item.id &&
                      activeTab !== item.id &&
                      "scale-[1.02]"
                  )}
                >
                  {/* Icon Container */}
                  <div
                    className={cn(
                      "w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-all duration-300 relative",
                      activeTab === item.id
                        ? "bg-primary/10 shadow-sm"
                        : "bg-white/10",
                      hoveredTab === item.id &&
                        activeTab !== item.id &&
                        "bg-white/20"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-[22px] h-[22px] transition-all duration-300",
                        activeTab === item.id ? "text-primary" : "text-white",
                        hoveredTab === item.id &&
                          activeTab !== item.id &&
                          "scale-110"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "font-medium text-sm transition-all duration-300",
                      activeTab === item.id ? "text-primary" : "text-white/90",
                      hoveredTab === item.id &&
                        activeTab !== item.id &&
                        "text-white"
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator Dot */}
                  {activeTab === item.id && (
                    <div className="-bottom-0.5 left-1/2 absolute bg-primary rounded-full w-1 h-1 -translate-x-1/2" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="col-span-9 p-4 h-full rounded-md">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default OwnerDetail;
