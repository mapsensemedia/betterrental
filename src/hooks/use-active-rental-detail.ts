import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";

export interface ActiveRentalDetail {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  pickupAddress: string | null;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number | null;
  taxAmount: number | null;
  userId: string;
  vehicleId: string;
  locationId: string;
  // Calculated fields
  activatedAt: string; // Using start_at as activation time for active rentals
  isOverdue: boolean;
  overdueHours: number;
  // Joined data
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    imageUrl: string | null;
    category: string;
    fuelType: string | null;
    transmission: string | null;
  } | null;
  location: {
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string | null;
  } | null;
  customer: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    isVerified: boolean;
  } | null;
  // Status checks
  hasPaymentCompleted: boolean;
  hasDepositHeld: boolean;
  hasVerificationApproved: boolean;
  hasAgreementSigned: boolean;
  hasWalkaroundComplete: boolean;
  // Related counts
  openAlertsCount: number;
  openTicketsCount: number;
  // Related data
  recentAlerts: Array<{
    id: string;
    title: string;
    alertType: string;
    status: string;
    createdAt: string;
  }>;
  recentTickets: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
  }>;
}

/**
 * Fetch detailed info for a single active rental
 */
export function useActiveRentalDetail(bookingId: string | null) {
  return useQuery<ActiveRentalDetail | null>({
    queryKey: ["active-rental-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Fetch booking with vehicle and location
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year, image_url, category, fuel_type, transmission),
          locations (id, name, city, address, phone)
        `)
        .eq("id", bookingId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Error fetching active rental:", error);
        throw error;
      }

      if (!booking) return null;

      // Fetch customer profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_verified")
        .eq("id", booking.user_id)
        .maybeSingle();

      // Fetch related data in parallel
      const [
        paymentsRes,
        verificationsRes,
        agreementRes,
        walkaroundRes,
        alertsRes,
        ticketsRes,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("status", "completed"),
        supabase
          .from("verification_requests")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("status", "verified"),
        supabase
          .from("rental_agreements")
          .select("*")
          .eq("booking_id", bookingId)
          .not("customer_signed_at", "is", null),
        supabase
          .from("walkaround_inspections")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("inspection_complete", true),
        supabase
          .from("admin_alerts")
          .select("id, title, alert_type, status, created_at")
          .eq("booking_id", bookingId)
          .in("status", ["pending", "acknowledged"])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("tickets")
          .select("id, subject, status, created_at")
          .eq("booking_id", bookingId)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const now = new Date();
      const endAt = new Date(booking.end_at);
      const isOverdue = isPast(endAt);
      const overdueHours = isOverdue ? differenceInHours(now, endAt) : 0;

      // Check for deposit payment
      const hasDepositPayment = (paymentsRes.data || []).some(
        (p: any) => p.payment_type === "deposit"
      );

      return {
        id: booking.id,
        bookingCode: booking.booking_code,
        status: booking.status,
        startAt: booking.start_at,
        endAt: booking.end_at,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        notes: booking.notes,
        pickupAddress: booking.pickup_address,
        dailyRate: Number(booking.daily_rate),
        totalAmount: Number(booking.total_amount),
        depositAmount: booking.deposit_amount ? Number(booking.deposit_amount) : null,
        taxAmount: booking.tax_amount ? Number(booking.tax_amount) : null,
        userId: booking.user_id,
        vehicleId: booking.vehicle_id,
        locationId: booking.location_id,
        activatedAt: booking.start_at, // For active rentals, start_at is activation time
        isOverdue,
        overdueHours,
        vehicle: booking.vehicles
          ? {
              id: booking.vehicles.id,
              make: booking.vehicles.make,
              model: booking.vehicles.model,
              year: booking.vehicles.year,
              imageUrl: booking.vehicles.image_url,
              category: booking.vehicles.category,
              fuelType: booking.vehicles.fuel_type,
              transmission: booking.vehicles.transmission,
            }
          : null,
        location: booking.locations
          ? {
              id: booking.locations.id,
              name: booking.locations.name,
              city: booking.locations.city,
              address: booking.locations.address,
              phone: booking.locations.phone,
            }
          : null,
        customer: profile
          ? {
              id: profile.id,
              fullName: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              isVerified: profile.is_verified || false,
            }
          : null,
        hasPaymentCompleted: (paymentsRes.data || []).length > 0,
        hasDepositHeld: hasDepositPayment,
        hasVerificationApproved: (verificationsRes.data || []).length > 0,
        hasAgreementSigned: (agreementRes.data || []).length > 0,
        hasWalkaroundComplete: (walkaroundRes.data || []).length > 0,
        openAlertsCount: (alertsRes.data || []).length,
        openTicketsCount: (ticketsRes.data || []).length,
        recentAlerts: (alertsRes.data || []).slice(0, 3).map((a: any) => ({
          id: a.id,
          title: a.title,
          alertType: a.alert_type,
          status: a.status,
          createdAt: a.created_at,
        })),
        recentTickets: (ticketsRes.data || []).slice(0, 3).map((t: any) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          createdAt: t.created_at,
        })),
      };
    },
    enabled: !!bookingId,
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Calculate live duration values for an active rental
 */
export function calculateDuration(startAt: string, endAt: string) {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  const elapsedSeconds = differenceInSeconds(now, start);
  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMinutes = Math.floor((elapsedSeconds % 3600) / 60);
  const elapsedSecondsRemainder = elapsedSeconds % 60;

  const remainingSeconds = differenceInSeconds(end, now);
  const isOverdue = remainingSeconds < 0;
  const absRemainingSeconds = Math.abs(remainingSeconds);
  const remainingHours = Math.floor(absRemainingSeconds / 3600);
  const remainingMinutes = Math.floor((absRemainingSeconds % 3600) / 60);
  const remainingSecondsRemainder = absRemainingSeconds % 60;

  return {
    elapsedHours,
    elapsedMinutes,
    elapsedSeconds: elapsedSecondsRemainder,
    remainingHours,
    remainingMinutes,
    remainingSeconds: remainingSecondsRemainder,
    isOverdue,
    totalElapsedSeconds: elapsedSeconds,
    totalRemainingSeconds: remainingSeconds,
  };
}
