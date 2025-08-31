import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Eye, Pencil, UserCheck, UserX, ShieldCheck, PlusCircle } from "lucide-react";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TenantHeaderProps {
  email: string;
  phone?: string;
  status: "Active" | "Inactive";
  verified: boolean;
  leaseSummary?: string;
  memberSince?: string;
  onActivate: () => void;
  onDeactivate: () => void;
  onVerify: () => void;
  onRegisterVerification: () => void;
  onEditVerification: () => void;
  hasVerification: boolean;
}

const TenantHeader: React.FC<TenantHeaderProps> = ({
  email,
  phone,
  status,
  verified,
  leaseSummary,
  memberSince,
  onActivate,
  onDeactivate,
  onVerify,
  onRegisterVerification,
  onEditVerification,
  hasVerification,
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback>
              <Mail className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Badge
                className={
                  status === "Active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                }
              >
                {status}
              </Badge>
              <Badge
                className={
                  verified
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                }
              >
                {verified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <Mail className="w-4 h-4" /> {email}
              {phone && (
                <>
                  <span className="mx-2">|</span>
                  <Phone className="w-4 h-4" /> {phone}
                </>
              )}
            </div>
            {leaseSummary && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {leaseSummary}
              </div>
            )}
            {memberSince && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Member since: {memberSince}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {status === "Active" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-red-100 hover:bg-red-200 text-red-700 border-none"
                  onClick={onDeactivate}
                  aria-label="Deactivate Tenant"
                  tabIndex={0}
                  role="button"
                  size="icon"
                >
                  <UserX className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deactivate Tenant</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-green-100 hover:bg-green-200 text-green-700 border-none"
                  onClick={onActivate}
                  aria-label="Activate Tenant"
                  tabIndex={0}
                  role="button"
                  size="icon"
                >
                  <UserCheck className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Activate Tenant</TooltipContent>
            </Tooltip>
          )}
          {/* Verification Buttons */}
          {!verified && hasVerification && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-none"
                    onClick={onVerify}
                    aria-label="Verify Tenant"
                    tabIndex={0}
                    role="button"
                    size="icon"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Verify Tenant</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-none"
                    onClick={onEditVerification}
                    aria-label="Edit Verification"
                    tabIndex={0}
                    role="button"
                    size="icon"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Verification</TooltipContent>
              </Tooltip>
            </>
          )}
          {!verified && !hasVerification && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-none"
                  onClick={onRegisterVerification}
                  aria-label="Register Verification"
                  tabIndex={0}
                  role="button"
                  size="icon"
                >
                  <PlusCircle className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Register Verification</TooltipContent>
            </Tooltip>
          )}
          {verified && hasVerification && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-none"
                    onClick={onVerify}
                    aria-label="View Verification"
                    tabIndex={0}
                    role="button"
                    size="icon"
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Verification</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-none"
                    onClick={onEditVerification}
                    aria-label="Edit Verification"
                    tabIndex={0}
                    role="button"
                    size="icon"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Verification</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TenantHeader; 