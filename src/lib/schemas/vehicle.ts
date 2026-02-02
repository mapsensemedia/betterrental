/**
 * Vehicle & Category Validation Schemas
 */
import { z } from "zod";

// Vehicle unit status
export const vehicleUnitStatusSchema = z.enum([
  "active",
  "maintenance",
  "retired",
  "pending",
]);
export type VehicleUnitStatus = z.infer<typeof vehicleUnitStatusSchema>;

// Fuel types
export const fuelTypeSchema = z.enum([
  "Petrol",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plugin Hybrid",
]);
export type FuelType = z.infer<typeof fuelTypeSchema>;

// Transmission types
export const transmissionSchema = z.enum(["Automatic", "Manual"]);
export type Transmission = z.infer<typeof transmissionSchema>;

// Vehicle category schema
export const vehicleCategorySchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export type VehicleCategory = z.infer<typeof vehicleCategorySchema>;

// Vehicle category creation input
export const createCategoryInputSchema = vehicleCategorySchema.omit({ id: true });
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Vehicle unit schema
export const vehicleUnitSchema = z.object({
  id: z.string().uuid().optional(),
  vin: z.string().length(17, "VIN must be exactly 17 characters").toUpperCase(),
  licensePlate: z.string().min(1).max(20),
  categoryId: z.string().uuid("Invalid category"),
  vehicleId: z.string().uuid("Invalid vehicle"),
  status: vehicleUnitStatusSchema.default("pending"),
  currentMileage: z.number().int().nonnegative().optional(),
  tankCapacity: z.number().positive().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export type VehicleUnit = z.infer<typeof vehicleUnitSchema>;

// VIN creation input (admin adding a VIN to fleet)
export const addVinInputSchema = z.object({
  vin: z.string().length(17, "VIN must be exactly 17 characters").toUpperCase(),
  licensePlate: z.string().min(1).max(20),
  categoryId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(), // Auto-matched or manually selected
  purchasePrice: z.number().positive().optional(),
  purchaseDate: z.string().datetime().optional(),
  currentMileage: z.number().int().nonnegative().optional(),
  tankCapacity: z.number().positive().max(200).optional(),
});

export type AddVinInput = z.infer<typeof addVinInputSchema>;

// Vehicle search/filter params
export const vehicleSearchParamsSchema = z.object({
  locationId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  minSeats: z.number().int().positive().optional(),
  fuelType: fuelTypeSchema.optional(),
  transmission: transmissionSchema.optional(),
});

export type VehicleSearchParams = z.infer<typeof vehicleSearchParamsSchema>;

/**
 * Validate VIN format (basic check)
 */
export function isValidVin(vin: string): boolean {
  if (vin.length !== 17) return false;
  // VIN cannot contain I, O, Q
  if (/[IOQ]/i.test(vin)) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

/**
 * Normalize VIN to uppercase
 */
export function normalizeVin(vin: string): string {
  return vin.toUpperCase().trim();
}
