"use client";

import {
    AlertCircle, ArrowDownCircle, ArrowUpCircle, BarChart3, Coins, FileText, HandCoins, User,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/components/providers/PermissionProvider';

import CurrencyPage from './currency/currency';
import Expenses from './expenses/expense';
import Invoices from './invoices/invoices';
import Payments from './payments/payments';
import Payouts from './payouts/payouts';
import Penalties from './penalties/penalties';
import RentRoll from './rent-roll/rent-roll';
import Vendors from './vendors/vendors';

const menuItems = [
  // Accounts Receivable (Money In)
  {
    id: "rent-roll",
    label: "View Rents",
    icon: ArrowDownCircle,
    description: "Track tenant rent, status & overdue",
    // Optional badge: count of unpaid tenants
    badge: "3",
    badgeColor: "bg-yellow-500",
    permission: "view_rent_collection",
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: FileText,
    description: "Create, send, and manage invoices",
    permission: "view_invoices",
  },
  {
    id: "collection",
    label: "Collections",
    icon: HandCoins,
    description: "Record or view collections",
    permission: "view_collections",
  },
  {
    id: "penalties",
    label: "Penalties",
    icon: AlertCircle,
    description: "Late fees, fines, and applied charges",
    // Optional badge: how many tenants have active penalties
    badge: "1",
    badgeColor: "bg-red-600",
    permission: "view_penalties",
  },

  // Accounts Payable (Money Out)
  {
    id: "owner-payouts",
    label: "Disbursements",
    icon: ArrowUpCircle,
    description: "Pay and view owner statements",
    permission: "view_disbursment",
  },
  {
    id: "expenses",
    label: "Billing",
    icon: ArrowUpCircle,
    description: "Record bills, fees, and maintenance costs",
    permission: "view_expenses",
  },
  {
    id: "currency",
    label: "Currency",
    icon: Coins,
    description: "Tenant/owner financial summaries",
    permission: "view_currency",
  },
  {
    id: "vendors",
    label: "Vendors",
    icon: User,
    description: "Manage vendors and their invoices",
    permission: "view_vendors",
  },
];

const RentAndInvoicesDetailPage = () => {
  const [activeTab, setActiveTab] = useState<string>("rent-roll");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const { isSuperuser, hasPermission } = usePermissions();
  const visibleMenuItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "rent-roll":
        return (
          <PermissionGate codename="view_rent_collection">
            <RentRoll />
          </PermissionGate>
        );
      case "invoices":
        return (
          <PermissionGate codename="view_invoices">
            <Invoices />
          </PermissionGate>
        );
      case "collection":
        return (
          <PermissionGate codename="view_collections">
            <Payments />
          </PermissionGate>
        );
      case "penalties":
        return (
          <PermissionGate codename="view_penalties">
            <Penalties />
          </PermissionGate>
        );
      case "owner-payouts":
        return (
          <PermissionGate codename="view_disbursment">
            <Payouts />
          </PermissionGate>
        );
      case "expenses":
        return (
          <PermissionGate codename="view_expenses">
            <Expenses />
          </PermissionGate>
        );
      case "currency":
        return (
          <PermissionGate codename="view_currency">
            <CurrencyPage />
          </PermissionGate>
        );
      case "vendors":
        return (
          <PermissionGate codename="view_vendors">
            <Vendors />
          </PermissionGate>
        );
      default:
        return <div>Dashboard</div>;
    }
  };

  return (
    <PermissionGate
      codename={[
        "view_rent_collection",
        "view_invoices",
        "view_collections",
        "view_penalties",
        "view_disbursment",
        "view_expenses",
        "view_vendors",
        "view_currency",
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-12 gap-6">
          <div className="top-24 sticky flex flex-col col-span-3 bg-primary rounded-lg h-[calc(100vh-2.5rem)]">
            {/* Sidebar Header */}
            <div className="p-6 pb-4">
              <div className="flex gap-3 items-start">
                <div className="bg-white/10 p-2.5 rounded-md">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Rent & Invoices
                  </h2>
                  <p className="text-sm text-white/80 line-clamp-2">
                    Manage receivables, payables, and financial reports
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-4 mb-2 h-px bg-white/10" />

            {/* Navigation Section */}
            <div className="p-4">
              <h3 className="px-2 mb-3 text-xs font-medium tracking-wider uppercase text-white/70">
                Menu
              </h3>
              <nav className="gap-2.5 grid grid-cols-2">
                {visibleMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={[
                      "group flex cursor-pointer flex-col items-center p-3 rounded-lg transition-all duration-300 relative",
                      activeTab === item.id
                        ? "bg-white shadow-lg"
                        : "bg-secondary/20 hover:bg-secondary/30",
                      hoveredTab === item.id &&
                        activeTab !== item.id &&
                        "scale-[1.02]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Icon Container */}
                    <div
                      className={[
                        "w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-all duration-300 relative",
                        activeTab === item.id
                          ? "bg-primary/10 shadow-sm"
                          : "bg-white/10",
                        hoveredTab === item.id &&
                          activeTab !== item.id &&
                          "bg-white/20",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <item.icon
                        className={[
                          "w-[22px] h-[22px] transition-all duration-300",
                          activeTab === item.id ? "text-primary" : "text-white",
                          hoveredTab === item.id &&
                            activeTab !== item.id &&
                            "scale-110",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </div>
                    {/* Label */}
                    <span
                      className={[
                        "font-medium text-sm transition-all duration-300",
                        activeTab === item.id
                          ? "text-primary"
                          : "text-white/90",
                        hoveredTab === item.id &&
                          activeTab !== item.id &&
                          "text-white",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.label}
                    </span>
                    {/* Badge */}
                    {item.badge && (
                      <span
                        className={`absolute top-2 right-2 text-xs text-white px-1.5 py-0.5 rounded-full w-5  h-5 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
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
    </PermissionGate>
  );
};

export default RentAndInvoicesDetailPage;
