import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { handleDepositOnStatusChange } from "@/lib/deposit-automation";

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

      // Fetch categories separately (vehicle_id now points to categories)
      const categoryIds = [...new Set((bookingsData || []).map(b => b.vehicle_id).filter(Boolean))];
      const { data: categoriesData } = categoryIds.length > 0 
        ? await supabase
            .from("vehicle_categories")
            .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
            .in("id", categoryIds)
        : { data: [] };

      const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

      return (bookingsData || []).map((b: any) => {
        const userProfile = profilesMap.get(b.user_id);
        const category = categoriesMap.get(b.vehicle_id);
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
          vehicle: category ? {
            id: category.id,
            make: "", // Categories don't have make
            model: category.name,
            year: new Date().getFullYear(),
            imageUrl: category.image_url,
            category: category.name,
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
    queryKey: ["booking", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          locations (id, name, city, address, phone),
          vehicle_units (id, vin, license_plate, status)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch category separately (vehicle_id now points to categories)
      const { data: categoryData } = data.vehicle_id 
        ? await supabase
            .from("vehicle_categories")
            .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
            .eq("id", data.vehicle_id)
            .maybeSingle()
        : { data: null };

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_verified, driver_license_status, driver_license_expiry, driver_license_front_url, driver_license_back_url")
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

      // Build vehicles field for backward compatibility with components
      const vehiclesField = categoryData ? {
        id: categoryData.id,
        make: "",
        model: categoryData.name,
        year: new Date().getFullYear(),
        image_url: categoryData.image_url,
        category: categoryData.name,
        fuel_type: categoryData.fuel_type,
        transmission: categoryData.transmission,
        seats: categoryData.seats,
      } : null;

      return {
        ...data,
        vehicles: vehiclesField, // Add backward-compatible vehicles field
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
      // First get booking details for notification
      const { data: bookingDetails, error: fetchError } = await supabase
        .from("bookings")
        .select("booking_code, user_id, vehicle_id, vehicle_categories(name)")
        .eq("id", bookingId)
        .single();

      if (fetchError) throw fetchError;

      // Get profile for customer name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", bookingDetails.user_id)
        .maybeSingle();

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

      // Handle deposit based on status change
      await handleDepositOnStatusChange(bookingId, newStatus);

      // Create admin alert for status changes
      const category = bookingDetails.vehicle_categories as any;
      const vehicleName = category?.name || "Vehicle";
      const customerName = profile?.full_name || "";

      // Create alert in database
      if (newStatus === "active" || newStatus === "completed" || newStatus === "cancelled") {
        await supabase.from("admin_alerts").insert([
          {
            alert_type: newStatus === "active" ? "return_due_soon" : 
                       newStatus === "cancelled" ? "customer_issue" : "verification_pending",
            title: `Booking ${newStatus === "active" ? "Activated" : 
                   newStatus === "cancelled" ? "Cancelled" : "Completed"} - ${bookingDetails.booking_code}`,
            message: `Booking ${bookingDetails.booking_code} status changed to ${newStatus}`,
            booking_id: bookingId,
            status: "new",
          } as any,
        ]);
      }

      // Send notification based on new status
      let notificationStage: string | null = null;
      if (newStatus === "active") {
        notificationStage = "rental_activated";
      } else if (newStatus === "completed") {
        notificationStage = "return_completed";
      }

      if (notificationStage) {
        try {
          await supabase.functions.invoke("send-booking-notification", {
            body: { bookingId, stage: notificationStage },
          });

          // Also notify admin
          await supabase.functions.invoke("notify-admin", {
            body: {
              eventType: notificationStage,
              bookingId,
              bookingCode: bookingDetails.booking_code,
              customerName,
              vehicleName,
            },
          });
        } catch (e) {
          console.error("Failed to send status notification:", e);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
      toast.success("Booking status updated - customer notified");
    },
    onError: (error) => {
      console.error("Failed to update booking:", error);
      toast.error("Failed to update booking status");
    },
  });
}
