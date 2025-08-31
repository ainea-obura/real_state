"use client";

import * as hg from 'hugeicons-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import * as feather from 'react-feather';

import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function ThemeSwitcher({ size }: { size: number }) {
  const { theme, setTheme, resolvedTheme } = useTheme(); // Access resolvedTheme
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Ensure the component is mounted before rendering
  }, []);

  if (!mounted) {
    return null; // Avoid rendering until the component is mounted
  }

  const currentTheme = resolvedTheme || theme; // Use resolvedTheme if available

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme); // Update the theme based on selection
  };

  return (
    <div className="relative cursor-pointer">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center">
          {currentTheme === "light" ? (
            <feather.Sun
              size={size}
              className="hover:scale-110 transition-transform cursor-pointer"
            />
          ) : currentTheme === "dark" ? (
            <feather.Moon
              size={size}
              className="hover:scale-110 transition-transform cursor-pointer"
            />
          ) : (
            <hg.LaptopIcon
              size={size}
              className="hover:scale-110 transition-transform cursor-pointer"
            />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white shadow-md mt-2 mr-15 border border-gray-300 rounded-md">
          {/* Light Theme Option */}
          <DropdownMenuItem
            onClick={() => handleThemeChange("light")}
            className="flex items-center gap-4 hover:bg-blue-50 p-2 rounded-md hover:text-blue-500 text-sm cursor-pointer"
          >
            <feather.Sun size={20} />
            <span className="text-sm">Light</span>
          </DropdownMenuItem>

          {/* Dark Theme Option */}
          <DropdownMenuItem
            onClick={() => handleThemeChange("dark")}
            className="flex items-center gap-4 hover:bg-blue-50 p-2 rounded-md hover:text-blue-500 text-sm cursor-pointer"
          >
            <feather.Moon size={20} />
            <span className="text-sm">Dark</span>
          </DropdownMenuItem>

          {/* System Theme Option */}
          <DropdownMenuItem
            onClick={() => handleThemeChange("system")}
            className="flex items-center gap-4 hover:bg-blue-50 p-2 rounded-md hover:text-blue-500 text-sm cursor-pointer"
          >
            <hg.LaptopIcon size={20} />
            <span className="text-sm">System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
