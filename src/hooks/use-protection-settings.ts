/**
 * Hook to fetch and update protection package pricing from system_settings.
 * Falls back to hardcoded defaults if settings are not found.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProtectionPackage } from "@/lib/pricing";

// Default values matching the hardcoded constants
const DEFAULTS = {
  protection_basic_rate: "33.99",
  protection_basic_deductible: "Up to $800.00",
  protection_smart_rate: "39.25",
  protection_smart_original_rate: "50.97",
  protection_smart_discount: "23% online discount",
  protection_smart_deductible: "No deductible",
  protection_premium_rate: "49.77",
  protection_premium_original_rate: "59.96",
  protection_premium_discount: "17% online discount",
  protection_premium_deductible: "No deductible",
};

const PROTECTION_KEYS = Object.keys(DEFAULTS);

type ProtectionSettings = typeof DEFAULTS;

function parseSettings(
  rows: { key: string; value: string }[]
): ProtectionSettings {
  const result = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in result) {
      (result as any)[row.key] = row.value;
    }
  }
  return result;
}

/** Build dynamic PROTECTION_PACKAGES from settings */
export function buildProtectionPackages(
  settings: ProtectionSettings
): ProtectionPackage[] {
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
      dailyRate: parseFloat(settings.protection_basic_rate) || 33.99,
      deductible: settings.protection_basic_deductible,
      rating: 1,
      features: [
        {
          name: "Loss Damage Waiver",
          included: true,
          tooltip: "Covers vehicle damage and theft with reduced deductible",
        },
        { name: "Tire and Glass Protection", included: false },
        { name: "Extended Roadside Protection", included: false },
      ],
    },
    {
      id: "smart",
      name: "Smart Protection",
      dailyRate: parseFloat(settings.protection_smart_rate) || 39.25,
      originalRate:
        parseFloat(settings.protection_smart_original_rate) || undefined,
      discount: settings.protection_smart_discount || undefined,
      deductible: settings.protection_smart_deductible,
      rating: 2,
      isRecommended: true,
      features: [
        {
          name: "Loss Damage Waiver",
          included: true,
          tooltip: "Full coverage with zero deductible",
        },
        {
          name: "Tire and Glass Protection",
          included: true,
          tooltip: "Covers tire and windshield damage",
        },
        { name: "Extended Roadside Protection", included: false },
      ],
    },
    {
      id: "premium",
      name: "All Inclusive Protection",
      dailyRate: parseFloat(settings.protection_premium_rate) || 49.77,
      originalRate:
        parseFloat(settings.protection_premium_original_rate) || undefined,
      discount: settings.protection_premium_discount || undefined,
      deductible: settings.protection_premium_deductible,
      rating: 3,
      features: [
        {
          name: "Loss Damage Waiver",
          included: true,
          tooltip: "Complete peace of mind",
        },
        {
          name: "Tire and Glass Protection",
          included: true,
          tooltip: "Full tire and glass coverage",
        },
        {
          name: "Extended Roadside Protection",
          included: true,
          tooltip: "24/7 roadside assistance anywhere",
        },
      ],
    },
  ];
}

/** Fetch protection settings and return dynamic packages */
export function useProtectionPackages() {
  const query = useQuery({
    queryKey: ["protection-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("key, value")
        .in("key", PROTECTION_KEYS);

      if (error) {
        console.warn("Protection settings fetch failed, using defaults:", error.message);
        return parseSettings([]);
      }

      return parseSettings(
        (data ?? []) as unknown as { key: string; value: string }[]
      );
    },
    staleTime: 30_000,
  });

  const packages = buildProtectionPackages(query.data ?? parseSettings([]));

  const rates: Record<string, { name: string; rate: number }> =
    Object.fromEntries(
      packages.map((pkg) => [pkg.id, { name: pkg.name, rate: pkg.dailyRate }])
    );

  return {
    packages,
    rates,
    settings: query.data ?? parseSettings([]),
    isLoading: query.isLoading,
  };
}

/** Admin hook: update protection settings */
export function useUpdateProtectionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ProtectionSettings>) => {
      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabase
          .from("system_settings" as any)
          .upsert({ key, value: String(value) } as any, {
            onConflict: "key",
          });
        if (error) throw new Error(`Failed to update ${key}: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protection-settings"] });
      toast.success("Protection pricing updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });
}
