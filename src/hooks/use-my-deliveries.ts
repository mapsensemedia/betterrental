import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export type DeliveryStatus = "unassigned" | "assigned" | "picked_up" | "en_route" | "delivered" | "issue" | "cancelled";

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
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  customer: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  // Enhanced: Vehicle category info
  category: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
  // Enhanced: Assigned unit details
  assignedUnit: {
    id: string;
    vin: string;
    licensePlate: string | null;
    color: string | null;
  } | null;
  // Enhanced: Dispatch hub location
  dispatchLocation: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
  } | null;
  // Enhanced: Urgency flag
  isUrgent: boolean;
}

type DeliveryScope = "assigned" | "pool" | "all";

function normalizeScope(scope: boolean | DeliveryScope): DeliveryScope {
  return typeof scope === "boolean" ? (scope ? "all" : "assigned") : scope;
}

export function useMyDeliveries(
  statusFilter?: DeliveryStatus | "all",
  scope: boolean | DeliveryScope = false
) {
  const { user } = useAuth();
  const deliveryScope = normalizeScope(scope);

  return useQuery<DeliveryBooking[]>({
    queryKey: ["my-deliveries", user?.id, statusFilter, deliveryScope],
    queryFn: async () => {
      if (!user) return [];

      // Build query - fetch all delivery bookings or just assigned to this driver
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
          location_id,
          assigned_unit_id,
          assigned_driver_id
        `)
        // Include newly-created bookings (pending) so they appear immediately in the Delivery Portal
        .in("status", ["pending", "confirmed", "active", "cancelled"])
        .not("pickup_address", "is", null) // Only delivery bookings (have pickup address)
        .order("start_at", { ascending: true });

      // Scope
      if (deliveryScope === "assigned") {
        query = query.eq("assigned_driver_id", user.id);
      } else if (deliveryScope === "pool") {
        query = query.is("assigned_driver_id", null);
      }

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

      // Get vehicle categories (vehicle_id now points to vehicle_categories)
      const categoryIds = [...new Set(bookings.map(b => b.vehicle_id))];
      const { data: categories } = await supabase
        .from("vehicle_categories")
        .select("id, name, image_url")
        .in("id", categoryIds);

      const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

      // Get assigned units if present
      const unitIds = bookings
        .map(b => b.assigned_unit_id)
        .filter((id): id is string => id !== null);
      
      let unitMap = new Map<string, { id: string; vin: string; license_plate: string | null; color: string | null }>();
      if (unitIds.length > 0) {
        const { data: units } = await supabase
          .from("vehicle_units")
          .select("id, vin, license_plate, color")
          .in("id", unitIds);
        
        unitMap = new Map(units?.map(u => [u.id, u]) || []);
      }

      // Get assigned driver profiles
      const driverIds = bookings
        .map(b => b.assigned_driver_id)
        .filter((id): id is string => id !== null);
      
      let driverMap = new Map<string, { id: string; full_name: string | null }>();
      if (driverIds.length > 0) {
        const { data: driverProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        
        driverMap = new Map(driverProfiles?.map(d => [d.id, d]) || []);
      }

      // Get dispatch hub locations
      const locationIds = [...new Set(bookings.map(b => b.location_id))];
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name, address, phone")
        .in("id", locationIds);

      const locationMap = new Map(locations?.map(l => [l.id, l]) || []);

      // Calculate urgency threshold (2 hours from now)
      const urgencyThreshold = new Date();
      urgencyThreshold.setHours(urgencyThreshold.getHours() + 2);

      let result = bookings.map(b => {
        const profile = profileMap.get(b.user_id);
        const category = categoryMap.get(b.vehicle_id);
        const unit = b.assigned_unit_id ? unitMap.get(b.assigned_unit_id) : null;
        const location = locationMap.get(b.location_id);
        const driver = b.assigned_driver_id ? driverMap.get(b.assigned_driver_id) : null;
        // Default to 'unassigned' if no driver, or get from status map
        // If the booking itself is cancelled, force a cancelled delivery state for portal mapping.
        const deliveryStatus =
          b.status === "cancelled"
            ? "cancelled"
            : statusMap.get(b.id) || (b.assigned_driver_id ? "assigned" : "unassigned");
        const pickupTime = new Date(b.start_at);
        const isUrgent = pickupTime <= urgencyThreshold && (deliveryStatus === "assigned" || deliveryStatus === "unassigned");

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
          assignedDriverId: b.assigned_driver_id,
          assignedDriverName: driver?.full_name || null,
          customer: profile ? {
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
          category: category ? {
            id: category.id,
            name: category.name,
            imageUrl: category.image_url,
          } : null,
          assignedUnit: unit ? {
            id: unit.id,
            vin: unit.vin,
            licensePlate: unit.license_plate,
            color: unit.color,
          } : null,
          dispatchLocation: location ? {
            id: location.id,
            name: location.name,
            address: location.address,
            phone: location.phone,
          } : null,
          isUrgent,
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

      // Use upsert since we now have a unique constraint on booking_id
      const { data, error } = await supabase
        .from("delivery_statuses")
        .upsert({
          booking_id: bookingId,
          status,
          notes,
          photo_urls: photoUrls || [],
          location_lat: locationLat,
          location_lng: locationLng,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'booking_id',
          ignoreDuplicates: false 
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
          locations!location_id (id, name, address, phone)
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

      // Get vehicle category
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("id, name, image_url")
        .eq("id", booking.vehicle_id)
        .single();

      // Get assigned unit if present
      let assignedUnit = null;
      if (booking.assigned_unit_id) {
        const { data: unit } = await supabase
          .from("vehicle_units")
          .select("id, vin, license_plate, color")
          .eq("id", booking.assigned_unit_id)
          .single();
        assignedUnit = unit;
      }

      // Get delivery status history
      const { data: statusHistory } = await supabase
        .from("delivery_statuses")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      return {
        ...booking,
        customer: profile,
        category,
        assignedUnit,
        statusHistory: statusHistory || [],
        currentStatus: statusHistory?.[0]?.status || "assigned",
      };
    },
    enabled: !!bookingId && !!user,
  });
}
