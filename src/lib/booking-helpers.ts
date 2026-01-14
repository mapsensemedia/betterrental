/**
 * Shared booking data utilities to reduce code duplication
 * and improve query efficiency across hooks
 */

import { supabase } from "@/integrations/supabase/client";

// Common booking with joined data interface
export interface BookingBaseData {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  actual_return_at: string | null;
  daily_rate: number;
  total_days: number;
  subtotal: number;
  tax_amount: number | null;
  deposit_amount: number | null;
  total_amount: number;
  notes: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  vehicle_id: string;
  location_id: string;
  assigned_unit_id: string | null;
}

export interface VehicleBaseData {
  id: string;
  make: string;
  model: string;
  year: number;
  image_url: string | null;
  category: string;
  fuel_type?: string | null;
  transmission?: string | null;
  seats?: number | null;
  is_available?: boolean | null;
  cleaning_buffer_hours?: number | null;
}

export interface LocationBaseData {
  id: string;
  name: string;
  city: string;
  address: string;
  phone?: string | null;
}

export interface ProfileBaseData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_verified?: boolean | null;
}

/**
 * Batch fetch profiles by user IDs - prevents N+1 queries
 */
export async function batchFetchProfiles(userIds: string[]): Promise<Map<string, ProfileBaseData>> {
  if (userIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(userIds)];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, is_verified")
    .in("id", uniqueIds);
  
  if (error) {
    console.error("Error fetching profiles:", error);
    return new Map();
  }
  
  return new Map((data || []).map(p => [p.id, p as ProfileBaseData]));
}

/**
 * Batch fetch payments by booking IDs - prevents N+1 queries
 */
export async function batchFetchPayments(bookingIds: string[]): Promise<Map<string, Array<{
  amount: number;
  status: string;
  payment_type: string;
}>>> {
  if (bookingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("payments")
    .select("booking_id, amount, status, payment_type")
    .in("booking_id", bookingIds);
  
  if (error) {
    console.error("Error fetching payments:", error);
    return new Map();
  }
  
  const map = new Map<string, Array<{ amount: number; status: string; payment_type: string }>>();
  (data || []).forEach(p => {
    const existing = map.get(p.booking_id) || [];
    existing.push({ amount: Number(p.amount), status: p.status, payment_type: p.payment_type });
    map.set(p.booking_id, existing);
  });
  
  return map;
}

/**
 * Batch fetch verifications by booking IDs
 */
export async function batchFetchVerifications(bookingIds: string[]): Promise<Map<string, string>> {
  if (bookingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("verification_requests")
    .select("booking_id, status")
    .in("booking_id", bookingIds);
  
  if (error) {
    console.error("Error fetching verifications:", error);
    return new Map();
  }
  
  return new Map((data || []).map(v => [v.booking_id, v.status]));
}

/**
 * Batch fetch condition photos by booking IDs
 */
export async function batchFetchConditionPhotos(bookingIds: string[]): Promise<Map<string, {
  hasPickup: boolean;
  hasReturn: boolean;
  hasFuelOdometer: boolean;
  count: number;
}>> {
  if (bookingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("condition_photos")
    .select("booking_id, phase, photo_type")
    .in("booking_id", bookingIds);
  
  if (error) {
    console.error("Error fetching photos:", error);
    return new Map();
  }
  
  const map = new Map<string, { hasPickup: boolean; hasReturn: boolean; hasFuelOdometer: boolean; count: number }>();
  (data || []).forEach(p => {
    const existing = map.get(p.booking_id) || { hasPickup: false, hasReturn: false, hasFuelOdometer: false, count: 0 };
    existing.count++;
    if (p.phase === "pickup") existing.hasPickup = true;
    if (p.phase === "return") {
      existing.hasReturn = true;
      if (p.photo_type === "fuel" || p.photo_type === "odometer") {
        existing.hasFuelOdometer = true;
      }
    }
    map.set(p.booking_id, existing);
  });
  
  return map;
}

/**
 * Batch fetch damage reports by booking IDs
 */
export async function batchFetchDamages(bookingIds: string[]): Promise<Map<string, number>> {
  if (bookingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("damage_reports")
    .select("booking_id, id")
    .in("booking_id", bookingIds);
  
  if (error) {
    console.error("Error fetching damages:", error);
    return new Map();
  }
  
  const map = new Map<string, number>();
  (data || []).forEach(d => {
    const count = map.get(d.booking_id) || 0;
    map.set(d.booking_id, count + 1);
  });
  
  return map;
}

/**
 * Batch fetch inspection metrics by booking IDs
 */
export async function batchFetchInspections(bookingIds: string[]): Promise<Map<string, {
  hasPickup: boolean;
  hasReturn: boolean;
  hasFuelOdometer: boolean;
}>> {
  if (bookingIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("inspection_metrics")
    .select("booking_id, phase, fuel_level, odometer")
    .in("booking_id", bookingIds);
  
  if (error) {
    console.error("Error fetching inspections:", error);
    return new Map();
  }
  
  const map = new Map<string, { hasPickup: boolean; hasReturn: boolean; hasFuelOdometer: boolean }>();
  (data || []).forEach(i => {
    const existing = map.get(i.booking_id) || { hasPickup: false, hasReturn: false, hasFuelOdometer: false };
    if (i.phase === "pickup") existing.hasPickup = true;
    if (i.phase === "return") {
      existing.hasReturn = true;
      if (i.fuel_level !== null && i.odometer !== null) {
        existing.hasFuelOdometer = true;
      }
    }
    map.set(i.booking_id, existing);
  });
  
  return map;
}

/**
 * Batch fetch vehicle expenses - aggregated by unit
 * This fixes the N+1 query issue in use-vehicle-units
 */
export async function batchFetchVehicleExpenses(unitIds: string[]): Promise<Map<string, number>> {
  if (unitIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from("vehicle_expenses")
    .select("vehicle_unit_id, amount")
    .in("vehicle_unit_id", unitIds);
  
  if (error) {
    console.error("Error fetching expenses:", error);
    return new Map();
  }
  
  const map = new Map<string, number>();
  (data || []).forEach(e => {
    const total = map.get(e.vehicle_unit_id) || 0;
    map.set(e.vehicle_unit_id, total + Number(e.amount));
  });
  
  return map;
}

/**
 * Calculate payment status from payments array
 */
export function calculatePaymentStatus(
  payments: Array<{ amount: number; status: string; payment_type: string }>,
  totalAmount: number,
  depositAmount: number
): { paymentStatus: "paid" | "pending" | "partial"; verificationStatus: "verified" | "pending" | "rejected" } {
  const completedRental = payments
    .filter(p => p.payment_type === "rental" && p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  
  let paymentStatus: "paid" | "pending" | "partial" = "pending";
  if (completedRental >= totalAmount) {
    paymentStatus = "paid";
  } else if (completedRental > 0) {
    paymentStatus = "partial";
  }
  
  return { paymentStatus, verificationStatus: "pending" };
}

/**
 * Format vehicle name consistently
 */
export function formatVehicleName(vehicle: VehicleBaseData | null): string {
  if (!vehicle) return "No vehicle assigned";
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

/**
 * Format customer name consistently
 */
export function formatCustomerName(profile: ProfileBaseData | null): string {
  if (!profile?.full_name) return "Unknown Customer";
  return profile.full_name;
}
