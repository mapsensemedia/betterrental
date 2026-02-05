import type { DeliveryStatus, PortalStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ROW TYPES (Snake case - matches Supabase)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryStatusRow {
  id: string;
  booking_id: string;
  status: string;
  notes: string | null;
  photo_urls: unknown | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface DeliveryStatusLogRow {
  id: string;
  booking_id: string;
  status: string;
  notes: string | null;
  photo_urls: unknown | null;
  location_lat: number | null;
  location_lng: number | null;
  odometer_reading: number | null;
  created_at: string;
  created_by: string | null;
}

export interface VehicleUnitRow {
  id: string;
  vin: string;
  license_plate: string;
  color: string | null;
  current_mileage: number | null;
  status: string;
  category_id: string;
  location_id: string | null;
}

export interface VehicleCategoryRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  daily_rate: number;
}

export interface LocationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION TYPES (Camel case - for React components)
// ─────────────────────────────────────────────────────────────────────────────

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
  
  // Delivery-specific
  deliveryStatus: DeliveryStatus | null;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  
  // Vehicle info
  vehicleId: string;
  category: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
  
  // Assigned unit
  assignedUnit: {
    id: string;
    vin: string;
    licensePlate: string;
    color: string | null;
    currentMileage: number | null;
  } | null;
  
  // Customer
  customer: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  
  // Dispatch location (where driver picks up vehicle)
  dispatchLocation: {
    id: string;
    name: string;
    address: string;
  } | null;
  
  // UI helpers
  isUrgent: boolean;
  portalStatus: PortalStatus;
}

export interface DeliveryDetail extends DeliveryBooking {
  // Additional detail fields
  dailyRate: number;
  totalDays: number;
  totalAmount: number;
  notes: string | null;
  
  // Agreement & handover status
  agreementSignedAt: string | null;
  walkaroundAcknowledgedAt: string | null;
  handedOverAt: string | null;
  
  // Status history
  statusHistory: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  id: string;
  status: DeliveryStatus;
  notes: string | null;
  locationLat: number | null;
  locationLng: number | null;
  odometerReading: number | null;
  createdAt: string;
  createdBy: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateStatusInput {
  bookingId: string;
  status: DeliveryStatus;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
  odometerReading?: number;
  photoUrls?: string[];
}

export interface ClaimDeliveryInput {
  bookingId: string;
}

export interface CaptureHandoverInput {
  bookingId: string;
  photoUrls: string[];
  odometerReading?: number;
  notes?: string;
}

export interface RecordOdometerInput {
  bookingId: string;
  reading: number;
  phase: 'handover' | 'return';
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryScope = 'my' | 'available' | 'all';

export interface DeliveryListOptions {
  scope: DeliveryScope;
  statusFilter?: PortalStatus | null;
  searchQuery?: string;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDOVER CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

export interface HandoverChecklistState {
  agreementSigned: boolean;
  walkaroundComplete: boolean;
  photosUploaded: boolean;
  odometerRecorded: boolean;
}

export function isHandoverReady(checklist: HandoverChecklistState): boolean {
  return (
    checklist.agreementSigned &&
    checklist.walkaroundComplete &&
    checklist.photosUploaded
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a booking is a delivery (has pickup address)
 */
export function isDeliveryBooking(booking: { pickupAddress?: string | null }): boolean {
  return Boolean(booking.pickupAddress);
}

/**
 * Check if delivery is within 2 hours of start time
 */
export function isDeliveryUrgent(startAt: string): boolean {
  const start = new Date(startAt);
  const now = new Date();
  const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilStart <= 2 && hoursUntilStart > -24;
}
