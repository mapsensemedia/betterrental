/**
 * OpsShell - Layout shell for the Operations Panel
 * 
 * Focused on day-to-day rental operations:
 * - Workboard (today's tasks)
 * - Pickups/Handovers
 * - Active Rentals
 * - Returns
 * 
 * Simpler navigation than AdminShell, task-focused.
 */

import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  ArrowRightLeft,
  ClipboardCheck,
  RotateCcw,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Search,
} from "lucide-react";
import c2cLogo from "@/assets/c2c-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSidebarCounts } from "@/hooks/use-sidebar-counts";

/**
 * Ops Navigation - Simplified for operational tasks
 */
const opsNavItems = [
  {
    href: "/ops",
    label: "Workboard",
    icon: LayoutDashboard,
    description: "Today's tasks at a glance",
  },
  {
    href: "/ops/bookings",
    label: "All Bookings",
    icon: ClipboardCheck,
    description: "Search all reservations",
  },
  {
    href: "/ops/pickups",
    label: "Pickups",
    icon: Car,
    badgeKey: "pickups" as const,
    description: "Upcoming handovers",
  },
  {
    href: "/ops/active",
    label: "Active Rentals",
    icon: ArrowRightLeft,
    badgeKey: "active" as const,
    description: "Currently on road",
  },
  {
    href: "/ops/returns",
    label: "Returns",
    icon: RotateCcw,
    badgeKey: "returns" as const,
    description: "Incoming returns",
  },
  {
    href: "/ops/fleet",
    label: "Fleet Status",
    icon: Car,
    description: "Vehicle availability",
  },
];

interface OpsShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function OpsShell({ children, hideNav }: OpsShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const { counts } = useSidebarCounts();

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingCode.trim()) {
      navigate(`/ops/booking/${encodeURIComponent(bookingCode.trim())}`);
      setBookingCode("");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore session errors
    }
    toast({ title: "Signed out" });
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/ops") {
      return location.pathname === "/ops";
    }
    return location.pathname.startsWith(href);
  };

  // Full-screen mode (no nav) - used by workflow pages like BookingOps
  if (hideNav) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-56 border-r border-border bg-card hidden md:flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Link to="/ops" className="flex items-center">
            <img src={c2cLogo} alt="C2C Rental" className="h-8 w-auto" />
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Operations</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {opsNavItems.map((item) => {
            const badgeCount = item.badgeKey ? counts[item.badgeKey] || 0 : 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {badgeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center shrink-0"
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}

        </nav>

        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2026 C2C Rental</p>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 animate-slide-up overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">Operations</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-0.5">
              {opsNavItems.map((item) => {
                const badgeCount = item.badgeKey ? counts[item.badgeKey] || 0 : 0;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {badgeCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5 py-0 h-4"
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="h-12 md:h-14 border-b border-border bg-card sticky top-0 z-40 flex items-center px-3 md:px-4 gap-2 md:gap-3">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Quick Booking Search */}
          <form onSubmit={handleBookingSearch} className="flex-1 max-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Booking code..."
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                className="pl-8 h-8 bg-secondary border-0 text-sm"
              />
            </div>
          </form>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px]">
                  {user?.email?.split("@")[0] || "Staff"}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 md:p-4 lg:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
