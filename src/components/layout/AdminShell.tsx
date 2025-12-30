import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, BookOpen, Receipt, ArrowRightLeft, RotateCcw, Car, Calendar, AlertTriangle, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/alerts", label: "Alerts", icon: Bell },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
  { href: "/admin/handovers", label: "Handovers", icon: ArrowRightLeft },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw },
  { href: "/admin/inventory", label: "Inventory", icon: Car },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/damages", label: "Damages", icon: AlertTriangle },
  { href: "/admin/tickets", label: "Tickets", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-card p-4 hidden lg:block">
        <Link to="/" className="text-xl font-bold mb-8 block">LuxeRide Admin</Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors", location.pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
