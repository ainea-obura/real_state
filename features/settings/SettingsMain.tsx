"use client";

import {
    AlertTriangle, Building2, Key, Settings as SettingsIcon, Shield, UserPlus, Users,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import ChangePassword from './tabs/change-password/change-password';
import Company from './tabs/company/company';
import Position from './tabs/position/position';
import Roles from './tabs/roles/roles';
import Staff from './tabs/staff/staff';

const SettingsMain: React.FC = () => {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<string>("passwords");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const { isSuperuser, hasPermission } = usePermissions();

  // Check for force password change
  const isForcePasswordChange =
    searchParams?.get("force") === "true" &&
    searchParams?.get("tab") === "passwords" &&
    session?.user?.force_password_change;

  // Set active tab based on URL params or force password change
  useEffect(() => {
    if (!searchParams) return;

    const tabParam = searchParams.get("tab");

    if (isForcePasswordChange) {
      setActiveTab("passwords");
    } else if (
      tabParam &&
      ["positions", "staff", "passwords", "roles"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams, isForcePasswordChange]);

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600">
            You must be logged in to access settings.
          </p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      id: "positions",
      label: "Positions",
      icon: Building2,
      permission: "manage_positions",
    },
    {
      id: "staff",
      label: "Staff",
      icon: Users,
      permission: "create_staff",
    },
    {
      id: "passwords",
      label: "Passwords",
      icon: Key,
    },
    {
      id: "roles",
      label: "Roles",
      icon: Shield,
      permission: "manage_roles",
    },
    // Only show company tab for company users
    ...(session?.user?.type === "company" && session?.user?.company
      ? [
          {
            id: "company",
            label: "Company",
            icon: Building2,
          },
        ]
      : []),
  ].filter((item) => !item.permission || hasPermission(item.permission));

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case "positions":
          return (
            <PermissionGate codename="manage_positions">
              <Position />
            </PermissionGate>
          );
        case "staff":
          return (
            <PermissionGate codename="create_staff">
              <Staff />
            </PermissionGate>
          );
        case "passwords":
          return (
            <div className="space-y-6">
              {isForcePasswordChange && (
                <Alert variant="destructive">
                  <AlertTitle>Password Change Required</AlertTitle>
                  <AlertDescription className="text-orange-800">
                    <strong>Password Change Required:</strong> For security
                    reasons, you must change your password before continuing.
                    You cannot access other parts of the application until you
                    update your password.
                  </AlertDescription>
                </Alert>
              )}
              <ChangePassword />
            </div>
          );
        case "roles":
          return (
            <PermissionGate codename="manage_roles">
              <Roles />
            </PermissionGate>
          );
        case "company":
          return <Company />;
        default:
          return null;
      }
    } catch (error) {
      return (
        <div className="p-6">
          <div className="text-red-600">
            Error loading content. Please try refreshing the page.
          </div>
          <pre className="bg-gray-100 mt-2 p-2 rounded text-xs">
            {error?.toString()}
          </pre>
        </div>
      );
    }
  };

  try {
    return (
      <div className="flex flex-col gap-4">
        <div className="gap-6 grid grid-cols-12">
          <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
            {/* Settings Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-white/10 rounded-lg w-12 h-12">
                  <SettingsIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-xl">Settings</h2>
                  <p className="text-white/70 text-sm">
                    Manage your system settings
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="mb-3 px-2 font-medium text-white/70 text-xs uppercase tracking-wider">
                Navigation
              </h3>

              {/* Navigation Grid */}
              <nav className="gap-2.5 grid grid-cols-2">
                {navigationItems.map((item) => {
                  const isDisabled =
                    isForcePasswordChange && item.id !== "passwords";
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && setActiveTab(item.id)}
                      onMouseEnter={() => !isDisabled && setHoveredTab(item.id)}
                      onMouseLeave={() => setHoveredTab(null)}
                      disabled={isDisabled}
                      className={cn(
                        "group flex cursor-pointer flex-col items-center p-3 rounded-lg transition-all duration-300 relative",
                        activeTab === item.id
                          ? "bg-white shadow-lg"
                          : "bg-secondary/20 hover:bg-secondary/30",
                        hoveredTab === item.id &&
                          activeTab !== item.id &&
                          !isDisabled &&
                          "scale-[1.02]",
                        isDisabled && "opacity-50 cursor-not-allowed"
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
                            !isDisabled &&
                            "bg-white/20"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-[22px] h-[22px] transition-all duration-300",
                            activeTab === item.id
                              ? "text-primary"
                              : "text-white",
                            hoveredTab === item.id &&
                              activeTab !== item.id &&
                              !isDisabled &&
                              "scale-110"
                          )}
                        />
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          "font-medium text-sm transition-all duration-300",
                          activeTab === item.id
                            ? "text-primary"
                            : "text-white/90",
                          hoveredTab === item.id &&
                            activeTab !== item.id &&
                            !isDisabled &&
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
                  );
                })}
              </nav>
            </div>
          </div>
          <div className="col-span-9 p-4 rounded-md h-full">
            {renderTabContent()}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600">
            An unexpected error occurred while loading settings.
          </p>
          <pre className="bg-gray-100 mt-2 p-2 rounded text-xs">
            {error?.toString()}
          </pre>
        </div>
      </div>
    );
  }
};

export default SettingsMain;
