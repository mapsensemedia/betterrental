/**
 * Fuel pricing constants and utilities
 * Our fuel is offered at 5 cents below market rate
 */

// Market average fuel price per liter (updated periodically)
export const MARKET_FUEL_PRICE_PER_LITER = 1.85; // CAD

// Our discount below market
export const FUEL_DISCOUNT_CENTS = 5; // cents

// Our fuel price per liter
export const OUR_FUEL_PRICE_PER_LITER = MARKET_FUEL_PRICE_PER_LITER - FUEL_DISCOUNT_CENTS / 100;

// Average tank sizes by category
export const TANK_SIZES: Record<string, number> = {
  economy: 45,
  compact: 50,
  midsize: 55,
  fullsize: 65,
  suv: 75,
  "large-suv": 90,
  minivan: 75,
  premium: 70,
  luxury: 80,
  default: 60,
};

/**
 * Calculate fuel cost for a full tank
 * @param tankLiters Tank size in liters (defaults to average)
 * @returns Object with our price, market price, and savings
 */
export function calculateFuelCost(tankLiters: number = TANK_SIZES.default): {
  ourPrice: number;
  marketPrice: number;
  savings: number;
  tankLiters: number;
} {
  const ourPrice = tankLiters * OUR_FUEL_PRICE_PER_LITER;
  const marketPrice = tankLiters * MARKET_FUEL_PRICE_PER_LITER;
  const savings = marketPrice - ourPrice;

  return {
    ourPrice: Math.round(ourPrice * 100) / 100,
    marketPrice: Math.round(marketPrice * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    tankLiters,
  };
}

/**
 * Get tank size for a category (fallback when no VIN-specific size is available)
 */
export function getTankSize(category: string): number {
  const lowerCategory = category.toLowerCase();
  
  for (const [key, size] of Object.entries(TANK_SIZES)) {
    if (lowerCategory.includes(key)) {
      return size;
    }
  }
  
  return TANK_SIZES.default;
}

/**
 * Calculate fuel cost using VIN-specific tank capacity
 * Falls back to category-based tank size if not specified
 */
export function calculateFuelCostForUnit(
  unitTankCapacity: number | null | undefined,
  categoryFallback: string = "default"
): ReturnType<typeof calculateFuelCost> {
  const tankLiters = unitTankCapacity ?? getTankSize(categoryFallback);
  return calculateFuelCost(tankLiters);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUEL SHORTAGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fuel levels from dropdown (percentage values)
 */
export const FUEL_LEVELS = [
  { value: 0, label: "Empty" },
  { value: 12, label: "1/8" },
  { value: 25, label: "1/4" },
  { value: 37, label: "3/8" },
  { value: 50, label: "1/2" },
  { value: 62, label: "5/8" },
  { value: 75, label: "3/4" },
  { value: 87, label: "7/8" },
  { value: 100, label: "Full" },
];

/**
 * Get the label for a fuel level percentage
 */
export function getFuelLevelLabel(percentage: number): string {
  const level = FUEL_LEVELS.find(l => l.value === percentage);
  return level?.label || `${percentage}%`;
}

/**
 * Calculate fuel shortage and associated charge
 * @param pickupFuelPercent Fuel level at pickup (0-100)
 * @param returnFuelPercent Fuel level at return (0-100)
 * @param tankCapacityLiters Tank capacity in liters
 * @returns Fuel shortage details or null if no shortage
 */
export interface FuelShortageResult {
  hasShortage: boolean;
  shortagePercent: number;
  shortageLiters: number;
  chargeAmount: number;
  pickupLabel: string;
  returnLabel: string;
  description: string;
}

export function calculateFuelShortage(
  pickupFuelPercent: number | null,
  returnFuelPercent: number | null,
  tankCapacityLiters: number = TANK_SIZES.default
): FuelShortageResult | null {
  // Can't calculate without both values
  if (pickupFuelPercent === null || returnFuelPercent === null) {
    return null;
  }

  const shortagePercent = pickupFuelPercent - returnFuelPercent;
  
  // No shortage if return fuel is same or higher
  if (shortagePercent <= 0) {
    return {
      hasShortage: false,
      shortagePercent: 0,
      shortageLiters: 0,
      chargeAmount: 0,
      pickupLabel: getFuelLevelLabel(pickupFuelPercent),
      returnLabel: getFuelLevelLabel(returnFuelPercent),
      description: "No fuel shortage",
    };
  }

  // Calculate liters missing
  const shortageLiters = (shortagePercent / 100) * tankCapacityLiters;
  
  // Charge at our fuel price
  const chargeAmount = Math.ceil(shortageLiters * OUR_FUEL_PRICE_PER_LITER * 100) / 100;

  return {
    hasShortage: true,
    shortagePercent,
    shortageLiters: Math.round(shortageLiters * 10) / 10,
    chargeAmount,
    pickupLabel: getFuelLevelLabel(pickupFuelPercent),
    returnLabel: getFuelLevelLabel(returnFuelPercent),
    description: `Fuel shortage: ${getFuelLevelLabel(pickupFuelPercent)} → ${getFuelLevelLabel(returnFuelPercent)} (${Math.round(shortageLiters)}L × $${OUR_FUEL_PRICE_PER_LITER.toFixed(2)}/L)`,
  };
}
