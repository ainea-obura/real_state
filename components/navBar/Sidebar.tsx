'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Building2, 
  Users, 
  User, 
  Briefcase, 
  Wrench, 
  FileText, 
  Megaphone,
  Bell,
  HelpCircle,
  Search,
  Home,
  Key,
  Coins,
  Wallet,
  MessageSquare,
  Settings,
  Images,
  BadgeDollarSign,
  FileCheck,
  Hammer,
  Package,
  Smartphone,
  LineChart
} from 'lucide-react';
import { MainMenu } from './index';

interface SidebarProps {
  activeTopMenu: string;
  onMenuSelect: (menuId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTopMenu, onMenuSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getSubMenus = (topMenu: string) => {
    switch (topMenu) {
      case 'dashboard':
        return [
          { id: 'overview', label: 'Overview', icon: <Building2 size={20} />, href: '/' },
          { id: 'analytics', label: 'Analytics', icon: <Building2 size={20} />, href: '/analytics' },
          { id: 'reports', label: 'Reports', icon: <Building2 size={20} />, href: '/reports' }
        ];
      case 'projects':
        return [
          { id: 'property-types', label: 'Property Types', icon: <Building2 size={20} />, href: '/projects/property-types' },
          { id: 'residential', label: 'Residential', icon: <Home size={20} />, href: '/projects/residential' },
          { id: 'commercial', label: 'Commercial', icon: <Building2 size={20} />, href: '/projects/commercial' },
          { id: 'community', label: 'Community Associations', icon: <Users size={20} />, href: '/projects/community-associations' },
          { id: 'affordable', label: 'Affordable Housing', icon: <Home size={20} />, href: '/projects/affordable-housing' },
          { id: 'governmental', label: 'Governmental', icon: <Building2 size={20} />, href: '/projects/governmental' }
        ];
      case 'sales':
        return [
          { id: 'workflows', label: 'Sales Workflows', icon: <Coins size={20} />, href: '/sales' }
        ];
      case 'lease-management':
        return [
          { id: 'listings', label: 'Listings', icon: <Images size={20} />, href: '/managements/for-rent' },
          { id: 'advertise', label: 'Advertise Property', icon: <Megaphone size={20} />, href: '/leases/listings/advertise' },
          { id: 'collections', label: 'Collections', icon: <BadgeDollarSign size={20} />, href: '/leases/collections' },
          { id: 'tenants', label: 'Tenants', icon: <Users size={20} />, href: '/clients/tenants' },
          { id: 'screening', label: 'Tenant Screening', icon: <FileCheck size={20} />, href: '/leases/tenant-screening' },
          { id: 'docs', label: 'Docs & E-sign', icon: <FileText size={20} />, href: '/managements/documents' },
          { id: 'services', label: 'Services', icon: <Hammer size={20} />, href: '/managements/for-services' },
          { id: 'agents', label: 'Agents', icon: <Briefcase size={20} />, href: '/clients/agency' },
          { id: 'owners', label: 'Owners', icon: <User size={20} />, href: '/clients/owners' }
        ];
      case 'accounting':
        return [
          { id: 'invoices', label: 'Invoices & Collections', icon: <BadgeDollarSign size={20} />, href: '/finance/rentandinvoices' },
          { id: 'transact', label: 'Transact', icon: <Wallet size={20} />, href: '/accounting/transact' },
          { id: 'reporting', label: 'Reporting', icon: <LineChart size={20} />, href: '/accounting/reporting' },
          { id: 'products', label: 'Products', icon: <Package size={20} />, href: '/products' }
        ];
      case 'products':
        return [
          { id: 'communication', label: 'Communication', icon: <MessageSquare size={20} />, href: '/communication' },
          { id: 'mobile', label: 'Mobile App', icon: <Smartphone size={20} />, href: '/communication/mobile-app' },
          { id: 'support', label: 'Support', icon: <HelpCircle size={20} />, href: '/communication/support' }
        ];
      case 'operations':
        return [
          { id: 'tasks', label: 'Tasks & Maintenance', icon: <Wrench size={20} />, href: '/operations/tasks' },
          { id: 'work-orders', label: 'Work Orders', icon: <FileText size={20} />, href: '/operations/work-orders' },
          { id: 'requests', label: 'Requests', icon: <Users size={20} />, href: '/operations/requests' }
        ];
      default:
        return [];
    }
  };

  const subMenus = getSubMenus(activeTopMenu);

  return (
    <div className="w-64 bg-slate-800 text-white h-screen flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-700">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700 text-white px-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* New Item Button - Removed */}

      {/* Current Section Title */}
      <div className="px-4 py-2 text-slate-300 text-sm font-medium">
        &lt; {activeTopMenu.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </div>

      {/* Sub Menu Items */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-2">
          {subMenus.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center px-3 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors group"
            >
              <span className="mr-3 group-hover:text-blue-400 transition-colors">
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Bottom Icons */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Bell size={20} className="text-slate-300 hover:text-white cursor-pointer transition-colors" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              30
            </span>
          </div>
          <HelpCircle size={20} className="text-slate-300 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
