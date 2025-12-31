import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export interface BookingWithDetails {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  actualReturnAt: string | null;
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  taxAmount: number | null;
  depositAmount: number | null;
  totalAmount: number;
  notes: string | null;
  pickupAddress: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  vehicleId: string;
  locationId: string;
  // Joined data
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    imageUrl: string | null;
    category: string;
  } | null;
  location: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
  profile: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface BookingFilters {
  status?: BookingStatus | "all";
  dateRange?: { start: string; end: string } | null;
  locationId?: string;
  vehicleId?: string;
  search?: string;
}

export function useAdminBookings(filters: BookingFilters = {}) {
  return useQuery<BookingWithDetails[]>({
    queryKey: ["admin-bookings", filters],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year, image_url, category),
          locations (id, name, city, address)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.dateRange?.start) {
        query = query.gte("start_at", filters.dateRange.start);
      }

      if (filters.dateRange?.end) {
        query = query.lte("end_at", filters.dateRange.end);
      }

      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }

      if (filters.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      if (filters.search) {
        query = query.or(`booking_code.ilike.%${filters.search}%`);
      }

      const { data: bookingsData, error } = await query.limit(100);

      if (error) {
        console.error("Error fetching bookings:", error);
        throw error;
      }

      // Fetch profiles separately to avoid join issues
      const userIds = [...new Set((bookingsData || []).map(b => b.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const profile = profilesMap.get((bookingsData as any)[0]?.user_id);

      return (bookingsData || []).map((b: any) => {
        const userProfile = profilesMap.get(b.user_id);
        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          actualReturnAt: b.actual_return_at,
          dailyRate: Number(b.daily_rate),
          totalDays: b.total_days,
          subtotal: Number(b.subtotal),
          taxAmount: b.tax_amount ? Number(b.tax_amount) : null,
          depositAmount: b.deposit_amount ? Number(b.deposit_amount) : null,
          totalAmount: Number(b.total_amount),
          notes: b.notes,
          pickupAddress: b.pickup_address,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          userId: b.user_id,
          vehicleId: b.vehicle_id,
          locationId: b.location_id,
          vehicle: b.vehicles ? {
            id: b.vehicles.id,
            make: b.vehicles.make,
            model: b.vehicles.model,
            year: b.vehicles.year,
            imageUrl: b.vehicles.image_url,
            category: b.vehicles.category,
          } : null,
          location: b.locations ? {
            id: b.locations.id,
            name: b.locations.name,
            city: b.locations.city,
            address: b.locations.address,
          } : null,
          profile: userProfile ? {
            id: userProfile.id,
            fullName: userProfile.full_name,
            email: userProfile.email,
            phone: userProfile.phone,
          } : null,
        };
      });
    },
    staleTime: 30000,
  });
}

export function useBookingById(id: string | null) {
  return useQuery({
    queryKey: ["admin-booking", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          vehicles (id, make, model, year, image_url, category, fuel_type, transmission, seats),
          locations (id, name, city, address, phone)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_verified")
        .eq("id", data.user_id)
        .maybeSingle();

      // Fetch related data
      const [paymentsRes, addOnsRes, verificationsRes, inspectionsRes, photosRes, auditRes] = await Promise.all([
        supabase.from("payments").select("*").eq("booking_id", id),
        supabase.from("booking_add_ons").select("*, add_ons(name, description)").eq("booking_id", id),
        supabase.from("verification_requests").select("*").eq("booking_id", id),
        supabase.from("inspection_metrics").select("*").eq("booking_id", id),
        supabase.from("condition_photos").select("*").eq("booking_id", id),
        supabase.from("audit_logs").select("*").eq("entity_type", "booking").eq("entity_id", id).order("created_at", { ascending: false }),
      ]);

      return {
        ...data,
        profiles: profileData,
        payments: paymentsRes.data || [],
        addOns: addOnsRes.data || [],
        verifications: verificationsRes.data || [],
        inspections: inspectionsRes.data || [],
        photos: photosRes.data || [],
        auditLogs: auditRes.data || [],
      };
    },
    enabled: !!id,
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ bookingId, newStatus, notes }: { bookingId: string; newStatus: BookingStatus; notes?: string }) => {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "completed" || newStatus === "cancelled") {
        updateData.actual_return_at = new Date().toISOString();
      }
      
      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;

      await logAction("booking_status_change", "booking", bookingId, { 
        new_status: newStatus,
        notes 
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-booking"] });
      toast.success("Booking status updated");
    },
    onError: (error) => {
      console.error("Failed to update booking:", error);
      toast.error("Failed to update booking status");
    },
  });
}
