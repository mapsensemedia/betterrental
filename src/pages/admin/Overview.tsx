import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminOverview() {
  return (
    <AdminShell>
      <h1 className="heading-2 mb-8">Dashboard Overview</h1>
      <div className="grid md:grid-cols-4 gap-6">
        <div className="p-6 bg-card rounded-2xl border border-border"><h3 className="text-muted-foreground text-sm">Active Bookings</h3><p className="text-3xl font-bold mt-2">12</p></div>
        <div className="p-6 bg-card rounded-2xl border border-border"><h3 className="text-muted-foreground text-sm">Pending Handovers</h3><p className="text-3xl font-bold mt-2 text-warning">3</p></div>
        <div className="p-6 bg-card rounded-2xl border border-border"><h3 className="text-muted-foreground text-sm">Returns Today</h3><p className="text-3xl font-bold mt-2">5</p></div>
        <div className="p-6 bg-card rounded-2xl border border-border"><h3 className="text-muted-foreground text-sm">Alerts</h3><p className="text-3xl font-bold mt-2 text-destructive">2</p></div>
      </div>
    </AdminShell>
  );
}
