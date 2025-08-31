"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';

import Breadcrumbs from '@/components/breadcrumb';
import Menus from '@/components/navBar/menu';
import TopNavbar from '@/components/navBar/TopNavbar';
import Sidebar from '@/components/navBar/Sidebar';
import { ThemeProvider } from '@/components/themeProvider';
import { useAuthErrorHandler } from '@/hooks/auth/useAuthErrorHandler';
import { useForcePasswordChange } from '@/hooks/auth/useForcePasswordChange';

interface iLayoutProps {
  children: React.ReactNode;
}

const DashLayout = ({ children }: iLayoutProps) => {
  const currentPath = usePathname();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Handle authentication errors (like expired tokens)
  useAuthErrorHandler();
  
  // Handle force password change - this will automatically redirect if needed
  useForcePasswordChange();

  const handleMenuSelect = (menuId: string) => {
    setActiveMenu(menuId);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-blue-50">
        {/* Top Navigation Bar */}
        <TopNavbar onMenuSelect={handleMenuSelect} activeMenu={activeMenu} />
        
        <div className="flex">
          {/* Left Sidebar */}
          <Sidebar activeTopMenu={activeMenu} onMenuSelect={handleMenuSelect} />
          
          {/* Main Content Area - Keep existing structure */}
          <div className="flex-1 overflow-y-auto relative flex-col gap-y-10 w-full">
            {/* Old navbar commented out */}
            {/* <Menus /> */}

            <div className="px-6 w-full md:px-40">
              <Breadcrumbs currentPath={currentPath} />
              <div className="my-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DashLayout;
