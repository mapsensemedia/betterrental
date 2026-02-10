/**
 * Booking Domain Types
 */

import type { Database } from "@/integrations/supabase/types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export interface BookingLocation {
  id: string;
  name: string;
  city: string;
  address: string;
  phone?: string | null;
}

export interface BookingVehicle {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string;
  seats?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
}

export interface BookingProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isVerified?: boolean;
  driverLicenseStatus?: string | null;
}

export interface BookingUnit {
  id: string;
  vin: string;
  licensePlate: string | null;
  status: string;
}

export interface BookingDeliveryStatus {
  status: string;
  updatedAt: string;
  locationLat: number | null;
  locationLng: number | null;
  notes: string | null;
  updatedBy: string | null;
}

export interface BookingSummary {
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
  returnLocationId: string | null;
  differentDropoffFee: number;
  // Joined data
  vehicle: BookingVehicle | null;
  location: BookingLocation | null;
  returnLocation: BookingLocation | null;
  profile: BookingProfile | null;
}

export interface BookingDetail extends BookingSummary {
  // Additional fields for detail view
  assignedUnitId: string | null;
  assignedDriverId: string | null;
  handedOverAt: string | null;
  handedOverBy: string | null;
  returnState: string | null;
  driverAgeBand: string | null;
  youngDriverFee: number | null;
  lateReturnFee: number | null;
  cardLastFour: string | null;
  cardType: string | null;
  cardHolderName: string | null;
  bookingSource: string | null;
  saveTimeAtCounter: boolean | null;
  specialInstructions: string | null;
  // Relations
  unit: BookingUnit | null;
  deliveryStatus: BookingDeliveryStatus | null;
  payments: BookingPayment[];
  addOns: BookingAddOn[];
  auditLogs: AuditLogEntry[];
}

export interface BookingPayment {
  id: string;
  amount: number;
  paymentType: string;
  paymentMethod: string | null;
  status: string;
  transactionId: string | null;
  createdAt: string;
}

export interface BookingAddOn {
  id: string;
  addOnId: string;
  price: number;
  quantity: number | null;
  addOn: {
    name: string;
    description: string | null;
  } | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

// Filter types
export interface BookingFilters {
  status?: BookingStatus | "all";
  dateRange?: { start: string; end: string } | null;
  locationId?: string;
  vehicleId?: string;
  search?: string;
  tab?: "all" | "pickups" | "active" | "returns" | "completed";
}

// Mutation inputs
export interface UpdateBookingStatusInput {
  bookingId: string;
  newStatus: BookingStatus;
  notes?: string;
  panelSource?: "admin" | "ops";
}

export interface VoidBookingInput {
  bookingId: string;
  reason: string;
  refundAmount?: number;
  panelSource: "admin" | "ops";
}

export interface AssignVehicleInput {
  bookingId: string;
  categoryId: string;
  locationId: string;
}
