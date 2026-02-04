/**
 * Fleet Domain Types
 */

export interface FleetCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  dailyRate: number;
  seats: number | null;
  fuelType: string | null;
  transmission: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Computed
  availableCount?: number;
  totalCount?: number;
}

export interface VehicleUnit {
  id: string;
  vin: string;
  licensePlate: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: "available" | "on_rent" | "maintenance" | "damage";
  locationId: string | null;
  locationName?: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  notes: string | null;
  currentMileage: number | null;
  acquisitionCost: number | null;
  acquisitionDate: string | null;
  tankCapacityLiters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  imageUrl?: string;
  dailyRate: number;
  seats?: number;
  fuelType?: string;
  transmission?: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateUnitInput {
  categoryId: string;
  vin: string;
  licensePlate: string;
  locationId: string;
  year?: number;
  make?: string;
  model?: string;
  status?: VehicleUnit["status"];
  tankCapacityLiters?: number;
  notes?: string;
}

export interface UpdateUnitInput {
  id: string;
  status?: VehicleUnit["status"];
  locationId?: string;
  notes?: string;
  currentMileage?: number;
}

export interface MoveUnitInput {
  unitId: string;
  targetLocationId: string;
  reason: string;
  panelSource: "admin" | "ops";
}
