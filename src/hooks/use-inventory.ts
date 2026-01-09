import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "./use-admin";
import { toast } from "sonner";

export interface AdminVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  dailyRate: number;
  imageUrl: string | null;
  seats: number | null;
  fuelType: string | null;
  transmission: string | null;
  isAvailable: boolean | null;
  isFeatured: boolean | null;
  cleaningBufferHours: number | null;
  locationId: string | null;
  location: {
    id: string;
    name: string;
    city: string;
  } | null;
}

interface VehicleFilters {
  locationId?: string;
  status?: "available" | "unavailable" | "all";
  category?: string;
  search?: string;
}

export function useAdminVehicles(filters: VehicleFilters = {}) {
  return useQuery<AdminVehicle[]>({
    queryKey: ["admin-vehicles", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicles")
        .select(`
          *,
          locations (id, name, city)
        `)
        .order("make", { ascending: true });

      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }

      if (filters.status === "available") {
        query = query.eq("is_available", true);
      } else if (filters.status === "unavailable") {
        query = query.eq("is_available", false);
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching vehicles:", error);
        throw error;
      }

      let vehicles = (data || []).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        category: v.category,
        dailyRate: Number(v.daily_rate),
        imageUrl: v.image_url,
        seats: v.seats,
        fuelType: v.fuel_type,
        transmission: v.transmission,
        isAvailable: v.is_available,
        isFeatured: v.is_featured,
        cleaningBufferHours: v.cleaning_buffer_hours,
        locationId: v.location_id,
        location: v.locations ? {
          id: v.locations.id,
          name: v.locations.name,
          city: v.locations.city,
        } : null,
      }));

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        vehicles = vehicles.filter(v =>
          v.make.toLowerCase().includes(searchLower) ||
          v.model.toLowerCase().includes(searchLower) ||
          v.year.toString().includes(searchLower)
        );
      }

      return vehicles;
    },
    staleTime: 30000,
  });
}

export function useAdminVehicle(id: string | null) {
  return useQuery({
    queryKey: ["admin-vehicle", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          locations (id, name, city, address)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch recent bookings and damage history
      const [bookingsRes, damagesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, booking_code, status, start_at, end_at")
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("damage_reports")
          .select("id, description, severity, status, created_at")
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      return {
        ...data,
        recentBookings: bookingsRes.data || [],
        damageHistory: damagesRes.data || [],
      };
    },
    enabled: !!id,
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      vehicleId, 
      updates 
    }: { 
      vehicleId: string; 
      updates: Partial<{
        is_available: boolean;
        cleaning_buffer_hours: number;
        make: string;
        model: string;
        year: number;
        category: string;
        daily_rate: number;
        seats: number;
        fuel_type: string;
        transmission: string;
        image_url: string;
        location_id: string;
        is_featured: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", vehicleId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog("vehicle_update", "vehicles", vehicleId, undefined, updates as any);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      toast.success("Vehicle updated");
    },
    onError: (error) => {
      console.error("Failed to update vehicle:", error);
      toast.error("Failed to update vehicle");
    },
  });
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number;
  category: string;
  dailyRate: number;
  seats?: number;
  fuelType?: string;
  transmission?: string;
  imageUrl?: string;
  locationId?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  cleaningBufferHours?: number;
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleData: CreateVehicleData) => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert([{
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          category: vehicleData.category,
          daily_rate: vehicleData.dailyRate,
          seats: vehicleData.seats || 5,
          fuel_type: vehicleData.fuelType || "Petrol",
          transmission: vehicleData.transmission || "Automatic",
          image_url: vehicleData.imageUrl || null,
          location_id: vehicleData.locationId || null,
          is_available: vehicleData.isAvailable ?? true,
          is_featured: vehicleData.isFeatured ?? false,
          cleaning_buffer_hours: vehicleData.cleaningBufferHours || 2,
        }])
        .select()
        .single();

      if (error) throw error;

      await createAuditLog("vehicle_created", "vehicles", data.id, undefined, {
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
      } as any);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle added to inventory");
    },
    onError: (error) => {
      console.error("Failed to create vehicle:", error);
      toast.error("Failed to add vehicle");
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      // First, delete all related data in order to avoid foreign key violations
      
      // Get all booking IDs for this vehicle
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("vehicle_id", vehicleId);
      
      const bookingIds = bookings?.map(b => b.id) || [];
      
      if (bookingIds.length > 0) {
        // Delete booking-related data
        await supabase.from("booking_add_ons").delete().in("booking_id", bookingIds);
        await supabase.from("condition_photos").delete().in("booking_id", bookingIds);
        await supabase.from("walkaround_inspections").delete().in("booking_id", bookingIds);
        await supabase.from("rental_agreements").delete().in("booking_id", bookingIds);
        await supabase.from("checkin_records").delete().in("booking_id", bookingIds);
        await supabase.from("inspection_metrics").delete().in("booking_id", bookingIds);
        await supabase.from("payments").delete().in("booking_id", bookingIds);
        await supabase.from("verification_requests").delete().in("booking_id", bookingIds);
        await supabase.from("booking_otps").delete().in("booking_id", bookingIds);
        await supabase.from("notification_logs").delete().in("booking_id", bookingIds);
        await supabase.from("admin_alerts").delete().in("booking_id", bookingIds);
        
        // Delete ticket messages for tickets related to these bookings
        const { data: tickets } = await supabase
          .from("tickets")
          .select("id")
          .in("booking_id", bookingIds);
        
        if (tickets && tickets.length > 0) {
          await supabase.from("ticket_messages").delete().in("ticket_id", tickets.map(t => t.id));
        }
        await supabase.from("tickets").delete().in("booking_id", bookingIds);
        
        // Delete receipt events for receipts related to these bookings
        const { data: receipts } = await supabase
          .from("receipts")
          .select("id")
          .in("booking_id", bookingIds);
        
        if (receipts && receipts.length > 0) {
          await supabase.from("receipt_events").delete().in("receipt_id", receipts.map(r => r.id));
        }
        await supabase.from("receipts").delete().in("booking_id", bookingIds);
        
        // Delete bookings
        await supabase.from("bookings").delete().in("id", bookingIds);
      }
      
      // Delete vehicle-related data
      await supabase.from("admin_alerts").delete().eq("vehicle_id", vehicleId);
      await supabase.from("damage_reports").delete().eq("vehicle_id", vehicleId);
      await supabase.from("audit_logs").delete().eq("entity_id", vehicleId).eq("entity_type", "vehicles");
      
      // Finally delete the vehicle
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;

      return { id: vehicleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["featured-vehicles"] });
      toast.success("Vehicle permanently deleted");
    },
    onError: (error) => {
      console.error("Failed to delete vehicle:", error);
      toast.error("Failed to delete vehicle");
    },
  });
}
