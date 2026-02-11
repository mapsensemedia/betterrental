/**
 * Protection Groups - Vehicle category to protection pricing group mapping
 * 
 * Group 1: Mystery Car, Compact, Mid-Size Sedan, Full-Size Sedan, Mid-Size SUV
 * Group 2: Minivan, Standard SUV
 * Group 3: Large SUV
 */
import type { ProtectionPackage } from "@/lib/pricing";

export type ProtectionGroup = 1 | 2 | 3;

/** Group-specific daily rates keyed by plan tier */
export interface GroupRates {
  basic: number;
  smart: number;
  premium: number;
}

export const GROUP_RATES: Record<ProtectionGroup, GroupRates> = {
  1: { basic: 32.99, smart: 37.99, premium: 49.99 },
  2: { basic: 52.99, smart: 57.99, premium: 69.99 },
  3: { basic: 64.99, smart: 69.99, premium: 82.99 },
};

export const GROUP_LABELS: Record<ProtectionGroup, { name: string; categories: string[] }> = {
  1: {
    name: "Group 1",
    categories: ["Mystery Car", "Compact", "Mid-Size Sedan", "Full-Size Sedan", "Mid-Size SUV"],
  },
  2: {
    name: "Group 2",
    categories: ["Minivan", "Standard SUV"],
  },
  3: {
    name: "Group 3",
    categories: ["Large SUV"],
  },
};

/**
 * Determine which protection pricing group a vehicle category belongs to.
 * Uses case-insensitive substring matching.
 */
export function getProtectionGroup(categoryName: string | null | undefined): ProtectionGroup {
  if (!categoryName) return 1;
  const name = categoryName.toUpperCase();

  // Group 3: Large SUV
  if (name.includes("LARGE") && name.includes("SUV")) return 3;

  // Group 2: Minivan, Standard SUV
  if (name.includes("MINIVAN")) return 2;
  if (name.includes("STANDARD") && name.includes("SUV")) return 2;

  // Everything else → Group 1
  return 1;
}

/**
 * Build protection packages with group-specific pricing.
 * Deductibles are consistent across groups: Basic = $800, Smart/Premium = $0.
 */
export function getGroupProtectionPackages(group: ProtectionGroup): ProtectionPackage[] {
  const rates = GROUP_RATES[group];

  return [
    {
      id: "none",
      name: "No extra protection",
      dailyRate: 0,
      deductible: "Up to full vehicle value",
      rating: 0,
      features: [
        { name: "Loss Damage Waiver", included: false },
        { name: "Tire and Glass Protection", included: false },
        { name: "Extended Roadside Protection", included: false },
      ],
    },
    {
      id: "basic",
      name: "Basic Protection",
      dailyRate: rates.basic,
      deductible: "Up to $800.00",
      rating: 1,
      features: [
        { name: "Loss Damage Waiver", included: true, tooltip: "Covers vehicle damage and theft with reduced deductible" },
        { name: "Tire and Glass Protection", included: false },
        { name: "Extended Roadside Protection", included: false },
      ],
    },
    {
      id: "smart",
      name: "Smart Protection",
      dailyRate: rates.smart,
      deductible: "No deductible",
      rating: 2,
      isRecommended: true,
      features: [
        { name: "Loss Damage Waiver", included: true, tooltip: "Full coverage with zero deductible" },
        { name: "Tire and Glass Protection", included: true, tooltip: "Covers tire and windshield damage" },
        { name: "Extended Roadside Protection", included: false },
      ],
    },
    {
      id: "premium",
      name: "All Inclusive Protection",
      dailyRate: rates.premium,
      deductible: "No deductible",
      rating: 3,
      features: [
        { name: "Loss Damage Waiver", included: true, tooltip: "Complete peace of mind" },
        { name: "Tire and Glass Protection", included: true, tooltip: "Full tire and glass coverage" },
        { name: "Extended Roadside Protection", included: true, tooltip: "24/7 roadside assistance anywhere" },
      ],
    },
  ];
}

/**
 * Get the protection rate for a specific plan and category.
 * Useful for ops/admin contexts where you have a booking's plan ID and category.
 */
export function getProtectionRateForCategory(
  planId: string,
  categoryName: string | null | undefined
): { name: string; rate: number } {
  const group = getProtectionGroup(categoryName);
  const packages = getGroupProtectionPackages(group);
  const pkg = packages.find((p) => p.id === planId);
  return pkg ? { name: pkg.name, rate: pkg.dailyRate } : { name: "None", rate: 0 };
}
