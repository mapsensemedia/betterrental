import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  BookOpen,
  Receipt,
  ArrowRightLeft,
  RotateCcw,
  Car,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Camera,
  FileCheck,
  KeyRound,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePendingAlertsCount } from "@/hooks/use-pending-alerts-count";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/alerts", label: "Alerts", icon: Bell, badgeKey: "alerts" as const },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/pickups", label: "Pickups", icon: KeyRound },
  { href: "/admin/active-rentals", label: "Active Rentals", icon: Car },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/inventory", label: "Inventory", icon: ArrowRightLeft },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/damages", label: "Damages", icon: AlertTriangle },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
  { href: "/admin/tickets", label: "Tickets", icon: MessageSquare },
  { href: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingCart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminShellProps {
  children: ReactNode;
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
  hideNav?: boolean;
}

export function AdminShell({ children, dateFilter, onDateFilterChange, hideNav }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const { count: pendingAlertsCount } = usePendingAlertsCount();

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingCode.trim()) {
      navigate(`/admin/bookings?code=${encodeURIComponent(bookingCode.trim())}`);
      setBookingCode("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  // Full-screen mode (no nav)
  if (hideNav) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-60 border-r border-border bg-card hidden lg:flex flex-col">
        <div className="p-5 border-b border-border">
          <Link to="/" className="text-lg font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span>C2C Rental</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Admin Console</p>
        </div>
        
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.badgeKey === "alerts" && pendingAlertsCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                  {pendingAlertsCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © 2024 C2C Rental
          </p>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">C2C Rental Admin</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card sticky top-0 z-40 flex items-center px-4 lg:px-5 gap-3">
          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Booking Code Scanner */}
          <form onSubmit={handleBookingSearch} className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search booking..."
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                className="pl-9 h-9 bg-secondary border-0"
              />
            </div>
          </form>

          {/* Date Quick Filter */}
          {onDateFilterChange && (
            <Select value={dateFilter || "today"} onValueChange={onDateFilterChange}>
              <SelectTrigger className="w-[130px] h-9 bg-secondary border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="24h">Next 24h</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/admin/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
