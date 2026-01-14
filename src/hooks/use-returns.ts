import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addHours } from "date-fns";
import { batchFetchProfiles, batchFetchConditionPhotos, batchFetchInspections, batchFetchDamages } from "@/lib/booking-helpers";

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
  // Return state tracking
  returnState: string | null;
  returnStartedAt: string | null;
  returnIntakeCompletedAt: string | null;
  returnEvidenceCompletedAt: string | null;
  returnIssuesReviewedAt: string | null;
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

      // Use batch utilities to prevent N+1 queries
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const bookingIds = bookings.map(b => b.id);

      const [profilesMap, photosMap, inspectionsMap, damagesMap] = await Promise.all([
        batchFetchProfiles(userIds),
        batchFetchConditionPhotos(bookingIds),
        batchFetchInspections(bookingIds),
        batchFetchDamages(bookingIds),
      ]);

      return bookings.map((b: any) => {
        const profile = profilesMap.get(b.user_id);
        const photos = photosMap.get(b.id);
        const inspection = inspectionsMap.get(b.id);
        const damageCount = damagesMap.get(b.id) || 0;

        const hasReturnPhotos = photos?.hasReturn || false;
        const hasFuelOdometerPhotos = photos?.hasFuelOdometer || inspection?.hasFuelOdometer || false;
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
          // Return state tracking
          returnState: b.return_state,
          returnStartedAt: b.return_started_at,
          returnIntakeCompletedAt: b.return_intake_completed_at,
          returnEvidenceCompletedAt: b.return_evidence_completed_at,
          returnIssuesReviewedAt: b.return_issues_reviewed_at,
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
