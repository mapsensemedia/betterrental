import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, FileText, Upload, Eye, Shield, FileCheck, X, Star, Gift, KeyRound } from "lucide-react";
import { useLicenseUpload } from "@/hooks/use-license-upload";
import { useToast } from "@/hooks/use-toast";
import { useMembershipInfo, usePointsLedger } from "@/hooks/use-points";
import { useActiveOffers } from "@/hooks/use-offers";
import { useCustomerMarkReturned } from "@/hooks/use-late-return";
import { canCustomerMarkReturned } from "@/lib/late-return";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BookingRow = {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  total_amount: number;
  customer_marked_returned_at: string | null;
  vehicle_categories: { name: string; image_url: string | null } | null;
  locations: { name: string; city: string } | null;
};

type VerificationRow = {
  id: string;
  status: string;
  booking_id: string | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { licenseStatus, uploading, uploadLicense } = useLicenseUpload(user?.id);
  const { data: membership } = useMembershipInfo();
  const { data: offers = [] } = useActiveOffers();
  const markReturned = useCustomerMarkReturned();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?returnUrl=${encodeURIComponent("/dashboard")}`, { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Handle file upload
  const handleLicenseUpload = async () => {
    if (!selectedFile) return;
    await uploadLicense(selectedFile, "front");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingRow[]>({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, booking_code, status, start_at, end_at, total_amount, customer_marked_returned_at, vehicle_id,
           locations (name, city)`
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;

      // Fetch vehicle categories separately (vehicle_id now points to categories)
      const vehicleIds = [...new Set((data || []).map(b => b.vehicle_id).filter(Boolean))];
      let categoriesMap = new Map();
      
      if (vehicleIds.length > 0) {
        const { data: categories } = await supabase
          .from("vehicle_categories")
          .select("id, name, image_url")
          .in("id", vehicleIds);
        
        categoriesMap = new Map((categories || []).map(c => [c.id, c]));
      }

      return (data || []).map(b => ({
        ...b,
        vehicle_categories: categoriesMap.get(b.vehicle_id) || null,
      })) as any;
    },
    staleTime: 10_000,
  });

  // Fetch pending verifications for this user
  const { data: verifications = [] } = useQuery<VerificationRow[]>({
    queryKey: ["my-verifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("id, status, booking_id")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10_000,
  });

  // Fetch rental agreements for user's bookings
  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings]);
  const { data: agreements = [] } = useQuery({
    queryKey: ["my-agreements", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_agreements")
        .select("id, booking_id, status")
        .in("booking_id", bookingIds);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10_000,
  });

  const { activeCount, pastCount, pendingVerifications, pendingAgreements } = useMemo(() => {
    const now = Date.now();

    const upcoming = bookings.filter((b) => {
      const end = new Date(b.end_at).getTime();
      return ["pending", "confirmed", "active"].includes(b.status) && end >= now;
    });

    const past = bookings.filter((b) => {
      const end = new Date(b.end_at).getTime();
      return ["completed", "cancelled"].includes(b.status) || end < now;
    });

    const pendingVer = verifications.filter(v => v.status === "pending").length;
    const pendingAgr = agreements.filter(a => a.status === "pending").length;

    return { 
      activeCount: upcoming.length, 
      pastCount: past.length,
      pendingVerifications: pendingVer,
      pendingAgreements: pendingAgr,
    };
  }, [bookings, verifications, agreements]);

  // Helper to get booking status info
  const getBookingStatusInfo = (booking: BookingRow) => {
    const verification = verifications.find(v => v.booking_id === booking.id);
    const agreement = agreements.find(a => a.booking_id === booking.id);
    
    const issues: string[] = [];
    if (booking.status === "confirmed") {
      if (!verification || verification.status === "pending") {
        issues.push("License pending");
      } else if (verification.status === "rejected") {
        issues.push("License rejected");
      }
      if (!agreement) {
        issues.push("Agreement pending");
      } else if (agreement.status === "pending") {
        issues.push("Sign agreement");
      }
    }
    return issues;
  };

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <header className="mb-8">
          <h1 className="heading-2">My Car Rental Dashboard</h1>
          <p className="text-muted-foreground">View your upcoming and past bookings.</p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-10" aria-label="Booking summary">
          <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2 text-sm sm:text-base">Upcoming</h2>
            {bookingsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-primary">{activeCount}</p>
            )}
          </div>
          <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2 text-sm sm:text-base">Past</h2>
            {bookingsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold">{pastCount}</p>
            )}
          </div>
          <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2 text-sm sm:text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pending Verification</span>
              <span className="sm:hidden">Pending</span>
            </h2>
            <p className={`text-2xl sm:text-3xl font-bold ${pendingVerifications > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
              {pendingVerifications}
            </p>
          </div>
          <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border">
            <h2 className="font-semibold mb-2 text-sm sm:text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Awaiting Signature</span>
              <span className="sm:hidden">Signature</span>
            </h2>
            <p className={`text-2xl sm:text-3xl font-bold ${pendingAgreements > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
              {pendingAgreements}
            </p>
          </div>
        </section>

        {/* Loyalty Points Section */}
        {membership && (
          <section className="mb-10 p-6 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Loyalty Points
              </h2>
              <Badge variant="outline" className="capitalize">{membership.tier}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
                <p className="text-3xl font-bold text-primary">{membership.pointsBalance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="font-medium">
                  {membership.joinedAt 
                    ? new Date(membership.joinedAt).toLocaleDateString() 
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">ID: {membership.memberId || "—"}</p>
              </div>
            </div>

            {offers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4" />
                  Available Offers ({offers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {offers.slice(0, 3).map(offer => (
                    <Badge key={offer.id} variant="secondary" className="text-xs">
                      {offer.name} • {offer.pointsRequired} pts
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Documents Section */}
        <section className="mb-10 p-6 bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-3 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              My Documents
            </h2>
          </div>
          
          <div className="space-y-4">
            {/* Driver's License Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${licenseStatus?.status === "on_file" ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                  {licenseStatus?.status === "on_file" ? (
                    <FileCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Driver's License</p>
                  <p className="text-sm text-muted-foreground">
                    {licenseStatus?.status === "on_file" 
                      ? "On file — ready for pickup"
                      : "Not uploaded — you can upload before your first pickup"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {licenseStatus?.frontUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(licenseStatus.frontUrl!, "_blank")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
                
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                      {selectedFile.name}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleLicenseUpload}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant={licenseStatus?.status === "on_file" ? "outline" : "default"}
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {licenseStatus?.status === "on_file" ? "Replace" : "Upload"}
                  </Button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
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
              {bookings.map((b) => {
                const issues = getBookingStatusInfo(b);
                const showMarkReturned = canCustomerMarkReturned(b.status, b.end_at, b.customer_marked_returned_at);
                const isMarkedReturned = !!b.customer_marked_returned_at;
                
                return (
                  <article key={b.id} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm px-3 py-1 rounded-xl bg-muted border border-border">
                            {b.booking_code}
                          </span>
                          <StatusBadge status={b.status as any} />
                          {isMarkedReturned && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                              <KeyRound className="h-3 w-3" />
                              Keys dropped
                            </Badge>
                          )}
                          {issues.length > 0 && (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/50 gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {issues[0]}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold">
                          {b.vehicle_categories?.name || "Vehicle"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(b.start_at).toLocaleDateString()} → {new Date(b.end_at).toLocaleDateString()}
                          {b.locations ? ` • ${b.locations.name}, ${b.locations.city}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {showMarkReturned && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1">
                                <KeyRound className="h-4 w-4" />
                                Mark Returned
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Key Drop Return</AlertDialogTitle>
                                <AlertDialogDescription>
                                  By marking this vehicle as returned, you confirm that you have dropped off the keys at the designated location. This will stop any late return fee calculation.
                                  <br /><br />
                                  <strong>Note:</strong> The office will verify the vehicle condition when they open. Any issues found may result in additional charges.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => markReturned.mutate({ bookingId: b.id })}
                                  disabled={markReturned.isPending}
                                >
                                  {markReturned.isPending ? "Marking..." : "Confirm Return"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
                );
              })}
            </div>
          )}
        </main>
      </PageContainer>
    </CustomerLayout>
  );
}
