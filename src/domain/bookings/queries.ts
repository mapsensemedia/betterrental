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
      locations!location_id (id, name, city, address)
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

  // If searching by name/phone/email, find matching user IDs AND customer IDs
  let searchUserIds: string[] | null = null;
  let searchCustomerIds: string[] | null = null;
  if (filters.search) {
    const term = filters.search.trim();
    
    // Search profiles for name/phone/email matches
    const [profilesRes, customersRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`),
      supabase
        .from("customers")
        .select("id")
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`),
    ]);
    
    searchUserIds = (profilesRes.data || []).map(p => p.id);
    searchCustomerIds = (customersRes.data || []).map(c => c.id);
    
    const orClauses: string[] = [`booking_code.ilike.%${term}%`];
    if (searchUserIds.length > 0) {
      orClauses.push(`user_id.in.(${searchUserIds.join(",")})`);
    }
    if (searchCustomerIds.length > 0) {
      orClauses.push(`customer_id.in.(${searchCustomerIds.join(",")})`);
    }
    query = query.or(orClauses.join(","));
  }

  // Tab-based filtering
  if (filters.tab === "pickups") {
    query = query.eq("status", "confirmed");
  } else if (filters.tab === "active") {
    // Only bookings actually activated through the pickup wizard count as
    // active rentals. Confirmed bookings (even past their start time) belong
    // to Pickups until staff complete handover and mark them active.
    query = query.eq("status", "active");
  } else if (filters.tab === "returns") {
    query = query.eq("status", "active");
  } else if (filters.tab === "completed") {
    query = query.in("status", ["completed", "cancelled"]);
  }

  const { data: bookingsData, error } = await query.limit(500);

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

  // Fetch customers records for walk-in bookings
  const customerIds = [...new Set((bookingsData || []).map(b => b.customer_id).filter(Boolean))] as string[];
  const customersMap = new Map<string, { id: string; full_name: string; email: string | null; phone: string | null }>();
  if (customerIds.length > 0) {
    const { data: customersData } = await supabase
      .from("customers")
      .select("id, full_name, email, phone")
      .in("id", customerIds);
    (customersData || []).forEach(c => customersMap.set(c.id, c));
  }

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
    const customer = b.customer_id ? customersMap.get(b.customer_id) : null;
    const category = categoriesMap.get(b.vehicle_id);
    
    // Prefer customers table for display when customer_id is set (walk-in bookings)
    const displayProfile = customer
      ? {
          id: customer.id,
          fullName: customer.full_name,
          email: customer.email,
          phone: customer.phone,
        }
      : profile
        ? {
            id: profile.id,
            fullName: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          }
        : null;
    
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
      returnLocationId: b.return_location_id,
      differentDropoffFee: Number(b.different_dropoff_fee || 0),
      customerId: b.customer_id || null,
      createdBy: b.created_by || null,
      vehicle: category ? {
        id: category.id,
        name: category.name,
        imageUrl: category.image_url,
        category: category.name,
        seats: category.seats,
        fuelType: category.fuel_type,
        transmission: category.transmission,
      } : null,
      location: (b as any).locations ? {
        id: (b as any).locations.id,
        name: (b as any).locations.name,
        city: (b as any).locations.city,
        address: (b as any).locations.address,
      } : null,
      returnLocation: null,
      profile: displayProfile,
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
      locations!location_id (id, name, city, address, phone),
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

  // Fetch profile and customer in parallel
  const [profileRes, customerRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, is_verified, driver_license_status")
      .eq("id", data.user_id)
      .maybeSingle(),
    data.customer_id
      ? supabase
          .from("customers")
          .select("id, full_name, email, phone")
          .eq("id", data.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profileData = profileRes.data;
  const customerData = customerRes.data;

  // Prefer customers table for display when customer_id is set
  const displayProfile = customerData
    ? {
        id: customerData.id,
        fullName: customerData.full_name,
        email: customerData.email,
        phone: customerData.phone,
        isVerified: undefined,
        driverLicenseStatus: undefined,
      }
    : profileData
      ? {
          id: profileData.id,
          fullName: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          isVerified: profileData.is_verified,
          driverLicenseStatus: profileData.driver_license_status,
        }
      : null;

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

  // Fetch return location if different
  let returnLocationData = null;
  if (data.return_location_id && data.return_location_id !== data.location_id) {
    const { data: rlData } = await supabase
      .from("locations")
      .select("id, name, city, address, phone")
      .eq("id", data.return_location_id)
      .maybeSingle();
    returnLocationData = rlData;
  }

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
    returnLocationId: data.return_location_id,
    differentDropoffFee: Number(data.different_dropoff_fee || 0),
    customerId: data.customer_id || null,
    createdBy: data.created_by || null,
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
    location: (data as any).locations ? {
      id: (data as any).locations.id,
      name: (data as any).locations.name,
      city: (data as any).locations.city,
      address: (data as any).locations.address,
      phone: (data as any).locations.phone,
    } : null,
    returnLocation: returnLocationData ? {
      id: returnLocationData.id,
      name: returnLocationData.name,
      city: returnLocationData.city,
      address: returnLocationData.address,
      phone: returnLocationData.phone,
    } : null,
    profile: displayProfile,
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
      locations!location_id (id, name, city, address)
    `)
    .eq("booking_code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Fetch profile and customer in parallel
  const [profileRes, customerRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", data.user_id)
      .maybeSingle(),
    data.customer_id
      ? supabase
          .from("customers")
          .select("id, full_name, email, phone")
          .eq("id", data.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profileData = profileRes.data;
  const customerData = customerRes.data;

  const displayProfile = customerData
    ? {
        id: customerData.id,
        fullName: customerData.full_name,
        email: customerData.email,
        phone: customerData.phone,
      }
    : profileData
      ? {
          id: profileData.id,
          fullName: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
        }
      : null;

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
    returnLocationId: data.return_location_id,
    differentDropoffFee: Number(data.different_dropoff_fee || 0),
    customerId: data.customer_id || null,
    createdBy: data.created_by || null,
    vehicle: categoryData ? {
      id: categoryData.id,
      name: categoryData.name,
      imageUrl: categoryData.image_url,
      category: categoryData.name,
    } : null,
    location: (data as any).locations ? {
      id: (data as any).locations.id,
      name: (data as any).locations.name,
      city: (data as any).locations.city,
      address: (data as any).locations.address,
    } : null,
    returnLocation: null,
    profile: displayProfile,
  };
}
