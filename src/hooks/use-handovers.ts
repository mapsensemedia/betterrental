import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addHours } from "date-fns";

export interface HandoverBooking {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  userId: string;
  vehicleId: string;
  locationId: string;
  // Delivery info
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    imageUrl: string | null;
    isAvailable: boolean | null;
    cleaningBufferHours: number | null;
  } | null;
  location: {
    id: string;
    name: string;
    city: string;
    address?: string;
  } | null;
  profile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  // Readiness checks
  paymentStatus: "paid" | "pending" | "partial";
  verificationStatus: "verified" | "pending" | "rejected";
  vehicleReady: boolean;
  bufferCleared: boolean;
}

type DateFilter = "today" | "next24h" | "week";

export function useHandovers(dateFilter: DateFilter = "today", locationId?: string) {
  return useQuery<HandoverBooking[]>({
    queryKey: ["admin-handovers", dateFilter, locationId],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "next24h":
          startDate = now;
          endDate = addHours(now, 24);
          break;
        case "week":
          startDate = startOfDay(now);
          endDate = addHours(startOfDay(now), 24 * 7);
          break;
        default:
          startDate = startOfDay(now);
          endDate = endOfDay(now);
      }

      let query = supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year, image_url, is_available, cleaning_buffer_hours),
          locations (id, name, city, address)
        `)
        .in("status", ["pending", "confirmed"])
        .gte("start_at", startDate.toISOString())
        .lte("start_at", endDate.toISOString())
        .order("start_at", { ascending: true });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error("Error fetching handovers:", error);
        throw error;
      }

      if (!bookings || bookings.length === 0) return [];

      // Fetch profiles, payments, and verifications
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const bookingIds = bookings.map(b => b.id);

      const [profilesRes, paymentsRes, verificationsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds),
        supabase.from("payments").select("booking_id, amount, status").in("booking_id", bookingIds),
        supabase.from("verification_requests").select("booking_id, status").in("booking_id", bookingIds),
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const paymentsMap = new Map<string, { total: number; paid: number }>();
      const verificationsMap = new Map<string, string>();

      (paymentsRes.data || []).forEach(p => {
        const existing = paymentsMap.get(p.booking_id) || { total: 0, paid: 0 };
        existing.total += Number(p.amount);
        if (p.status === "completed") existing.paid += Number(p.amount);
        paymentsMap.set(p.booking_id, existing);
      });

      (verificationsRes.data || []).forEach(v => {
        verificationsMap.set(v.booking_id, v.status);
      });

      // Check for any active bookings that might affect buffer
      const vehicleIds = [...new Set(bookings.map(b => b.vehicle_id))];
      const { data: recentBookings } = await supabase
        .from("bookings")
        .select("vehicle_id, end_at, status")
        .in("vehicle_id", vehicleIds)
        .in("status", ["active", "completed"])
        .gte("end_at", addHours(now, -4).toISOString())
        .lte("end_at", now.toISOString());

      const vehicleLastReturnMap = new Map<string, Date>();
      (recentBookings || []).forEach(b => {
        const existing = vehicleLastReturnMap.get(b.vehicle_id);
        const endAt = new Date(b.end_at);
        if (!existing || endAt > existing) {
          vehicleLastReturnMap.set(b.vehicle_id, endAt);
        }
      });

      return bookings.map((b: any) => {
        const profile = profilesMap.get(b.user_id);
        const payment = paymentsMap.get(b.id);
        const verification = verificationsMap.get(b.id);
        const vehicle = b.vehicles;
        const lastReturn = vehicleLastReturnMap.get(b.vehicle_id);
        const bufferHours = vehicle?.cleaning_buffer_hours || 2;
        
        // Calculate readiness
        let paymentStatus: "paid" | "pending" | "partial" = "pending";
        if (payment) {
          if (payment.paid >= b.total_amount) paymentStatus = "paid";
          else if (payment.paid > 0) paymentStatus = "partial";
        }

        const verificationStatus = (verification as "verified" | "pending" | "rejected") || "pending";
        const vehicleReady = vehicle?.is_available !== false;
        
        let bufferCleared = true;
        if (lastReturn) {
          const bufferEnd = addHours(lastReturn, bufferHours);
          bufferCleared = new Date(b.start_at) >= bufferEnd;
        }

        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          totalAmount: Number(b.total_amount),
          userId: b.user_id,
          vehicleId: b.vehicle_id,
          locationId: b.location_id,
          pickupAddress: b.pickup_address,
          pickupLat: b.pickup_lat,
          pickupLng: b.pickup_lng,
          vehicle: vehicle ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            imageUrl: vehicle.image_url,
            isAvailable: vehicle.is_available,
            cleaningBufferHours: vehicle.cleaning_buffer_hours,
          } : null,
          location: b.locations ? {
            id: b.locations.id,
            name: b.locations.name,
            city: b.locations.city,
            address: b.locations.address,
          } : null,
          profile: profile ? {
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
          paymentStatus,
          verificationStatus,
          vehicleReady,
          bufferCleared,
        };
      });
    },
    staleTime: 30000,
  });
}
