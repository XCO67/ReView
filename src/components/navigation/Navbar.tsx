"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  BarChart3, 
  Home, 
  Calendar, 
  Menu,
  X,
  ChevronDown,
  Users,
  Globe,
  Settings,
  LogOut,
  RefreshCw,
  User,
  DollarSign,
  Info,
  TrendingUp
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useCurrency } from "@/contexts/CurrencyContext";
import { isAdmin, getRoleDisplayName, getPrimaryRole, getRoleDashboardDescription } from "@/lib/role-filter";
import { logger } from '@/lib/utils/logger';
import { NotificationCenter } from './NotificationCenter';

const navigation = [
  { name: "Renewals", href: "/renewals", icon: RefreshCw },
];

// Overview page removed - functionality moved to dashboard
const overviewPages: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [];

const analyticsPages = [
  { name: "Comparison", href: "/analytics", icon: BarChart3 },
  { name: "Performance", href: "/analytics/performance", icon: TrendingUp },
  { name: "Client Overview", href: "/client-overview", icon: Users },
];

const visualizationPages = [
  { name: "Data Insights", href: "/visualization", icon: TrendingUp },
  { name: "Global Footprint", href: "/world-map", icon: Globe },
];

interface UserInfo {
  name: string;
  email: string;
  roles: string[];
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const pathname = usePathname();
  const { currency, setCurrency, exchangeRate } = useCurrency();


  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            name: data.user?.name || data.user?.username || "User",
            email: data.user?.email || "",
            roles: data.user?.roles || [],
          });
        }
      } catch (error) {
        logger.error('Failed to fetch user info', error);
      }
    };
    fetchUserInfo();
  }, []);


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <TooltipProvider>
    <nav className="bg-black shadow-lg border-b border-gray-800">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[100px] gap-4">
          <Link href="/" className="flex items-center flex-shrink-0">
            <BrandLogo showWordmark={false} size={170} priority />
            <span className="sr-only">Go to dashboard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 flex-1 justify-center">
            {/* Dashboard Button (Single button, no dropdown) */}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === "/dashboard"
                    ? "bg-white text-black shadow-md"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>

            {/* Analytics Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    analyticsPages.some(page => pathname === page.href || pathname.startsWith('/analytics'))
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {analyticsPages.map((page) => (
                  <DropdownMenuItem key={page.name} asChild>
                    <Link href={page.href} className="flex items-center space-x-2">
                      <page.icon className="w-4 h-4" />
                      <span>{page.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Visualization Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    visualizationPages.some(page => pathname === page.href || pathname.startsWith('/visualization') || pathname.startsWith('/world-map'))
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Visualization</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {visualizationPages.map((page) => (
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
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-black shadow-md"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}


          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Info Dialog */}
            <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hidden md:flex items-center justify-center p-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200"
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>About this dashboard</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex justify-center mb-6">
                    <BrandLogo showWordmark={false} size={200} priority />
                  </div>
                  <DialogTitle className="text-2xl font-bold text-center mb-2">
                    Portfolio Analysis Dashboard
                  </DialogTitle>
                  <DialogDescription className="text-center text-sm text-muted-foreground mb-4">
                    Premiums in {currency} {currency === 'USD' && exchangeRate ? `(Exchange rate: 1 KWD = ${exchangeRate.toFixed(2)} USD)` : currency === 'USD' ? '(Exchange rate: 1 KWD = 3.25 USD)' : ''}
                  </DialogDescription>
                  {userInfo && (
                    <div className="text-center mb-6 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {getRoleDashboardDescription(userInfo.roles)}
                      </p>
                    </div>
                  )}
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">Data as at:</span> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">GROSS PREM</span> refers to Gross Ultimate Premium
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">BUILT-IN RETRO</span> refers to Facultative Retrocession
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">RETAINED PREM</span> refers to GROSS PREM net of Built-in Retrocession
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">Loss Ratio</span> is based on RETAINED PREM
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">Underwriting Combined Ratio (uCR)</span> refers to Loss Ratio plus Expense Ratio
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">LR threshold</span> is set at 65%
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <div>
                        <span className="font-semibold">uCR threshold</span> is set at 87%
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-semibold text-base">Dashboard Features:</h4>
                    <div className="text-sm space-y-2 pl-4">
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>Main Dashboard: Overview of key performance indicators and metrics</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>Analytics: Detailed analysis by UY, Ext Type, Broker, Cedant, Country, Region, and Hub</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>World Map: Interactive visualization of global policy distribution by country</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>Renewals: Track renewal status, upcoming renewals, and policy management</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>Overview: Monthly, Quarterly, and Yearly performance breakdowns</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>Client Overview: Analysis by Broker and Cedant with advanced filtering</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Profile Dropdown */}
            {userInfo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center space-x-2 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-xs font-semibold leading-tight truncate max-w-[100px]">{userInfo.name}</span>
                        <span className="text-[10px] text-gray-400 leading-tight truncate max-w-[100px]">
                          {userInfo.email}
                        </span>
                        {getPrimaryRole(userInfo.roles) && (
                          <span className="text-[10px] font-semibold text-primary leading-tight truncate max-w-[100px] mt-0.5">
                            {getRoleDisplayName(getPrimaryRole(userInfo.roles)!)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{userInfo.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
                    {getPrimaryRole(userInfo.roles) && (
                      <p className="text-xs font-semibold text-primary mt-1">
                        {getRoleDisplayName(getPrimaryRole(userInfo.roles)!)}
                      </p>
                    )}
                    {userInfo.roles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {userInfo.roles.map((role) => (
                          <span
                            key={role}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdmin(userInfo.roles) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Notification Center */}
            <NotificationCenter />

            {/* Currency Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => setCurrency(currency === 'KWD' ? 'USD' : 'KWD')}
                  className="hidden md:flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-white"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-semibold">{currency}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch to {currency === 'KWD' ? 'USD' : 'KWD'}</p>
              </TooltipContent>
            </Tooltip>


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
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-white text-black shadow-md"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Home className="w-5 h-5" />
                  <span>Main Dashboard</span>
                </Link>
              </div>

              {/* Mobile Analytics Section */}
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Analytics
                </div>
                {analyticsPages.map((page) => {
                  const isActive = pathname === page.href || (page.href === '/analytics' && pathname.startsWith('/analytics'));
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

              {/* Mobile Visualization Section */}
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Charts
                </div>
                {visualizationPages.map((page) => {
                  const isActive = pathname === page.href || pathname.startsWith('/visualization') || pathname.startsWith('/world-map');
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

              {/* Mobile Profile Section */}
              {userInfo && (
                <div className="px-3 py-2 border-t border-gray-800">
                  <div className="px-3 py-2 mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{userInfo.name}</p>
                        <p className="text-xs text-gray-400 truncate">{userInfo.email}</p>
                        {getPrimaryRole(userInfo.roles) && (
                          <p className="text-xs font-semibold text-primary truncate mt-0.5">
                            {getRoleDisplayName(getPrimaryRole(userInfo.roles)!)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {isAdmin(userInfo.roles) && (
                    <Link
                      href="/admin"
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        pathname.startsWith("/admin")
                          ? "bg-white text-black shadow-md"
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full mt-2 flex items-center justify-center space-x-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 text-base"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </Button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </nav>
    </TooltipProvider>
  );
}