/**
 * Booking Validation Schemas
 * 
 * Central validation for booking creation, updates, and related operations.
 */
import { z } from "zod";

// Driver age bands supported by the system
export const driverAgeBandSchema = z.enum(["20_24", "25_70"]);
export type DriverAgeBandSchema = z.infer<typeof driverAgeBandSchema>;

// Age range as displayed to users
export const ageRangeSchema = z.enum(["20-24", "25-70"]);
export type AgeRangeSchema = z.infer<typeof ageRangeSchema>;

// Booking status enum
export const bookingStatusSchema = z.enum([
  "draft",
  "pending",
  "confirmed",
  "active",
  "completed",
  "cancelled",
]);
export type BookingStatusSchema = z.infer<typeof bookingStatusSchema>;

// Add-on input for booking creation
export const addOnInputSchema = z.object({
  addOnId: z.string().uuid("Invalid add-on ID"),
  price: z.number().nonnegative("Price must be non-negative"),
  quantity: z.number().int().positive().max(10, "Maximum 10 of each add-on"),
});
export type AddOnInput = z.infer<typeof addOnInputSchema>;

// Additional driver input
export const additionalDriverInputSchema = z.object({
  driverName: z.string().max(100).nullable().optional(),
  driverAgeBand: driverAgeBandSchema,
  youngDriverFee: z.number().nonnegative().default(0),
});
export type AdditionalDriverInput = z.infer<typeof additionalDriverInputSchema>;

// Base booking fields (shared between guest and authenticated)
const baseBookingFields = {
  vehicleId: z.string().uuid("Invalid vehicle/category ID"),
  locationId: z.string().uuid("Invalid location ID"),
  startAt: z.string().datetime("Invalid start date"),
  endAt: z.string().datetime("Invalid end date"),
  dailyRate: z.number().positive("Daily rate must be positive"),
  totalDays: z.number().int().positive().max(365, "Maximum rental is 365 days"),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  driverAgeBand: driverAgeBandSchema,
  youngDriverFee: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  addOns: z.array(addOnInputSchema).max(10).optional(),
  additionalDrivers: z.array(additionalDriverInputSchema).max(5).optional(),
  
  // Delivery options
  pickupAddress: z.string().max(500).optional(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  
  // Save Time at Counter
  saveTimeAtCounter: z.boolean().optional(),
  pickupContactName: z.string().max(100).optional(),
  pickupContactPhone: z.string().max(20).optional(),
  specialInstructions: z.string().max(500).optional(),
  
  // Drop-off location (different return location)
  returnLocationId: z.string().uuid().nullable().optional(),
  differentDropoffFee: z.number().nonnegative().optional(),
};

// Base booking input schema
export const baseBookingInputSchema = z.object(baseBookingFields).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "Return date must be after pickup date", path: ["endAt"] }
);

export type BaseBookingInput = z.infer<typeof baseBookingInputSchema>;

// Guest booking extends base with customer info
export const guestBookingInputSchema = z.object({
  ...baseBookingFields,
  firstName: z.string().min(1).max(100, "First name is too long").transform(s => s.trim()),
  lastName: z.string().min(1).max(100, "Last name is too long").transform(s => s.trim()),
  email: z.string().email("Invalid email address").max(255).transform(s => s.toLowerCase().trim()),
  phone: z.string().min(10).max(20, "Invalid phone number"),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "Return date must be after pickup date", path: ["endAt"] }
);

export type GuestBookingInput = z.infer<typeof guestBookingInputSchema>;

// Authenticated booking uses hold system
export const authenticatedBookingInputSchema = z.object({
  ...baseBookingFields,
  holdId: z.string().uuid("Invalid hold ID"),
  userPhone: z.string().max(20).optional(),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "Return date must be after pickup date", path: ["endAt"] }
);

export type AuthenticatedBookingInput = z.infer<typeof authenticatedBookingInputSchema>;

// Booking update schema (admin operations)
export const bookingUpdateSchema = z.object({
  status: bookingStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
  assignedUnitId: z.string().uuid().nullable().optional(),
  actualReturnAt: z.string().datetime().nullable().optional(),
}).partial();

export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;

// Search/filter params for booking queries
export const bookingSearchParamsSchema = z.object({
  status: z.union([bookingStatusSchema, z.array(bookingStatusSchema)]).optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type BookingSearchParams = z.infer<typeof bookingSearchParamsSchema>;

/**
 * Validate booking dates are reasonable
 */
export function validateBookingDates(startAt: string, endAt: string): { valid: boolean; error?: string } {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = new Date();
  
  // Start date shouldn't be too far in the past (allow some buffer for timezones)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (start < yesterday) {
    return { valid: false, error: "Pickup date cannot be in the past" };
  }
  
  // End must be after start
  if (end <= start) {
    return { valid: false, error: "Return date must be after pickup date" };
  }
  
  // Max rental duration
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 365) {
    return { valid: false, error: "Maximum rental duration is 365 days" };
  }
  
  return { valid: true };
}

/**
 * Validate age band is provided
 */
export function isValidAgeBand(ageBand: unknown): ageBand is DriverAgeBandSchema {
  return driverAgeBandSchema.safeParse(ageBand).success;
}
