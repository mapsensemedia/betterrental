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

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/alerts", label: "Alerts", icon: Bell, badge: true },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/pickups", label: "Pickups", icon: KeyRound },
  { href: "/admin/handovers", label: "Handovers", icon: ArrowRightLeft },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/inventory", label: "Inventory", icon: Car },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/photos", label: "Photos", icon: Camera },
  { href: "/admin/verifications", label: "Verifications", icon: FileCheck },
  { href: "/admin/damages", label: "Damages", icon: AlertTriangle },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
  { href: "/admin/tickets", label: "Tickets", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminShellProps {
  children: ReactNode;
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
}

export function AdminShell({ children, dateFilter, onDateFilterChange }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span>LuxeRide</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Admin Console</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.badge && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                  3
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © 2024 LuxeRide Admin
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xl font-bold">LuxeRide Admin</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
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
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 lg:px-6 gap-4">
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
          <form onSubmit={handleBookingSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Scan booking code..."
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </form>

          {/* Date Quick Filter */}
          {onDateFilterChange && (
            <Select value={dateFilter || "today"} onValueChange={onDateFilterChange}>
              <SelectTrigger className="w-[140px] h-9 bg-muted/50 border-0">
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
              <Button variant="ghost" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
