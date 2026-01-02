import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type BookingRow = {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  vehicles: { make: string; model: string; year: number; image_url: string | null } | null;
  locations: { name: string; city: string } | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?returnUrl=${encodeURIComponent("/dashboard")}`, { replace: true });
    }
  }, [user, isLoading, navigate]);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingRow[]>({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, booking_code, status, start_at, end_at, total_amount,
           vehicles (make, model, year, image_url),
           locations (name, city)`
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      return (data || []) as any;
    },
    staleTime: 10_000,
  });

  const { activeCount, pastCount } = useMemo(() => {
    const now = Date.now();

    const upcoming = bookings.filter((b) => {
      const end = new Date(b.end_at).getTime();
      return ["pending", "confirmed", "active"].includes(b.status) && end >= now;
    });

    const past = bookings.filter((b) => {
      const end = new Date(b.end_at).getTime();
      return ["completed", "cancelled"].includes(b.status) || end < now;
    });

    return { activeCount: upcoming.length, pastCount: past.length };
  }, [bookings]);

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <header className="mb-8">
          <h1 className="heading-2">My Car Rental Dashboard</h1>
          <p className="text-muted-foreground">View your upcoming and past bookings.</p>
        </header>

        <section className="grid md:grid-cols-3 gap-6 mb-10" aria-label="Booking summary">
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2">Upcoming Bookings</h2>
            {bookingsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <p className="text-3xl font-bold text-primary">{activeCount}</p>
            )}
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2">Past Rentals</h2>
            {bookingsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <p className="text-3xl font-bold">{pastCount}</p>
            )}
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2">Pending Verification</h2>
            <p className="text-3xl font-bold text-warning">0</p>
          </div>
        </section>

        <main className="space-y-4" aria-label="My bookings">
          <div className="flex items-center justify-between">
            <h2 className="heading-3">My Bookings</h2>
            <Button variant="outline" asChild>
              <Link to="/search">Book another car</Link>
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 bg-card rounded-2xl border border-border text-center">
              <p className="text-muted-foreground mb-4">No bookings yet.</p>
              <Button asChild>
                <Link to="/search">Browse cars</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((b) => (
                <article key={b.id} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm px-3 py-1 rounded-xl bg-muted border border-border">
                          {b.booking_code}
                        </span>
                        <StatusBadge status={b.status as any} />
                      </div>
                      <p className="font-semibold">
                        {b.vehicles ? `${b.vehicles.year} ${b.vehicles.make} ${b.vehicles.model}` : "Vehicle"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(b.start_at).toLocaleDateString()} → {new Date(b.end_at).toLocaleDateString()}
                        {b.locations ? ` • ${b.locations.name}, ${b.locations.city}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-semibold">${Number(b.total_amount).toFixed(0)}</p>
                      </div>
                      <Button asChild>
                        <Link to={`/booking/${b.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </PageContainer>
    </CustomerLayout>
  );
}
