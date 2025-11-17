"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart3, 
  Home, 
  TrendingUp, 
  Calendar, 
  FileText,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  Users,
  Building,
  PieChart,
  Target
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";

const navigation = [
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const dashboardPages = [
  { name: "Main Dashboard", href: "/dashboard", icon: Home },
  { name: "Simple Dashboard", href: "/simple-dashboard", icon: PieChart },
  { name: "Unified Dashboard", href: "/unified-dashboard", icon: Target },
];

const overviewPages = [
  { name: "Monthly Overview", href: "/monthly-overview", icon: Calendar },
  { name: "Quarterly Overview", href: "/quarterly-overview", icon: TrendingUp },
  { name: "Yearly Overview", href: "/yearly-overview", icon: FileText },
  { name: "Client Overview", href: "/client-overview", icon: Users },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="bg-black shadow-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="Kuwait Re Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">
                Kuwait Re
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Dashboard Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    dashboardPages.some(page => pathname === page.href)
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {dashboardPages.map((page) => (
                  <DropdownMenuItem key={page.name} asChild>
                    <Link href={page.href} className="flex items-center space-x-2">
                      <page.icon className="w-4 h-4" />
                      <span>{page.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Overview Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    overviewPages.some(page => pathname === page.href)
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Overview</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {overviewPages.map((page) => (
                  <DropdownMenuItem key={page.name} asChild>
                    <Link href={page.href} className="flex items-center space-x-2">
                      <page.icon className="w-4 h-4" />
                      <span>{page.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200 hover:scale-105"
            >
              {!mounted ? (
                <div className="w-5 h-5" />
              ) : theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800 bg-gray-900">
              {/* Mobile Dashboard Section */}
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Dashboard
                </div>
                {dashboardPages.map((page) => {
                  const isActive = pathname === page.href;
                  return (
                    <Link
                      key={page.name}
                      href={page.href}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white text-black shadow-md"
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <page.icon className="w-5 h-5" />
                      <span>{page.name}</span>
                    </Link>
                  );
                })}
              </div>

              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-black shadow-md"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Overview Section */}
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Overview
                </div>
                {overviewPages.map((page) => {
                  const isActive = pathname === page.href;
                  return (
                    <Link
                      key={page.name}
                      href={page.href}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white text-black shadow-md"
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <page.icon className="w-5 h-5" />
                      <span>{page.name}</span>
                    </Link>
                  );
                })}
              </div>

            </div>
          </div>
        )}
      </div>
    </nav>
  );
}