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
  Package,
  MessageSquare,
  Smartphone,
  HelpCircle,
  Settings,
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
  { id: 1, name: "Dashboard", icon: LayoutDashboard, url: "/", description: "Overview and analytics", requiredPermissions: ["view_dashboard"] },
  {
    id: 2,
    name: "Projects",
    icon: BriefcaseBusiness,
    url: "/projects",
    description: "Projects, property types and categories",
    requiredPermissions: ["view_projects"],
    subMenus: [
      { id: 1, name: "Property Types", icon: Building2, url: "/projects/property-types", description: "Configure property registration types" },
      { id: 2, name: "Residential", icon: Home, url: "/projects/residential", description: "Residential projects" },
      { id: 3, name: "Commercial", icon: Building, url: "/projects/commercial", description: "Commercial projects" },
      { id: 4, name: "Community Associations", icon: Users2, url: "/projects/community-associations", description: "Associations & communities" },
      { id: 5, name: "Affordable Housing", icon: Home, url: "/projects/affordable-housing", description: "Affordable housing initiatives" },
      { id: 6, name: "Governmental", icon: Building2, url: "/projects/governmental", description: "Government-linked projects" },
    ],
  },
  { id: 3, name: "Sales", icon: Coins, url: "/sales", description: "Sales workflows", requiredPermissions: ["view_dashboard"] },
  {
    id: 4,
    name: "Lease Management",
    icon: Key,
    url: "/leases",
    description: "Lease contracts and administration",
    subMenus: [
      { id: 1, name: "Listings", icon: Images, url: "/managements/for-rent", description: "Available rental listings" },
      { id: 2, name: "Advertise Property", icon: Images, url: "/leases/listings/advertise", description: "List/advertise on Facebook, Instagram and more" },
      { id: 3, name: "Collections", icon: BadgeDollarSign, url: "/leases/collections", description: "Rent collection via M-Pesa, Airtel, SasaPay; Payroll/Till and bank integrations" },
      { id: 4, name: "Tenants", icon: Users2, url: "/clients/tenants", description: "Registration, identification and documentation" },
      { id: 5, name: "Tenant Screening", icon: FileCheck, url: "/leases/tenant-screening", description: "Screening (eCitizen/Huduma ID checks if available)" },
      { id: 6, name: "Docs & E-sign", icon: FileText, url: "/managements/documents", description: "Agreements via email/WhatsApp, scan and upload" },
      { id: 7, name: "Services", icon: Hammer, url: "/managements/for-services", description: "Lease-related services" },
      { id: 8, name: "Agents", icon: Briefcase, url: "/clients/agency", description: "Registration & identification" },
      { id: 9, name: "Owners", icon: Users2, url: "/clients/owners", description: "Registration & identification" },
    ],
  },
  // { id: 5, name: "Listings", icon: Images, url: "/listings", description: "Advertise and list rental properties" },
  {
    id: 6,
    name: "Accounting",
    icon: Wallet,
    url: "/accounting",
    description: "Invoices, collections and reporting",
    subMenus: [
      { id: 1, name: "Invoices & Collections", icon: BadgeDollarSign, url: "/finance/rentandinvoices", description: "Billing and rent collections" },
      { id: 2, name: "Transact", icon: Wallet, url: "/accounting/transact", description: "Payments and payouts" },
      { id: 3, name: "Reporting", icon: LineChart, url: "/accounting/reporting", description: "Financial reports" },
      { id: 4, name: "Products", icon: Package, url: "/products", description: "Product offerings and services" },
    ],
  },
  {
    id: 7,
    name: "Products",
    icon: MessageSquare,
    url: "/communication",
    description: "Communication with email, sms or App calls/chats and notifications",
    subMenus: [
      { id: 1, name: "Communication", icon: MessageSquare, url: "/communication", description: "Email, SMS, App calls/chats and notifications" },
      { id: 2, name: "Mobile App", icon: Smartphone, url: "/communication/mobile-app", description: "Download from Android/iOS" },
      { id: 3, name: "Support", icon: HelpCircle, url: "/communication/support", description: "Customer support and help" },
    ],
  },
  { id: 9, name: "Operations", icon: Settings, url: "/operations", description: "Operational tasks and maintenance" },
];

// Secondary menus that will be under "More"
export const MoreMenuItems: IMainMenu[] = [];
