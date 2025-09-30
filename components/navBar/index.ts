import {
  BadgeDollarSign,
  Briefcase,
  BriefcaseBusiness,
  Building,
  Building2,
  CalendarRange,
  Coins,
  FileCheck,
  FileText,
  Hammer,
  Home,
  Images,
  Key,
  LayoutDashboard,
  LineChart,
  LucideIcon,
  UserCog,
  Users2,
  Wallet,
} from "lucide-react";

export interface IMainMenu {
  id: number;
  name: string;
  icon: LucideIcon;
  url?: string;
  description?: string;
  subMenus?: ISubMenu[];
  requiredPermissions?: string[];
}

export interface ISubMenu {
  id: number;
  name: string;
  icon: LucideIcon;
  url: string;
  description: string;
  requiredPermissions?: string[];
}

// Primary menus that will always be visible
export const MainMenu: IMainMenu[] = [
  {
    id: 1,
    name: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
    description: "Overview and analytics",
    requiredPermissions: ["view_dashboard"],
  },

  {
    id: 2,
    name: "Projects",
    icon: BriefcaseBusiness,
    url: "/projects",
    description: "Manage all your projects",
    requiredPermissions: ["view_projects"],
  },
  {
    id: 9,
    name: "Sales",
    icon: Coins,
    url: "/sales",
    description: "Manage all your sales",
    // TODO: Fix the permissions
    requiredPermissions: ["view_dashboard"],
  },
  {
    id: 2,
    name: "Managements",
    icon: Building2,
    description: "your managements tools and services",
    requiredPermissions: [
      "for_rent",
      "for_service",
      "view_media",
      "view_service",
      "view_document",
    ],
    subMenus: [
      {
        id: 1,
        name: "For Rent",
        icon: Key,
        url: "/managements/for-rent",
        description: "Manage rental properties",
        requiredPermissions: ["for_rent"],
      },
      {
        id: 2,
        name: "For Service",
        icon: Home,
        url: "/managements/for-services",
        description: "Manage properties for sale",
        requiredPermissions: ["for_service"],
      },
      {
        id: 3,
        name: "Services",
        icon: Hammer,
        url: "/managements/services",
        description: "Manage services",
        requiredPermissions: ["view_service"],
      },
      {
        id: 4,
        name: "Media Gallery",
        icon: Images,
        url: "/managements/media",
        description: "Property photos and virtual tours",
        requiredPermissions: ["view_media"],
      },
      {
        id: 5,
        name: "Documents",
        icon: FileText,
        url: "/managements/documents",
        description: "Property related documents",
        requiredPermissions: ["view_document"],
      },
    ],
  },
  {
    id: 3,
    name: "Clients",
    icon: Users2,
    description: "Manage your clients",
    requiredPermissions: ["view_tenant", "view_owner", "view_agents"],
    subMenus: [
      {
        id: 1,
        name: "Tenants",
        icon: Key,
        url: "/clients/tenants",
        description: "Manage tenant profiles and leases",
        requiredPermissions: ["view_tenant"],
      },
      {
        id: 2,
        name: "Owners",
        icon: UserCog,
        url: "/clients/owners",
        description: "Property owner management",
        requiredPermissions: ["view_owner"],
      },
      {
        id: 5,
        name: "Agents",
        icon: Briefcase,
        url: "/clients/agency",
        description: "Agency and agent management",
        requiredPermissions: ["view_agents"],
      },
    ],
  },
  {
    id: 4,
    name: "Finance",
    icon: Wallet,
    description: "Core financial workflows & reports",
    requiredPermissions: [
      "view_rent_collection",
      "view_invoices",
      "view_collections",
      "view_penalties",
      "view_disbursment",
      "view_expenses",
      "view_vendors",
      "view_currency",
      "view_transactions",
      "view_reports",
    ],
    subMenus: [
      // Tenant-side
      {
        id: 1,
        name: "Rent & Invoicing",
        icon: BadgeDollarSign,
        url: "/finance/rentandinvoices",
        description: "Billing, Invoices, & Receivables",
        requiredPermissions: [
          "view_rent_collection",
          "view_invoices",
          "view_collections",
          "view_penalties",
          "view_disbursment",
          "view_expenses",
          "view_vendors",
          "view_currency",
        ],
      },

      {
        id: 5,
        name: "Transactions",
        icon: Wallet,
        url: "/finance/transactions",
        description: "Ledger & reconciliation",
        requiredPermissions: ["view_transactions"],
      },
      {
        id: 6,
        name: "Reports",
        icon: LineChart,
        url: "/finance/reports",
        description: "Financial Reports",
        requiredPermissions: ["view_reports"],
      },
    ],
  },

  // {
  //   id: 5,
  //   name: "More",
  //   icon: MoreHorizontal,
  //   description: "Additional management options",
  //   subMenus: [
  //     {
  //       id: 1,
  //       name: "Leasing",
  //       icon: Key,
  //       url: "/leasing",
  //       description: "Lease contracts and applications",
  //     },

  //     {
  //       id: 3,
  //       name: "Reports",
  //       icon: LineChart,
  //       url: "/reports",
  //       description: "Analytics and reporting",
  //     },
  //   ],
  // },
];

// Secondary menus that will be under "More"
export const MoreMenuItems: IMainMenu[] = [
  {
    id: 6,
    name: "Leasing",
    icon: Key,
    description: "Lease management",
    subMenus: [
      {
        id: 1,
        name: "Contracts",
        icon: FileCheck,
        url: "/leasing/contracts",
        description: "Manage lease contracts",
      },
      {
        id: 2,
        name: "Applications",
        icon: FileText,
        url: "/leasing/applications",
        description: "Process rental applications",
      },
      {
        id: 3,
        name: "Renewals",
        icon: CalendarRange,
        url: "/leasing/renewals",
        description: "Handle lease renewals",
      },
    ],
  },
  {
    id: 7,
    name: "Agency",
    icon: Briefcase,
    description: "Agency management",
    subMenus: [
      {
        id: 1,
        name: "Agents",
        icon: Users2,
        url: "/agency/agents",
        description: "Manage real estate agents",
      },
      {
        id: 2,
        name: "Commissions",
        icon: BadgeDollarSign,
        url: "/agency/commissions",
        description: "Commission management",
      },
    ],
  },
  {
    id: 8,
    name: "Reports",
    icon: LineChart,
    description: "Analytics and reporting",
    subMenus: [
      {
        id: 1,
        name: "Financial",
        icon: BadgeDollarSign,
        url: "/reports/financial",
        description: "Financial reports and analytics",
      },
      {
        id: 2,
        name: "Properties",
        icon: Building,
        url: "/reports/properties",
        description: "Property performance reports",
      },
      {
        id: 3,
        name: "Leasing",
        icon: Key,
        url: "/reports/leasing",
        description: "Leasing and occupancy reports",
      },
    ],
  },
];
