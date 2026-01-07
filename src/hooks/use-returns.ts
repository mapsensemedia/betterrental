import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addHours } from "date-fns";

export interface ReturnBooking {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  depositAmount: number | null;
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
  } | null;
  // Evidence flags
  hasReturnPhotos: boolean;
  hasFuelOdometerPhotos: boolean;
  hasDamageReport: boolean;
  damageCount: number;
  canSettle: boolean;
}

type DateFilter = "today" | "next24h" | "week";

export function useReturns(dateFilter: DateFilter = "today", locationId?: string) {
  return useQuery<ReturnBooking[]>({
    queryKey: ["admin-returns", dateFilter, locationId],
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
          vehicles (id, make, model, year, image_url),
          locations (id, name, city, address)
        `)
        .eq("status", "active")
        .gte("end_at", startDate.toISOString())
        .lte("end_at", endDate.toISOString())
        .order("end_at", { ascending: true });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error("Error fetching returns:", error);
        throw error;
      }

      if (!bookings || bookings.length === 0) return [];

      // Fetch profiles, photos, inspections, and damage reports
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const bookingIds = bookings.map(b => b.id);

      const [profilesRes, photosRes, inspectionsRes, damagesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("condition_photos").select("booking_id, phase, photo_type").in("booking_id", bookingIds),
        supabase.from("inspection_metrics").select("booking_id, phase, fuel_level, odometer").in("booking_id", bookingIds),
        supabase.from("damage_reports").select("booking_id, id, status").in("booking_id", bookingIds),
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      
      // Group photos by booking
      const photosMap = new Map<string, { return: boolean; fuelOdometer: boolean }>();
      (photosRes.data || []).forEach(p => {
        const existing = photosMap.get(p.booking_id) || { return: false, fuelOdometer: false };
        if (p.phase === "return") {
          existing.return = true;
          if (p.photo_type === "fuel" || p.photo_type === "odometer") {
            existing.fuelOdometer = true;
          }
        }
        photosMap.set(p.booking_id, existing);
      });

      // Check for return inspections
      const inspectionsMap = new Map<string, boolean>();
      (inspectionsRes.data || []).forEach(i => {
        if (i.phase === "return" && i.fuel_level !== null && i.odometer !== null) {
          inspectionsMap.set(i.booking_id, true);
        }
      });

      // Group damages by booking
      const damagesMap = new Map<string, number>();
      (damagesRes.data || []).forEach(d => {
        const count = damagesMap.get(d.booking_id) || 0;
        damagesMap.set(d.booking_id, count + 1);
      });

      return bookings.map((b: any) => {
        const profile = profilesMap.get(b.user_id);
        const photos = photosMap.get(b.id) || { return: false, fuelOdometer: false };
        const hasInspection = inspectionsMap.get(b.id) || false;
        const damageCount = damagesMap.get(b.id) || 0;

        const hasReturnPhotos = photos.return;
        const hasFuelOdometerPhotos = photos.fuelOdometer || hasInspection;
        const hasDamageReport = damageCount > 0;
        
        // Can settle if all evidence exists and no damage
        const canSettle = hasReturnPhotos && hasFuelOdometerPhotos && !hasDamageReport;

        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          totalAmount: Number(b.total_amount),
          depositAmount: b.deposit_amount ? Number(b.deposit_amount) : null,
          userId: b.user_id,
          vehicleId: b.vehicle_id,
          locationId: b.location_id,
          pickupAddress: b.pickup_address,
          pickupLat: b.pickup_lat,
          pickupLng: b.pickup_lng,
          vehicle: b.vehicles ? {
            id: b.vehicles.id,
            make: b.vehicles.make,
            model: b.vehicles.model,
            year: b.vehicles.year,
            imageUrl: b.vehicles.image_url,
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
          } : null,
          hasReturnPhotos,
          hasFuelOdometerPhotos,
          hasDamageReport,
          damageCount,
          canSettle,
        };
      });
    },
    staleTime: 30000,
  });
}
