"use client";

import { BarChart3, FileText, LucideIcon, PieChart, Users } from 'lucide-react';
import React, { useState } from 'react';

import { PermissionGate } from '@/components/PermissionGate';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import SalesDashboard from './dashboard/dashboard';
import GetDocuments from './documents/getDocuments';
import OwnerAssignment from './owner/ownerAssignment';
import SalesReports from './reports/getReports';

interface ISalesMenu {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

const SalesMenus: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const navigationItems: ISalesMenu[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      permission: "view_documents",
    },
    {
      id: "buyers",
      label: "Buyers",
      icon: Users,
      permission: "view_owners",
    },

    {
      id: "reports",
      label: "Reports",
      icon: PieChart,
      permission: "view_reports",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <SalesDashboard />;
      case "buyers":
        return <OwnerAssignment />;
      case "sales-assignment":
        return <OwnerAssignment />;
      case "finance":
        return <div className="p-6 font-bold text-2xl">Hello Finance!</div>;
      case "documents":
        return <GetDocuments />;
      case "reports":
        return <SalesReports />;
      default:
        return <div className="p-6 font-bold text-2xl">Hello Dashboard!</div>;
    }
  };

  return (
    <PermissionGate codename="view_sales">
      <div className="flex flex-col gap-4">
        <div className="gap-6 grid grid-cols-12">
          <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
            {/* Sales Header */}
            <div className="p-6 pb-4">
              {/* Beta Badge - TOP */}
              <div className="flex justify-center mb-3">
                <span className="bg-yellow-500 px-3 py-1 rounded-full font-bold text-yellow-900 text-xs">
                  🚀 BETA
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-white/10 p-2.5 rounded-md">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-lg">
                    Sales Management
                  </h2>
                  <p className="text-white/80 text-sm line-clamp-2">
                    Property sales
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Navigation Section */}
            <div className="p-4">
              <h3 className="mb-3 px-2 font-medium text-white/70 text-xs uppercase tracking-wider">
                Navigation
              </h3>

              {/* Navigation Grid */}
              <ScrollArea className="h-[calc(100vh-300px)]">
                <nav className="gap-2.5 grid grid-cols-2">
                  {navigationItems.map((item) => (
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
                            activeTab === item.id
                              ? "text-primary"
                              : "text-white",
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
                          activeTab === item.id
                            ? "text-primary"
                            : "text-white/90",
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
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </div>
          </div>
          <div className="col-span-9 p-4 rounded-md h-full">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};

export default SalesMenus;
