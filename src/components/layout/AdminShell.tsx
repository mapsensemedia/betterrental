import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  User, 
  ChevronDown, 
  BarChart3,
  Wrench,
  Gift,
  ClipboardList,
  ArrowRightLeft,
  FileText,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  DollarSign,
  Building2,
  RotateCcw,
} from "lucide-react";
import c2cLogo from "@/assets/c2c-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSidebarCounts, type SidebarCounts } from "@/hooks/use-sidebar-counts";
import { useCapabilities } from "@/auth/capabilities";
import { useGlobalRealtime } from "@/hooks/use-global-realtime";

type BadgeKey = keyof SidebarCounts;

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: BadgeKey;
  description: string;
}

interface NavGroup {
  title: string;
  priority?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "ACTIVE WORK",
    priority: true,
    items: [
      {
        href: "/admin/alerts",
        label: "Alerts",
        icon: AlertCircle,
        badgeKey: "alerts",
        description: "Issues & action items",
      },
      {
        href: "/admin",
        label: "Workboard",
        icon: LayoutDashboard,
        description: "Quick overview",
      },
      {
        href: "/admin/bookings?tab=active",
        label: "Active Rentals",
        icon: Car,
        badgeKey: "active",
        description: "Vehicles on road",
      },
    ],
  },
  {
    title: "TODAY'S OPERATIONS",
    items: [
      {
        href: "/admin/pickups",
        label: "Pickups",
        icon: CheckCircle,
        badgeKey: "pickups",
        description: "Upcoming handovers",
      },
      {
        href: "/admin/returns",
        label: "Returns",
        icon: RotateCcw,
        badgeKey: "returns",
        description: "Incoming vehicles",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: ClipboardList,
        description: "All reservations",
      },
    ],
  },
  {
    title: "FLEET & ASSETS",
    items: [
      {
        href: "/admin/fleet",
        label: "Inventory",
        icon: Car,
        description: "Vehicle catalog",
      },
      {
        href: "/admin/fleet-costs",
        label: "Fleet Costs",
        icon: TrendingUp,
        description: "Vehicle economics",
      },
      {
        href: "/admin/fleet-analytics",
        label: "Maintenance",
        icon: Wrench,
        description: "Service schedule",
      },
      {
        href: "/admin/incidents",
        label: "Incidents",
        icon: AlertTriangle,
        badgeKey: "incidents",
        description: "Damages & accidents",
      },
    ],
  },
  {
    title: "MONEY & BILLING",
    items: [
      {
        href: "/admin/finance",
        label: "Payments",
        icon: CreditCard,
        description: "Revenue, invoices & transactions",
      },
      {
        href: "/admin/agreements",
        label: "Agreements",
        icon: FileText,
        description: "Rental contracts",
      },
      {
        href: "/admin/reconciliation",
        label: "Reconciliation",
        icon: CheckCircle2,
        description: "Payment matching",
      },
      {
        href: "/admin/offers",
        label: "Offers",
        icon: Gift,
        description: "Rewards & incentives",
      },
    ],
  },
  {
    title: "INSIGHTS & REPORTS",
    items: [
      {
        href: "/admin/reports",
        label: "Analytics",
        icon: TrendingUp,
        description: "Metrics & KPIs",
      },
      {
        href: "/admin/calendar",
        label: "Calendar",
        icon: Calendar,
        description: "Schedule view",
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        href: "/admin/vendors",
        label: "Vendors",
        icon: Building2,
        description: "Partner directory",
      },
      {
        href: "/admin/tickets",
        label: "Support",
        icon: MessageSquare,
        badgeKey: "support",
        description: "Customer tickets",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        description: "Configuration",
      },
    ],
  },
];
interface AdminShellProps {
  children: ReactNode;
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
  hideNav?: boolean;
}
export function AdminShell({
  children,
  dateFilter,
  onDateFilterChange,
  hideNav
}: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const { counts } = useSidebarCounts();
  const { data: caps } = useCapabilities("admin");
  useGlobalRealtime();
  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingCode.trim()) {
      navigate(`/admin/bookings?code=${encodeURIComponent(bookingCode.trim())}`);
      setBookingCode("");
    }
  };
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore session-related errors - session already expired
    }
    toast({
      title: "Signed out"
    });
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
    return <div className="min-h-screen bg-background">
        {children}
      </div>;
  }
  return <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar - hidden on mobile, visible on tablet+ */}
      <aside className="w-60 border-r border-border bg-card hidden md:flex flex-col shrink-0">
        <div className="p-4 lg:p-5 border-b border-border">
          <Link to="/" className="flex items-center">
            <img src={c2cLogo} alt="C2C Rental" className="h-8 lg:h-9 w-auto" />
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Admin Console</p>
        </div>
        
        <nav className="flex-1 p-2 lg:p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navGroups.map((group, index) => (
            <div key={group.title}>
              {index > 0 && <div className="py-2"><div className="h-px bg-border/40" /></div>}
              <p className={cn(
                "px-2 lg:px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                group.priority ? "text-destructive/80" : "text-muted-foreground/60"
              )}>
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
                  return (
                    <Link 
                      key={item.href + item.label} 
                      to={item.href}
                      title={item.description}
                      className={cn(
                        "flex items-center gap-2 lg:gap-2.5 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-colors", 
                        isActive(item.href) 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {badgeCount > 0 && (
                        <Badge 
                          variant={group.priority ? "destructive" : "secondary"} 
                          className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center shrink-0"
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Ops Panel Switch */}
          {caps?.canAccessOpsPanel && (
            <div className="pt-4 mt-4 border-t border-border">
              <Link
                to="/ops"
                className="flex items-center gap-2 lg:gap-2.5 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Ops Panel</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-3 lg:p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2026 C2C Rental</p>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 animate-slide-up overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">C2C Rental Admin</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-0.5">
              {navGroups.map((group, index) => (
                <div key={group.title}>
                  {index > 0 && <div className="py-2"><div className="h-px bg-border/40" /></div>}
                  <p className={cn(
                    "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                    group.priority ? "text-destructive/80" : "text-muted-foreground/60"
                  )}>
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
                      return (
                        <Link 
                          key={item.href + item.label} 
                          to={item.href} 
                          onClick={() => setMobileMenuOpen(false)}
                          title={item.description}
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
                              variant={group.priority ? "destructive" : "secondary"} 
                              className="ml-auto text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center"
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Ops Panel Switch - Mobile */}
              {caps?.canAccessOpsPanel && (
                <div className="pt-4 mt-4 border-t border-border">
                  <Link
                    to="/ops"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Ops Panel
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </div>}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="h-12 md:h-14 border-b border-border bg-card sticky top-0 z-40 flex items-center px-3 md:px-4 lg:px-5 gap-2 md:gap-3">
          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          {/* Booking Code Scanner */}
          <form onSubmit={handleBookingSearch} className="flex-1 max-w-[180px] sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search..." 
                value={bookingCode} 
                onChange={e => setBookingCode(e.target.value.toUpperCase())} 
                className="pl-7 md:pl-9 h-8 md:h-9 bg-secondary border-0 text-sm" 
              />
            </div>
          </form>

          {/* Date Quick Filter - hidden on mobile */}
          {onDateFilterChange && (
            <Select value={dateFilter || "today"} onValueChange={onDateFilterChange}>
              <SelectTrigger className="w-[100px] md:w-[130px] h-8 md:h-9 bg-secondary border-0 hidden sm:flex">
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
              <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-2 md:px-3">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px]">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
                <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hidden sm:block" />
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
        <main className="flex-1 p-3 md:p-4 lg:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>;
}