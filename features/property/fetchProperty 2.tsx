"use client";
import {
  BarChart3,
  Building2,
  DollarSign,
  Hammer,
  Home,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import Structure from "../projects/profile/tabs/propertyStructure";
import Owners from "./tabs/owners";
import Payments from "./tabs/payments";
import PropertyOverview from "./tabs/propertyOverview";
import Services from "./tabs/services";
import Tenants from "./tabs/tenants";

const FetchProperty = ({ propertyId }: { propertyId: string }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <PropertyOverview />;
      case "structure":
        return <Structure propertyId={propertyId} />;
      case "tenants":
        return <Tenants />;
      case "payments":
        return <Payments />;
      case "services":
        return <Services />;
      case "owners":
        return <Owners />;
      default:
        return <div>overview</div>;
    }
  };

  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
    },
    {
      id: "structure",
      label: "Structure",
      icon: Building2,
    },
    {
      id: "tenants",
      label: "Tenants",
      icon: Users,
      badge: "3",
      badgeColor: "bg-blue-500",
    },
    {
      id: "payments",
      label: "Payments",
      icon: DollarSign,
      badge: "5",
      badgeColor: "bg-green-500",
    },
    {
      id: "services",
      label: "Services",
      icon: Hammer,
      badge: "2",
      badgeColor: "bg-destructive",
    },
    {
      id: "owners",
      label: "Owners",
      icon: Home,
    },
  ];

  return (
    <div className="gap-6 grid grid-cols-12">
      <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-10rem)]">
        {/* Property Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-white/10 p-2.5 rounded-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">
                123 Owashink Road
              </h2>
              <p className="text-white/80 text-sm line-clamp-2">
                Owashink Road, Nairobi, Kenya
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
      <div className="col-span-9 p-4 rounded-md h-full">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default FetchProperty;
