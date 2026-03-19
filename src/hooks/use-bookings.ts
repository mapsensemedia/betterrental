import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { extractEdgeFunctionError } from "@/lib/edge-function-error";

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
          locations!location_id (id, name, city, address)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      } else {
        // By default exclude "draft" bookings (unpaid Pay Now) from admin views
        query = query.neq("status", "draft");
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

      // Fetch customers for bookings that have customer_id
      const customerIds = [...new Set((bookingsData || []).map((b: any) => b.customer_id).filter(Boolean))];
      const { data: customersData } = customerIds.length > 0
        ? await supabase.from("customers").select("id, full_name, email, phone").in("id", customerIds)
        : { data: [] };
      const customersMap = new Map((customersData || []).map(c => [c.id, c]));

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
        const customer = b.customer_id ? customersMap.get(b.customer_id) : null;
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
            make: "",
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
          profile: {
            id: userProfile?.id || b.user_id,
            fullName: customer?.full_name || userProfile?.full_name || null,
            email: customer?.email || userProfile?.email || null,
            phone: customer?.phone || userProfile?.phone || null,
          },
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
          locations!location_id (id, name, city, address, phone),
          vehicle_units (id, vin, license_plate, status),
          delivery_statuses (status, updated_at, location_lat, location_lng, notes, updated_by)
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
        .select("id, full_name, email, phone, is_verified, driver_license_status, driver_license_expiry, driver_license_front_url, driver_license_back_url, driver_license_number")
        .eq("id", data.user_id)
        .maybeSingle();

      // Fetch customer record if customer_id is set (prefer over profile for display)
      let customerData: { full_name: string; email: string | null; phone: string | null } | null = null;
      if (data.customer_id) {
        const { data: cust } = await supabase
          .from("customers")
          .select("full_name, email, phone")
          .eq("id", data.customer_id)
          .maybeSingle();
        customerData = cust;
      }

      // Fetch related data
      const [paymentsRes, addOnsRes, verificationsRes, inspectionsRes, photosRes, auditRes, notificationsRes, additionalDriversRes] = await Promise.all([
        supabase.from("payments").select("*").eq("booking_id", id),
        supabase.from("booking_add_ons").select("*, add_ons(name, description, daily_rate, one_time_fee)").eq("booking_id", id),
        supabase.from("verification_requests").select("*").eq("booking_id", id),
        supabase.from("inspection_metrics").select("*").eq("booking_id", id),
        supabase.from("condition_photos").select("*").eq("booking_id", id),
        supabase.from("audit_logs").select("*").eq("entity_type", "booking").eq("entity_id", id).order("created_at", { ascending: false }),
        supabase.from("notification_logs").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
        supabase.from("booking_additional_drivers").select("*").eq("booking_id", id),
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

      // Merge customer data over profile data for display fields, keep profile's license data
      const mergedProfile = profileData ? {
        ...profileData,
        full_name: customerData?.full_name || profileData.full_name,
        email: customerData?.email || profileData.email,
        phone: customerData?.phone || profileData.phone,
      } : customerData ? {
        id: data.user_id,
        full_name: customerData.full_name,
        email: customerData.email,
        phone: customerData.phone,
        is_verified: false,
        driver_license_status: null,
        driver_license_expiry: null,
        driver_license_front_url: null,
        driver_license_back_url: null,
      } : null;

      return {
        ...data,
        vehicles: vehiclesField,
        profiles: mergedProfile,
        payments: paymentsRes.data || [],
        addOns: addOnsRes.data || [],
        additionalDrivers: additionalDriversRes.data || [],
        verifications: verificationsRes.data || [],
        inspections: inspectionsRes.data || [],
        photos: photosRes.data || [],
        auditLogs: auditRes.data || [],
        notifications: notificationsRes.data || [],
      };
    },
    enabled: !!id,
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      newStatus, 
      notes,
      bypassReason,
      reopen,
      skipNotifications,
      activationSource,
      activationReason,
      incompleteAtActivation,
    }: { 
      bookingId: string; 
      newStatus: BookingStatus; 
      notes?: string;
      bypassReason?: string;
      reopen?: boolean;
      skipNotifications?: boolean;
      activationSource?: string;
      activationReason?: string;
      incompleteAtActivation?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("update-booking-status", {
        body: { bookingId, newStatus, notes, bypassReason, reopen, skipNotifications, activationSource, activationReason, incompleteAtActivation },
      });

      if (error || data?.error) {
        const msg = await extractEdgeFunctionError(data, error);
        throw new Error(msg);
      }

      return data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["active-rental-detail"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["ops-fleet-units"] });
      queryClient.invalidateQueries({ queryKey: ["ops-pickups"] });
      queryClient.invalidateQueries({ queryKey: ["ops-active-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["ops-returns"] });
      toast.success("Booking status updated");
    },
    onError: (error) => {
      console.error("Failed to update booking:", error);
      toast.error("Failed to update booking status");
    },
  });
}
