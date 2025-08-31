'use client';

import React, { useState } from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { MainMenu } from './index';

interface TopNavbarProps {
  onMenuSelect: (menuId: string) => void;
  activeMenu: string;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ onMenuSelect, activeMenu }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getMenuId = (menu: any) => {
    // Convert menu name to ID format for consistency
    return menu.name.toLowerCase().replace(/\s+/g, '-');
  };

  const handleMenuClick = (menu: any) => {
    const menuId = getMenuId(menu);
    onMenuSelect(menuId);
  };

  return (
    <div className="bg-purple-600 text-white shadow-lg">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Search */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-purple-700 text-white px-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-purple-200"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                0
              </span>
            </div>
          </div>

          {/* Center Section - Main Menu */}
          <nav className="flex items-center space-x-1">
            {MainMenu.map((menu, index) => {
              const menuId = getMenuId(menu);
              return (
                <button
                  key={index}
                  onClick={() => handleMenuClick(menu)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeMenu === menuId
                      ? 'bg-purple-700 text-white'
                      : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                  }`}
                >
                  {menu.name}
                </button>
              );
            })}
          </nav>

          {/* Right Section - Help */}
          <div className="flex items-center space-x-4">
            <a 
              href="/help" 
              className="text-purple-100 hover:text-white text-sm font-medium transition-colors"
            >
              Need Help?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
