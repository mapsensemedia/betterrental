import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { 
  DeliveryBooking, 
  DeliveryDetail, 
  DeliveryListOptions,
  StatusHistoryEntry 
} from "./types";
import { 
  DELIVERY_STATUSES, 
  getPortalStatus,
  type DeliveryStatus 
} from "../constants/delivery-status";
import { isDeliveryUrgent } from "./types";

type SupabaseClientType = SupabaseClient<Database>;

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY LIST QUERY
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDeliveryList(
  supabase: SupabaseClientType,
  userId: string,
  options: DeliveryListOptions
): Promise<DeliveryBooking[]> {
  const { scope, statusFilter, limit = 50 } = options;

  // Base query for delivery bookings (those with pickup_address)
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
      assigned_driver_id,
      vehicle_id,
      location_id,
      assigned_unit:assigned_unit_id (
        id,
        vin,
        license_plate,
        color,
        current_mileage
      ),
      profiles:user_id (
        id,
        full_name,
        email,
        phone
      ),
      locations:location_id (
        id,
        name,
        address
      ),
      delivery_statuses (
        status,
        updated_by
      )
    `)
    .not("pickup_address", "is", null)
    .in("status", ["pending", "confirmed", "active"])
    .order("start_at", { ascending: true })
    .limit(limit);

  // Apply scope filter
  if (scope === "my") {
    query = query.eq("assigned_driver_id", userId);
  } else if (scope === "available") {
    query = query.is("assigned_driver_id", null);
  }
  // 'all' scope = no additional filter

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching delivery list:", error);
    throw error;
  }

  // Collect unique vehicle_ids for batch category lookup
  const vehicleIds = [...new Set((data || []).map(r => r.vehicle_id).filter(Boolean))];
  const categoryMap = new Map<string, { id: string; name: string; image_url: string | null }>();
  
  if (vehicleIds.length > 0) {
    const { data: categories } = await supabase
      .from("vehicle_categories")
      .select("id, name, image_url")
      .in("id", vehicleIds);
    (categories || []).forEach(c => categoryMap.set(c.id, c));
  }

  // Collect unique driver IDs for batch lookup
  const driverIds = [...new Set((data || []).map(r => r.assigned_driver_id).filter(Boolean))] as string[];
  const driverMap = new Map<string, string>();
  
  if (driverIds.length > 0) {
    const { data: drivers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", driverIds);
    (drivers || []).forEach(d => driverMap.set(d.id, d.full_name || "Unknown"));
  }

  // Map to application types
  const deliveries: DeliveryBooking[] = (data || []).map((row) => {
    const assignedDriverName = row.assigned_driver_id ? driverMap.get(row.assigned_driver_id) || null : null;
    const cat = categoryMap.get(row.vehicle_id);
    const deliveryStatus = (row.delivery_statuses?.status as DeliveryStatus) || DELIVERY_STATUSES.UNASSIGNED;
    
    return {
      id: row.id,
      bookingCode: row.booking_code,
      status: row.status,
      startAt: row.start_at,
      endAt: row.end_at,
      pickupAddress: row.pickup_address,
      pickupContactName: row.pickup_contact_name,
      pickupContactPhone: row.pickup_contact_phone,
      pickupLat: row.pickup_lat,
      pickupLng: row.pickup_lng,
      specialInstructions: row.special_instructions,
      deliveryStatus,
      assignedDriverId: row.assigned_driver_id,
      assignedDriverName,
      vehicleId: row.vehicle_id,
      category: cat ? {
        id: cat.id,
        name: cat.name,
        imageUrl: cat.image_url,
      } : null,
      assignedUnit: row.assigned_unit ? {
        id: (row.assigned_unit as any).id,
        vin: (row.assigned_unit as any).vin,
        licensePlate: (row.assigned_unit as any).license_plate,
        color: (row.assigned_unit as any).color,
        currentMileage: (row.assigned_unit as any).current_mileage,
      } : null,
      customer: row.profiles ? {
        id: (row.profiles as any).id,
        fullName: (row.profiles as any).full_name,
        email: (row.profiles as any).email,
        phone: (row.profiles as any).phone,
      } : null,
      dispatchLocation: row.locations ? {
        id: (row.locations as any).id,
        name: (row.locations as any).name,
        address: (row.locations as any).address,
      } : null,
      isUrgent: isDeliveryUrgent(row.start_at),
      portalStatus: getPortalStatus(deliveryStatus),
    };
  });

  // Apply portal status filter if provided
  if (statusFilter) {
    return deliveries.filter(d => d.portalStatus === statusFilter);
  }

  return deliveries;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DETAIL QUERY
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDeliveryDetail(
  supabase: SupabaseClientType,
  bookingId: string
): Promise<DeliveryDetail | null> {
  const { data: row, error } = await supabase
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
      assigned_driver_id,
      vehicle_id,
      location_id,
      daily_rate,
      total_days,
      total_amount,
      notes,
      handed_over_at,
      assigned_unit:assigned_unit_id (
        id,
        vin,
        license_plate,
        color,
        current_mileage
      ),
      profiles:user_id (
        id,
        full_name,
        email,
        phone
      ),
      locations:location_id (
        id,
        name,
        address
      ),
      delivery_statuses (
        status,
        notes,
        photo_urls,
        location_lat,
        location_lng,
        updated_by
      ),
      rental_agreements (
        signed_at
      ),
      walkaround_records (
        acknowledged_at
      )
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching delivery detail:", error);
    throw error;
  }

  if (!row) return null;

  // Separate category lookup (no FK from bookings.vehicle_id to vehicle_categories)
  let category: { id: string; name: string; imageUrl: string | null } | null = null;
  if (row.vehicle_id) {
    const { data: cat } = await supabase
      .from("vehicle_categories")
      .select("id, name, image_url")
      .eq("id", row.vehicle_id)
      .maybeSingle();
    if (cat) {
      category = { id: cat.id, name: cat.name, imageUrl: cat.image_url };
    }
  }

  // Get driver name
  let assignedDriverName: string | null = null;
  if (row.assigned_driver_id) {
    const { data: driverProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.assigned_driver_id)
      .maybeSingle();
    assignedDriverName = driverProfile?.full_name || null;
  }

  // Fetch status history from log table
  const statusHistory = await fetchDeliveryHistory(supabase, bookingId);

  const deliveryStatus = (row.delivery_statuses?.status as DeliveryStatus) || DELIVERY_STATUSES.UNASSIGNED;

  return {
    id: row.id,
    bookingCode: row.booking_code,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    pickupAddress: row.pickup_address,
    pickupContactName: row.pickup_contact_name,
    pickupContactPhone: row.pickup_contact_phone,
    pickupLat: row.pickup_lat,
    pickupLng: row.pickup_lng,
    specialInstructions: row.special_instructions,
    deliveryStatus,
    assignedDriverId: row.assigned_driver_id,
    assignedDriverName,
    vehicleId: row.vehicle_id,
    dailyRate: row.daily_rate,
    totalDays: row.total_days,
    totalAmount: row.total_amount,
    notes: row.notes,
    category,
    assignedUnit: row.assigned_unit ? {
      id: (row.assigned_unit as any).id,
      vin: (row.assigned_unit as any).vin,
      licensePlate: (row.assigned_unit as any).license_plate,
      color: (row.assigned_unit as any).color,
      currentMileage: (row.assigned_unit as any).current_mileage,
    } : null,
    customer: row.profiles ? {
      id: (row.profiles as any).id,
      fullName: (row.profiles as any).full_name,
      email: (row.profiles as any).email,
      phone: (row.profiles as any).phone,
    } : null,
    dispatchLocation: row.locations ? {
      id: (row.locations as any).id,
      name: (row.locations as any).name,
      address: (row.locations as any).address,
    } : null,
    isUrgent: isDeliveryUrgent(row.start_at),
    portalStatus: getPortalStatus(deliveryStatus),
    agreementSignedAt: (row.rental_agreements as any)?.signed_at || null,
    walkaroundAcknowledgedAt: (row.walkaround_records as any)?.acknowledged_at || null,
    handedOverAt: row.handed_over_at,
    statusHistory,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HISTORY QUERY
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDeliveryHistory(
  supabase: SupabaseClientType,
  bookingId: string
): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("delivery_status_log")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    // Table might not exist yet or other error - return empty
    console.warn("Error fetching delivery history:", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    status: row.status as DeliveryStatus,
    notes: row.notes,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    odometerReading: row.odometer_reading,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTS QUERY (For tab badges)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryCounts {
  my: number;
  available: number;
  pending: number;
  enRoute: number;
  completed: number;
  issue: number;
}

export async function fetchDeliveryCounts(
  supabase: SupabaseClientType,
  userId: string
): Promise<DeliveryCounts> {
  // Fetch all delivery bookings
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      assigned_driver_id,
      delivery_statuses (status)
    `)
    .not("pickup_address", "is", null)
    .in("status", ["pending", "confirmed", "active"]);

  if (error) {
    console.error("Error fetching delivery counts:", error);
    return { my: 0, available: 0, pending: 0, enRoute: 0, completed: 0, issue: 0 };
  }

  const counts: DeliveryCounts = {
    my: 0,
    available: 0,
    pending: 0,
    enRoute: 0,
    completed: 0,
    issue: 0,
  };

  for (const row of data || []) {
    const status = (row.delivery_statuses as any)?.status || 'unassigned';
    const portalStatus = getPortalStatus(status);

    // Scope counts
    if (row.assigned_driver_id === userId) {
      counts.my++;
    }
    if (!row.assigned_driver_id) {
      counts.available++;
    }

    // Status counts
    switch (portalStatus) {
      case 'pending':
        counts.pending++;
        break;
      case 'en_route':
        counts.enRoute++;
        break;
      case 'completed':
        counts.completed++;
        break;
      case 'issue':
        counts.issue++;
        break;
    }
  }

  return counts;
}
