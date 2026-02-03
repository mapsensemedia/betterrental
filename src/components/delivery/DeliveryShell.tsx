import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { useMyDeliveries } from "@/hooks/use-my-deliveries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DeliveryShellProps {
  children: ReactNode;
}

const navItems = [
  {
    title: "My Deliveries",
    href: "/delivery",
    icon: Truck,
    description: "View assigned deliveries",
  },
  {
    title: "Walk-In Booking",
    href: "/delivery/walk-in",
    icon: Plus,
    description: "Create a new booking",
  },
];

export function DeliveryShell({ children }: DeliveryShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: deliveries } = useMyDeliveries();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const getInitials = () => {
    const email = user?.email || "";
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    const name = meta?.full_name || email;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Count deliveries by status
  const statusCounts = {
    assigned: deliveries?.filter(d => d.deliveryStatus === "assigned").length || 0,
    en_route: deliveries?.filter(d => d.deliveryStatus === "en_route" || d.deliveryStatus === "picked_up").length || 0,
    delivered: deliveries?.filter(d => d.deliveryStatus === "delivered").length || 0,
  };

  const totalPending = statusCounts.assigned + statusCounts.en_route;

  const statusFilters = [
    { key: "assigned", label: "Pending", count: statusCounts.assigned, icon: Clock, className: "text-amber-600" },
    { key: "en_route", label: "En Route", count: statusCounts.en_route, icon: MapPin, className: "text-blue-600" },
    { key: "delivered", label: "Completed", count: statusCounts.delivered, icon: CheckCircle, className: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link to="/delivery" className="flex items-center gap-2 font-semibold">
            <Truck className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Delivery Portal</span>
          </Link>

          {/* Delivery Count */}
          <Badge variant="secondary" className="ml-2 gap-1">
            <Truck className="h-3 w-3" />
            {totalPending} pending
          </Badge>

          <div className="flex-1" />

          {/* Admin Dashboard Link (if has admin access) */}
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link to="/admin">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{(user?.user_metadata as any)?.full_name || "Driver"}</p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r pt-14 transition-transform duration-200 lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="flex flex-col h-full p-4 space-y-1">
            {/* Main Nav */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}

            {/* Status Filters Section */}
            <div className="pt-4 mt-4 border-t">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Filter by Status
              </p>
              {statusFilters.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={`/delivery?status=${item.key}`}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={cn("h-3.5 w-3.5", item.className)} />
                      {item.label}
                    </span>
                    {item.count > 0 && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {item.count}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
