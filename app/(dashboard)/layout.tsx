"use client";

import { usePathname } from 'next/navigation';

import Breadcrumbs from '@/components/breadcrumb';
import Menus from '@/components/navBar/menu';
import { ThemeProvider } from '@/components/themeProvider';
import { useAuthErrorHandler } from '@/hooks/auth/useAuthErrorHandler';
import { useForcePasswordChange } from '@/hooks/auth/useForcePasswordChange';

interface iLayoutProps {
  children: React.ReactNode;
}

const DashLayout = ({ children }: iLayoutProps) => {
  const currentPath = usePathname();
  
  // Handle authentication errors (like expired tokens)
  useAuthErrorHandler();
  
  // Handle force password change - this will automatically redirect if needed
  useForcePasswordChange();
  
  return (
    <ThemeProvider>
      <div className="flex overflow-y-auto relative flex-col gap-y-10 w-full min-h-screen bg-blue-50">
        <Menus />

        <div className="px-6 w-full md:px-40">
          <Breadcrumbs currentPath={currentPath} />
          <div className="my-6">{children}</div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DashLayout;
