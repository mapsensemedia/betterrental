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
