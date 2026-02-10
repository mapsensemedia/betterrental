import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, differenceInMinutes, isPast, addHours } from "date-fns";

export interface ActiveRental {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  userId: string;
  vehicleId: string;
  locationId: string;
  // Duration tracking
  durationHours: number;
  remainingHours: number;
  remainingMinutes: number;
  // Overdue risk
  isOverdue: boolean;
  overdueHours: number;
  isApproachingReturn: boolean; // within 2 hours
  isWarningZone: boolean; // within 6 hours
  // Joined data
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
  } | null;
  customer: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

/**
 * Fetch all active rentals with duration and overdue risk tracking
 */
export function useActiveRentals() {
  return useQuery<ActiveRental[]>({
    queryKey: ["active-rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          locations!location_id (id, name, city)
        `)
        .eq("status", "active")
        .order("end_at", { ascending: true });

      if (error) {
        console.error("Error fetching active rentals:", error);
        throw error;
      }

      // Fetch categories separately (vehicle_id now points to categories)
      const categoryIds = [...new Set((data || []).map(b => b.vehicle_id).filter(Boolean))];
      const { data: categoriesData } = categoryIds.length > 0
        ? await supabase
            .from("vehicle_categories")
            .select("id, name, image_url")
            .in("id", categoryIds)
        : { data: [] };

      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

      // Fetch customer profiles
      const userIds = [...new Set((data || []).map(b => b.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const now = new Date();

      return (data || []).map((b: any) => {
        const startAt = new Date(b.start_at);
        const endAt = new Date(b.end_at);
        const profile = profilesMap.get(b.user_id);
        const category = categoriesMap.get(b.vehicle_id);

        // Duration calculations
        const durationHours = differenceInHours(now, startAt);
        const remainingMinutes = differenceInMinutes(endAt, now);
        const remainingHours = Math.floor(remainingMinutes / 60);
        
        // Overdue tracking
        const isOverdue = isPast(endAt);
        const overdueHours = isOverdue ? differenceInHours(now, endAt) : 0;
        
        // Warning zones
        const twoHoursFromNow = addHours(now, 2);
        const sixHoursFromNow = addHours(now, 6);
        const isApproachingReturn = !isOverdue && endAt <= twoHoursFromNow;
        const isWarningZone = !isOverdue && !isApproachingReturn && endAt <= sixHoursFromNow;

        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          userId: b.user_id,
          vehicleId: b.vehicle_id,
          locationId: b.location_id,
          // Duration
          durationHours,
          remainingHours,
          remainingMinutes,
          // Overdue risk
          isOverdue,
          overdueHours,
          isApproachingReturn,
          isWarningZone,
          // Joined data
          vehicle: category ? {
            id: category.id,
            make: "",
            model: category.name,
            year: new Date().getFullYear(),
            imageUrl: category.image_url,
          } : null,
          location: b.locations ? {
            id: b.locations.id,
            name: b.locations.name,
            city: b.locations.city,
          } : null,
          customer: profile ? {
            id: profile.id,
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
        };
      });
    },
    staleTime: 60000, // 1 minute - realtime handles updates now
    refetchInterval: false, // Disabled - using realtime instead
  });
}

/**
 * Get summary stats for active rentals
 */
export function useActiveRentalStats() {
  const { data: rentals = [], ...rest } = useActiveRentals();

  const stats = {
    total: rentals.length,
    overdue: rentals.filter(r => r.isOverdue).length,
    approaching: rentals.filter(r => r.isApproachingReturn).length,
    warning: rentals.filter(r => r.isWarningZone).length,
    healthy: rentals.filter(r => !r.isOverdue && !r.isApproachingReturn && !r.isWarningZone).length,
  };

  return { stats, rentals, ...rest };
}
