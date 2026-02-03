import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export type DeliveryStatus = "assigned" | "picked_up" | "en_route" | "delivered" | "issue" | "cancelled";

export interface DeliveryBooking {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  pickupAddress: string | null;
  pickupContactName: string | null;
  pickupContactPhone: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  specialInstructions: string | null;
  deliveryStatus: DeliveryStatus | null;
  customer: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  vehicle: {
    make: string;
    model: string;
    year: number;
  } | null;
  category: {
    name: string;
  } | null;
  location: {
    name: string;
    address: string;
  } | null;
}

export function useMyDeliveries(statusFilter?: DeliveryStatus | "all") {
  const { user } = useAuth();

  return useQuery<DeliveryBooking[]>({
    queryKey: ["my-deliveries", user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];

      // Get bookings assigned to this driver
      let query = supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          status,
          start_at,
          end_at,
          pickup_address,
          pickup_contact_name,
          pickup_contact_phone,
          pickup_lat,
          pickup_lng,
          special_instructions,
          user_id,
          vehicle_id,
          location_id
        `)
        .eq("assigned_driver_id", user.id)
        .in("status", ["confirmed", "active"])
        .order("start_at", { ascending: true });

      const { data: bookings, error } = await query;

      if (error) {
        console.error("Error fetching deliveries:", error);
        throw error;
      }

      if (!bookings || bookings.length === 0) return [];

      // Get delivery statuses for these bookings
      const bookingIds = bookings.map(b => b.id);
      const { data: statuses } = await supabase
        .from("delivery_statuses")
        .select("booking_id, status")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });

      // Get latest status per booking
      const statusMap = new Map<string, DeliveryStatus>();
      statuses?.forEach(s => {
        if (!statusMap.has(s.booking_id)) {
          statusMap.set(s.booking_id, s.status as DeliveryStatus);
        }
      });

      // Get customer profiles
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get vehicles
      const vehicleIds = [...new Set(bookings.map(b => b.vehicle_id))];
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, make, model, year")
        .in("id", vehicleIds);

      const vehicleMap = new Map(vehicles?.map(v => [v.id, v]) || []);

      // Get locations
      const locationIds = [...new Set(bookings.map(b => b.location_id))];
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name, address")
        .in("id", locationIds);

      const locationMap = new Map(locations?.map(l => [l.id, l]) || []);

      let result = bookings.map(b => {
        const profile = profileMap.get(b.user_id);
        const vehicle = vehicleMap.get(b.vehicle_id);
        const location = locationMap.get(b.location_id);
        const deliveryStatus = statusMap.get(b.id) || "assigned";

        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          pickupAddress: b.pickup_address,
          pickupContactName: b.pickup_contact_name,
          pickupContactPhone: b.pickup_contact_phone,
          pickupLat: b.pickup_lat,
          pickupLng: b.pickup_lng,
          specialInstructions: b.special_instructions,
          deliveryStatus,
          customer: profile ? {
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
          vehicle: vehicle ? {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
          } : null,
          category: null,
          location: location ? {
            name: location.name,
            address: location.address,
          } : null,
        };
      });

      // Filter by status if provided
      if (statusFilter && statusFilter !== "all") {
        result = result.filter(d => d.deliveryStatus === statusFilter);
      }

      return result;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      notes,
      photoUrls,
      locationLat,
      locationLng,
    }: {
      bookingId: string;
      status: DeliveryStatus;
      notes?: string;
      photoUrls?: string[];
      locationLat?: number;
      locationLng?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("delivery_statuses")
        .insert({
          booking_id: bookingId,
          status,
          notes,
          photo_urls: photoUrls || [],
          location_lat: locationLat,
          location_lng: locationLng,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Delivery status updated");
    },
    onError: (error) => {
      console.error("Failed to update delivery status:", error);
      toast.error("Failed to update status");
    },
  });
}

export function useDeliveryById(bookingId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["delivery-detail", bookingId],
    queryFn: async () => {
      if (!bookingId || !user) return null;

      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year, image_url),
          locations (id, name, address, phone)
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      // Get customer profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", booking.user_id)
        .single();

      // Get delivery status history
      const { data: statusHistory } = await supabase
        .from("delivery_statuses")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      return {
        ...booking,
        customer: profile,
        statusHistory: statusHistory || [],
        currentStatus: statusHistory?.[0]?.status || "assigned",
      };
    },
    enabled: !!bookingId && !!user,
  });
}
