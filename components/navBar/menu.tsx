"use client";
import { Bell, ChevronDown, Coins, LockOpen, LogOut, Menu as MenuIcon, Settings, UserCog, X } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePermissions } from '@/components/providers/PermissionProvider';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ISubMenu, MainMenu, MoreMenuItems } from './index';

const Menu = () => {
  const { data: session } = useSession();
  const path = usePathname();
  const [hoveredMenu, setHoveredMenu] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isSuperuser, hasPermission } = usePermissions();

  const visibleMenus = isSuperuser
    ? MainMenu
    : MainMenu.filter((menu) => hasPermission(menu.requiredPermissions ?? []));

  const visibleSubMenus = (subMenus: ISubMenu[] = []) =>
    isSuperuser
      ? subMenus
      : subMenus.filter((sub) => hasPermission(sub.requiredPermissions ?? []));

  // Add refs for timeouts with proper typing and initialization
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Helper function to clear timeouts
  const clearTimeouts = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
  }, []);

  // Enhanced menu open handler
  const handleMenuEnter = useCallback(
    (menu: (typeof MainMenu)[0]) => {
      clearTimeouts();

      if (Array.isArray(menu.subMenus) && menu.subMenus.length > 0) {
        openTimeoutRef.current = setTimeout(() => {
          setHoveredMenu(menu.id);
          if (menu.name === "More") {
            setIsMoreMenuOpen(true);
          }
        }, 100);
      }
    },
    [clearTimeouts]
  );

  // Enhanced menu close handler
  const handleMenuLeave = useCallback(
    (menu: (typeof MainMenu)[0]) => {
      clearTimeouts();

      closeTimeoutRef.current = setTimeout(() => {
        setHoveredMenu(null);
        if (menu.name === "More") {
          setIsMoreMenuOpen(false);
        }
      }, 150);
    },
    [clearTimeouts]
  );

  // Immediate close handler for menu selection
  const handleMenuSelect = useCallback(() => {
    clearTimeouts();
    setHoveredMenu(null);
    setIsMoreMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [clearTimeouts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Helper function to check if a menu item is active
  const isMenuActive = useCallback(
    (menu: (typeof MainMenu)[0]) => {
      if (!menu.url && !menu.subMenus) return false;
      // Special case for dashboard - only active when exactly at root
      if (menu.url === "/") return path === "/";
      // For other menu items
      if (menu.url && path.startsWith(menu.url)) return true;
      // Check if any submenu is active
      if (menu.subMenus) {
        return menu.subMenus.some((submenu) => path.startsWith(submenu.url));
      }
      return false;
    },
    [path]
  );

  // Helper function to check if a submenu item is active
  const isSubmenuActive = useCallback(
    (url: string) => {
      return path.startsWith(url);
    },
    [path]
  );

  const links = [
    {
      id: 1,
      name: "Profile",
      Icon: UserCog,
      url: "/profile",
    },
    {
      id: 2,
      name: "Billing",
      Icon: Coins,
      url: "/billing",
    },
    {
      id: 3,
      name: "Change Password",
      Icon: LockOpen,
      url: "/change-password",
    },
  ];

  return (
    <>
      {/* Navbar Container */}
      <div className="top-0 right-0 left-0 z-[9999] sticky bg-white shadow-sm backdrop-blur-sm">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 xl:px-20 border-b min-h-18">
          {/* Left - Logo */}
          <div className="flex items-center gap-x-3 sm:gap-x-4 min-w-0 flex-1 sm:flex-none sm:w-[160px]">
            <Link
              href={"/"}
              className="rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex items-center gap-2 cursor-pointer">
                <Image
                  src={"/images/logo.svg"}
                  alt={`${process.env.NEXT_PUBLIC_SITE_NAME} Logo`}
                  width={32}
                  height={32}
                  className="sm:w-10 sm:h-10 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
                  <p className="font-bold text-primary text-lg sm:text-xl uppercase truncate">
                    {process.env.NEXT_PUBLIC_SITE_NAME}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Center Menu - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 justify-center items-center px-2">
            <nav
              className="flex justify-center items-center gap-1 md:gap-4"
              role="navigation"
            >
              {visibleMenus.map((menu, index) => (
                <div
                  key={index}
                  className="group relative"
                  onMouseEnter={() => handleMenuEnter(menu)}
                  onMouseLeave={() => handleMenuLeave(menu)}
                >
                  <Link
                    href={menu.url || "#"}
                    className={`group/main flex items-center gap-1.5 px-3 py-2 rounded-md transition-all duration-300 ease-out
                      ${
                        isMenuActive(menu)
                          ? "bg-primary text-white shadow-md"
                          : "!text-gray-600 hover:bg-primary/5 hover:text-primary"
                      }`}
                    onClick={(e) => {
                      if (
                        !menu.url &&
                        Array.isArray(menu.subMenus) &&
                        menu.subMenus.length > 0
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <menu.icon
                      width={18}
                      height={18}
                      className={`transition-all duration-300 ${
                        isMenuActive(menu)
                          ? "text-white"
                          : "text-gray-500 group-hover/main:text-primary"
                      }`}
                      strokeWidth={1.75}
                    />
                    <span
                      className={`font-medium text-sm ${
                        isMenuActive(menu)
                          ? "text-white"
                          : "group-hover/main:text-primary"
                      }`}
                    >
                      {menu.name}
                    </span>
                    {Array.isArray(menu.subMenus) &&
                      visibleSubMenus(menu.subMenus).length > 0 && (
                        <ChevronDown
                          width={16}
                          height={16}
                          className={`transition-all duration-300 ml-0.5 ${
                            isMenuActive(menu)
                              ? "text-white"
                              : hoveredMenu === menu.id
                              ? "rotate-180 text-gray-400"
                              : "text-gray-400"
                          }`}
                          strokeWidth={2}
                        />
                      )}
                  </Link>

                  {/* Mega Menu */}
                  {Array.isArray(menu.subMenus) &&
                    visibleSubMenus(menu.subMenus).length > 0 && (
                      <div
                        className={`fixed left-0 right-0 z-[9999] transition-all duration-300 ease-out ${
                          hoveredMenu === menu.id
                            ? "opacity-100 visible translate-y-0"
                            : "opacity-0 invisible translate-y-1 pointer-events-none"
                        }`}
                        onMouseEnter={() => {
                          clearTimeouts();
                          setHoveredMenu(menu.id);
                        }}
                        onMouseLeave={() => handleMenuLeave(menu)}
                      >
                        <div className="mx-auto px-6 md:px-40 container">
                          <div className="relative">
                            <div
                              className={`absolute top-2 left-1/2 -translate-x-1/2 w-[1150px] max-w-[calc(100vw-3rem)] 
                              transition-all duration-300 ease-out ${
                                hoveredMenu === menu.id
                                  ? "translate-y-0 scale-100"
                                  : "translate-y-2 scale-98"
                              }`}
                            >
                              <div className="bg-white/95 shadow-lg backdrop-blur-xl border border-gray-100/50 rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-4 divide-x divide-gray-100/50">
                                  {/* Left Content */}
                                  <div className="col-span-3 p-8">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-8">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`flex justify-center items-center rounded-xl w-12 h-12 ${
                                              isMenuActive(menu)
                                                ? "text-white bg-primary"
                                                : "text-gray-500 bg-primary/10"
                                            }`}
                                          >
                                            <menu.icon
                                              className="w-6 h-6"
                                              strokeWidth={1.5}
                                            />
                                          </div>
                                          <div>
                                            <h2
                                              className={`font-semibold text-2xl ${
                                                isMenuActive(menu)
                                                  ? "text-primary"
                                                  : "text-gray-800"
                                              }`}
                                            >
                                              {menu.name}
                                            </h2>
                                            <p className="text-gray-500 text-sm">
                                              {menu.description}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Menu Grid */}
                                    <div className="gap-5 grid grid-cols-2 md:grid-cols-3">
                                      {menu.name === "More"
                                        ? MoreMenuItems.map((moreMenu, idx) => (
                                            <Link
                                              key={idx}
                                              href={moreMenu.url || "#"}
                                              className={`group flex items-start gap-3 p-4 rounded-xl transition-all duration-300 hover:bg-gray-50 ${
                                                isMenuActive(moreMenu)
                                                  ? "bg-primary/5"
                                                  : ""
                                              }`}
                                              onClick={handleMenuSelect}
                                            >
                                              <div
                                                className={`flex justify-center items-center rounded-xl w-12 h-12 transition-all duration-300 ${
                                                  isMenuActive(moreMenu)
                                                    ? "text-white bg-primary"
                                                    : "text-gray-500 bg-primary/10 group-hover:bg-primary/20"
                                                }`}
                                              >
                                                <moreMenu.icon
                                                  className="w-6 h-6"
                                                  strokeWidth={1.5}
                                                />
                                              </div>
                                              <div>
                                                <h3
                                                  className={`font-medium text-gray-800 transition-all duration-300 ${
                                                    isMenuActive(moreMenu)
                                                      ? "text-primary"
                                                      : "group-hover:text-primary"
                                                  }`}
                                                >
                                                  {moreMenu.name}
                                                </h3>
                                                <p className="text-gray-500 text-sm">
                                                  {moreMenu.description}
                                                </p>
                                              </div>
                                            </Link>
                                          ))
                                        : visibleSubMenus(menu.subMenus).map(
                                            (submenu, idx) => (
                                              <Link
                                                key={idx}
                                                href={submenu.url}
                                                className={`group flex items-start gap-3 p-4 rounded-xl transition-all duration-300 hover:bg-gray-50 ${
                                                  isSubmenuActive(submenu.url)
                                                    ? "bg-primary/5"
                                                    : ""
                                                }`}
                                                onClick={handleMenuSelect}
                                              >
                                                <div
                                                  className={`flex justify-center items-center rounded-xl w-12 h-12 transition-all duration-300 ${
                                                    isSubmenuActive(submenu.url)
                                                      ? "bg-primary text-white"
                                                      : "bg-primary/10 text-gray-500 group-hover:bg-primary/20"
                                                  }`}
                                                >
                                                  <submenu.icon
                                                    className="w-6 h-6"
                                                    strokeWidth={1.5}
                                                  />
                                                </div>
                                                <div>
                                                  <h3
                                                    className={`font-medium text-gray-800 transition-all duration-300 ${
                                                      isSubmenuActive(
                                                        submenu.url
                                                      )
                                                        ? "text-primary"
                                                        : "group-hover:text-primary"
                                                    }`}
                                                  >
                                                    {submenu.name}
                                                  </h3>
                                                  <p className="text-gray-500 text-sm">
                                                    {submenu.description}
                                                  </p>
                                                </div>
                                              </Link>
                                            )
                                          )}
                                    </div>
                                  </div>

                                  {/* Right Content - Featured Section */}
                                  <div className="hidden lg:block p-8">
                                    <div className="space-y-6">
                                      <div className="group relative rounded-xl aspect-video overflow-hidden">
                                        <div className="z-10 absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                        <Image
                                          src="/images/placeholder.jpg"
                                          alt="Featured Content"
                                          fill
                                          priority
                                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="right-0 bottom-0 left-0 z-20 absolute p-6">
                                          <span className="bg-primary/20 px-3 py-1 rounded-full font-medium text-primary text-xs">
                                            Featured
                                          </span>
                                          <h3 className="mt-3 font-medium text-white text-lg">
                                            Discover What&apos;s New
                                          </h3>
                                          <p className="mt-1 text-gray-200 text-sm">
                                            Check out our latest updates and
                                            featured content
                                          </p>
                                        </div>
                                      </div>
                                      <Link
                                        href="#"
                                        className="group inline-flex items-center font-medium text-primary hover:text-primary/80 text-sm transition-colors duration-200"
                                      >
                                        Learn more
                                        <ChevronDown className="ml-1 w-4 h-4 rotate-[-90deg] transition-transform group-hover:translate-x-1 duration-200" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex justify-end items-center gap-x-4 sm:gap-x-6 w-auto sm:w-[140px]">
            <div className="flex items-center gap-x-3 sm:gap-x-5 text-gray-600">
              <button
                className="relative hover:bg-gray-100 p-1.5 rounded-full transition-colors duration-200"
                aria-label="Notifications"
              >
                <Bell size={18} className="text-gray-600" strokeWidth={1.75} />
                <span className="top-0 right-0 absolute bg-red-500 rounded-full w-2 h-2" />
              </button>
              <Link
                href="/settings"
                className="hover:bg-gray-100 p-1.5 rounded-full transition-colors duration-200 cursor-pointer"
                aria-label="Settings"
              >
                <Settings
                  size={18}
                  className="text-gray-600"
                  strokeWidth={1.75}
                />
              </Link>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative p-0 border-2 border-gray-200 hover:border-primary rounded-full w-9 h-9 transition-colors duration-200"
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src="/avatars/01.png"
                        alt={session?.user?.username || "User"}
                      />
                      <AvatarFallback>
                        {session?.user?.username
                          ?.substring(0, 2)
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="mt-2 w-56"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium text-sm leading-none">
                        {session?.user?.username || "User"}
                      </p>
                      <p className="text-gray-500 text-xs leading-none">
                        {session?.user?.email || "user@example.com"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {links.map((link, idx) => (
                      <DropdownMenuItem key={idx} asChild>
                        <Link
                          href={link.url}
                          className="flex items-center gap-3 py-1.5 text-gray-700 hover:text-primary cursor-pointer"
                        >
                          <link.Icon size={16} strokeWidth={1.75} />
                          <span>{link.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-3 py-1.5 text-gray-700 hover:text-red-500 cursor-pointer"
                    onClick={() => signOut()}
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X size={24} className="text-gray-600" />
              ) : (
                <MenuIcon size={24} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <div className="px-4 py-6 space-y-4">
              {visibleMenus.map((menu, index) => (
                <div key={index} className="space-y-2">
                  <Link
                    href={menu.url || "#"}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                      isMenuActive(menu)
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={handleMenuSelect}
                  >
                    <div className="flex items-center gap-3">
                      <menu.icon
                        size={20}
                        className={isMenuActive(menu) ? "text-white" : "text-gray-500"}
                        strokeWidth={1.75}
                      />
                      <span className="font-medium">{menu.name}</span>
                    </div>
                    {Array.isArray(menu.subMenus) && menu.subMenus.length > 0 && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${
                          hoveredMenu === menu.id ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>
                  
                  {/* Mobile Submenu */}
                  {Array.isArray(menu.subMenus) && menu.subMenus.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {visibleSubMenus(menu.subMenus).map((submenu, idx) => (
                        <Link
                          key={idx}
                          href={submenu.url}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                            isSubmenuActive(submenu.url)
                              ? "bg-primary/10 text-primary"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                          onClick={handleMenuSelect}
                        >
                          <submenu.icon
                            size={16}
                            className={isSubmenuActive(submenu.url) ? "text-primary" : "text-gray-400"}
                            strokeWidth={1.75}
                          />
                          <span className="text-sm">{submenu.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mega menu */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/10 backdrop-blur-sm transition-all duration-300 ${
          hoveredMenu !== null || isMoreMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => {
          clearTimeouts();
          setHoveredMenu(null);
          setIsMoreMenuOpen(false);
        }}
      />
    </>
  );
};

export default Menu;
