/**
 * Booking Domain - Query Functions
 * Pure data fetching, no React dependencies
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  BookingSummary,
  BookingDetail,
  BookingFilters,
  BookingPayment,
  BookingAddOn,
} from "./types";

/**
 * List bookings with filters - for admin/ops views
 */
export async function listBookings(filters: BookingFilters = {}): Promise<BookingSummary[]> {
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

  // Tab-based filtering
  if (filters.tab === "pickups") {
    query = query.eq("status", "confirmed");
  } else if (filters.tab === "active") {
    query = query.eq("status", "active");
  } else if (filters.tab === "returns") {
    query = query.eq("status", "active").not("return_state", "is", null);
  } else if (filters.tab === "completed") {
    query = query.in("status", ["completed", "cancelled"]);
  }

  const { data: bookingsData, error } = await query.limit(100);

  if (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }

  // Fetch profiles separately
  const userIds = [...new Set((bookingsData || []).map(b => b.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", userIds);

  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

  // Fetch categories
  const categoryIds = [...new Set((bookingsData || []).map(b => b.vehicle_id).filter(Boolean))];
  const { data: categoriesData } = categoryIds.length > 0
    ? await supabase
        .from("vehicle_categories")
        .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
        .in("id", categoryIds)
    : { data: [] };

  const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c]));

  return (bookingsData || []).map((b): BookingSummary => {
    const profile = profilesMap.get(b.user_id);
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
        name: category.name,
        imageUrl: category.image_url,
        category: category.name,
        seats: category.seats,
        fuelType: category.fuel_type,
        transmission: category.transmission,
      } : null,
      location: b.locations ? {
        id: b.locations.id,
        name: b.locations.name,
        city: b.locations.city,
        address: b.locations.address,
      } : null,
      profile: profile ? {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
      } : null,
    };
  });
}

/**
 * Get single booking by ID with full details
 */
