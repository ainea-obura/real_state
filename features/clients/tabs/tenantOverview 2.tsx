"use client";

import {
  Building2,
  DollarSign,
  FileText,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
  Eye,
  Edit,
  UserCheck,
  AlertCircle,
  Clock,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  Shield,
  KeyRound,
  Mail as MailIcon,
  Phone as PhoneIcon,
  FileWarning,
  Calendar as CalendarIcon,
  UserX,
  Hammer,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Header from "./components/Header";
import StatCard from "./components/StatCard";
import type { TenantDashboardResponse } from "./schema/tenantDashboard";
import {
  updateTenantVerification,
  registerTenantVerification,
  updateTenantVerificationDetails,
  getTenantVerification,
  getTenantProfile,
  getTenantLeaseStats,
} from "@/actions/clients/tenantDashboard";
import { getVerificationActions } from "@/lib/tenantDashboatd";
import { VerificationModal } from "./components/VerificationModal";
import { RegisterVerificationModal } from "./components/RegisterVerificationModal";
import TenantHeader from "./components/TenantHeader";

interface TenantOverviewProps {
  tenantId: string;
}

const TenantOverview = ({ tenantId }: TenantOverviewProps) => {
  // All hooks at the top!
  const { data, isLoading, error } = useQuery({
    queryKey: ["tenant-profile", tenantId],
    queryFn: () => getTenantProfile(tenantId),
    enabled: !!tenantId,
  });
  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["tenant-lease-stats", tenantId],
    queryFn: () => getTenantLeaseStats(tenantId),
    enabled: !!tenantId,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isRegisterVerificationModalOpen, setIsRegisterVerificationModalOpen] =
    useState(false);
  const [isEditVerificationModalOpen, setIsEditVerificationModalOpen] =
    useState(false);
  const [modalVerification, setModalVerification] = useState<any | null>(null);
  const [isVerificationLoading, setIsVerificationLoading] = useState(false);

  if (isLoading || isStatsLoading)
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  if (error || data?.error || !data?.data?.results || statsError || statsData?.error || !statsData?.data?.results) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        {data?.message || statsData?.message || (error as Error)?.message || (statsError as Error)?.message || "Failed to load tenant profile."}
      </div>
    );
  }

  const profile = data.data.results;
  const stats = statsData.data.results;

  const leaseSummary = "";
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), "MMM dd, yyyy")
    : undefined;

  const totalRentPaid = `$${Number(stats.total_rent_paid).toLocaleString()}`;
  const outstandingBalance = `$${Number(stats.total_outstanding).toLocaleString()}`;
  const activeLeases = stats.active_leases;
  // Payments, invoices, etc. are not available in profile, so use placeholders or remove as needed
  const lastPaymentValue = "-";
  const nextPaymentDue = "-";
  const overdueInvoices = 0;

  // Handlers for verification actions
  const handleRegisterVerification = async (formData: any) => {
    // Implementation of handleRegisterVerification
  };
  const handleEditVerification = async (formData: any) => {
    // Implementation of handleEditVerification
  };

  // Handler to fetch latest verification before opening modal
  const handleVerify = async () => {
    setIsVerificationLoading(true);
    // Implementation of handleVerify
    setIsVerificationLoading(false);
    setIsVerificationModalOpen(true);
  };

  // Handler for viewing verification details
  const handleViewVerification = () => {
    setModalVerification(profile.verification);
    setIsVerificationModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <TenantHeader
        email={profile.email}
        phone={profile.phone}
        status={profile.is_active ? "Active" : "Inactive"}
        verified={!!profile.is_tenant_verified}
        leaseSummary={leaseSummary}
        memberSince={memberSince}
        onActivate={() => {}}
        onDeactivate={() => {}}
        onVerify={handleViewVerification}
        onRegisterVerification={() => setIsRegisterVerificationModalOpen(true)}
        onEditVerification={() => setIsEditVerificationModalOpen(true)}
        hasVerification={!!profile.verification}
      />
      {/* Premium Statistics Cards - Owner Style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Rent Paid */}
        <Card className="relative bg-primary/5 hover:bg-primary/10 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="bg-primary/10 p-2.5 rounded-md">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="text-sm font-medium">Total Rent Paid</h3>
                    <span className="text-2xl font-semibold tracking-tight">
                      {totalRentPaid}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start">
                <p className="text-xs text-gray-500">Lifetime rent payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Outstanding Balance */}
        <Card className="relative bg-orange-100 hover:bg-orange-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="bg-orange-200 p-2.5 rounded-md">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="text-sm font-medium">Outstanding Balance</h3>
                    <span className="text-2xl font-semibold tracking-tight text-red-600">
                      {outstandingBalance}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start">
                <p className="text-xs text-gray-500">
                  Current unpaid rent & fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Active Leases */}
        <Card className="relative bg-blue-100 hover:bg-blue-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="bg-blue-200 p-2.5 rounded-md">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="text-sm font-medium">Active Leases</h3>
                    <span className="text-2xl font-semibold tracking-tight">
                      {activeLeases}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start">
                <p className="text-xs text-gray-500">
                  Current property assignments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Overdue Invoices */}
        <Card className="relative bg-red-50 hover:bg-red-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="bg-red-100 p-2.5 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="text-sm font-medium">Overdue Invoices</h3>
                    <span className="text-2xl font-semibold tracking-tight text-orange-700">
                      {overdueInvoices}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start">
                <p className="text-xs text-gray-500">Payments overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Action Items Card (refactored to match OwnerOverview) */}
          <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
            <CardHeader>
              <CardTitle className="flex gap-2 items-center text-lg">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Render recommendations based on dashboardData */}
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
        <div className="flex flex-col gap-6">
          {/* Combined Lease Summary Card (Premium Style, Multiple Leases) */}
          <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
            <CardHeader>
              <CardTitle className="flex gap-2 items-center text-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                Lease Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Render leases based on dashboardData */}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Verification Modal (view/verify) */}
      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        verification={modalVerification}
        isLoading={isVerificationLoading}
        tenantId=""
      />
      {/* Register Verification Modal */}
      <RegisterVerificationModal
        isOpen={isRegisterVerificationModalOpen}
        onClose={() => setIsRegisterVerificationModalOpen(false)}
        onSubmit={handleRegisterVerification}
      />
      {/* Edit Verification Modal */}
      {profile.verification && (
        <RegisterVerificationModal
          isOpen={isEditVerificationModalOpen}
          onClose={() => setIsEditVerificationModalOpen(false)}
          onSubmit={handleEditVerification}
          initialValues={{
            category: profile.verification.category || "",
            id_number: profile.verification.id_number || "",
            // document_image and user_image cannot be prefilled as File, so leave blank
          }}
        />
      )}
    </div>
  );
};

export default TenantOverview;