export async function getBookingById(id: string): Promise<BookingDetail | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      locations (id, name, city, address, phone),
      vehicle_units (id, vin, license_plate, status),
      delivery_statuses (status, updated_at, location_lat, location_lng, notes, updated_by)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Fetch category
  const { data: categoryData } = data.vehicle_id
    ? await supabase
        .from("vehicle_categories")
        .select("id, name, description, image_url, daily_rate, seats, fuel_type, transmission")
        .eq("id", data.vehicle_id)
        .maybeSingle()
    : { data: null };

  // Fetch profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_verified, driver_license_status")
    .eq("id", data.user_id)
    .maybeSingle();

  // Fetch related data in parallel
  const [paymentsRes, addOnsRes, auditRes] = await Promise.all([
    supabase.from("payments").select("*").eq("booking_id", id),
    supabase.from("booking_add_ons").select("*, add_ons(name, description)").eq("booking_id", id),
    supabase.from("audit_logs").select("*").eq("entity_type", "booking").eq("entity_id", id).order("created_at", { ascending: false }),
  ]);

  const payments: BookingPayment[] = (paymentsRes.data || []).map(p => ({
    id: p.id,
    amount: Number(p.amount),
    paymentType: p.payment_type,
    paymentMethod: p.payment_method,
    status: p.status,
    transactionId: p.transaction_id,
    createdAt: p.created_at,
  }));

  const addOns: BookingAddOn[] = (addOnsRes.data || []).map(a => ({
    id: a.id,
    addOnId: a.add_on_id,
    price: Number(a.price),
    quantity: a.quantity,
    addOn: a.add_ons ? {
      name: a.add_ons.name,
      description: a.add_ons.description,
    } : null,
  }));

  return {
    id: data.id,
    bookingCode: data.booking_code,
    status: data.status,
    startAt: data.start_at,
    endAt: data.end_at,
    actualReturnAt: data.actual_return_at,
    dailyRate: Number(data.daily_rate),
    totalDays: data.total_days,
    subtotal: Number(data.subtotal),
    taxAmount: data.tax_amount ? Number(data.tax_amount) : null,
    depositAmount: data.deposit_amount ? Number(data.deposit_amount) : null,
    totalAmount: Number(data.total_amount),
    notes: data.notes,
    pickupAddress: data.pickup_address,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    userId: data.user_id,
    vehicleId: data.vehicle_id,
    locationId: data.location_id,
    assignedUnitId: data.assigned_unit_id,
    assignedDriverId: data.assigned_driver_id,
    handedOverAt: data.handed_over_at,
    handedOverBy: data.handed_over_by,
    returnState: data.return_state,
    driverAgeBand: data.driver_age_band,
    youngDriverFee: data.young_driver_fee ? Number(data.young_driver_fee) : null,
    lateReturnFee: data.late_return_fee ? Number(data.late_return_fee) : null,
    cardLastFour: data.card_last_four,
    cardType: data.card_type,
    cardHolderName: data.card_holder_name,
    bookingSource: data.booking_source,
    saveTimeAtCounter: data.save_time_at_counter,
    specialInstructions: data.special_instructions,
    vehicle: categoryData ? {
      id: categoryData.id,
      name: categoryData.name,
      imageUrl: categoryData.image_url,
      category: categoryData.name,
      seats: categoryData.seats,
      fuelType: categoryData.fuel_type,
      transmission: categoryData.transmission,
    } : null,
    location: data.locations ? {
      id: data.locations.id,
      name: data.locations.name,
      city: data.locations.city,
      address: data.locations.address,
      phone: data.locations.phone,
    } : null,
    profile: profileData ? {
      id: profileData.id,
      fullName: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
      isVerified: profileData.is_verified,
      driverLicenseStatus: profileData.driver_license_status,
    } : null,
    unit: data.vehicle_units ? {
      id: data.vehicle_units.id,
      vin: data.vehicle_units.vin,
      licensePlate: data.vehicle_units.license_plate,
      status: data.vehicle_units.status,
    } : null,
    deliveryStatus: data.delivery_statuses ? {
      status: data.delivery_statuses.status,
      updatedAt: data.delivery_statuses.updated_at,
      locationLat: data.delivery_statuses.location_lat,
      locationLng: data.delivery_statuses.location_lng,
      notes: data.delivery_statuses.notes,
      updatedBy: data.delivery_statuses.updated_by,
    } : null,
    payments,
    addOns,
    auditLogs: (auditRes.data || []).map(a => ({
      id: a.id,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      userId: a.user_id,
      oldData: a.old_data as Record<string, unknown> | null,
      newData: a.new_data as Record<string, unknown> | null,
      createdAt: a.created_at,
    })),
  };
}

/**
 * Get booking by code
 */
export async function getBookingByCode(code: string): Promise<BookingSummary | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      locations (id, name, city, address)
    `)
    .eq("booking_code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Fetch profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", data.user_id)
    .maybeSingle();

  // Fetch category
  const { data: categoryData } = data.vehicle_id
    ? await supabase
        .from("vehicle_categories")
        .select("id, name, image_url")
        .eq("id", data.vehicle_id)
        .maybeSingle()
    : { data: null };

  return {
    id: data.id,
    bookingCode: data.booking_code,
    status: data.status,
    startAt: data.start_at,
    endAt: data.end_at,
    actualReturnAt: data.actual_return_at,
    dailyRate: Number(data.daily_rate),
    totalDays: data.total_days,
    subtotal: Number(data.subtotal),
    taxAmount: data.tax_amount ? Number(data.tax_amount) : null,
    depositAmount: data.deposit_amount ? Number(data.deposit_amount) : null,
    totalAmount: Number(data.total_amount),
    notes: data.notes,
    pickupAddress: data.pickup_address,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    userId: data.user_id,
    vehicleId: data.vehicle_id,
    locationId: data.location_id,
    vehicle: categoryData ? {
      id: categoryData.id,
      name: categoryData.name,
      imageUrl: categoryData.image_url,
      category: categoryData.name,
    } : null,
    location: data.locations ? {
      id: data.locations.id,
      name: data.locations.name,
      city: data.locations.city,
      address: data.locations.address,
    } : null,
    profile: profileData ? {
      id: profileData.id,
      fullName: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
    } : null,
  };
}
