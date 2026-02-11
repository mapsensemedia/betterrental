/**
 * Hook to fetch and update protection package pricing from system_settings.
 * All 3 groups are now admin-editable via system_settings.
 * Falls back to hardcoded defaults if settings are not found.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProtectionPackage } from "@/lib/pricing";
import { getProtectionGroup } from "@/lib/protection-groups";
import type { ProtectionGroup } from "@/lib/protection-groups";

// Settings keys per group prefix
const GROUP_PREFIXES: Record<ProtectionGroup, string> = {
  1: "protection",
  2: "protection_g2",
  3: "protection_g3",
};

// Default values per group
const GROUP_DEFAULTS: Record<ProtectionGroup, GroupSettings> = {
  1: {
    basic_rate: "32.99",
    basic_deductible: "Up to $800.00",
    smart_rate: "37.99",
    smart_original_rate: "",
    smart_discount: "",
    smart_deductible: "No deductible",
    premium_rate: "49.99",
    premium_original_rate: "",
    premium_discount: "",
    premium_deductible: "No deductible",
  },
  2: {
    basic_rate: "52.99",
    basic_deductible: "Up to $800.00",
    smart_rate: "57.99",
    smart_original_rate: "",
    smart_discount: "",
    smart_deductible: "No deductible",
    premium_rate: "69.99",
    premium_original_rate: "",
    premium_discount: "",
    premium_deductible: "No deductible",
  },
  3: {
    basic_rate: "64.99",
    basic_deductible: "Up to $800.00",
    smart_rate: "69.99",
    smart_original_rate: "",
    smart_discount: "",
    smart_deductible: "No deductible",
    premium_rate: "82.99",
    premium_original_rate: "",
    premium_discount: "",
    premium_deductible: "No deductible",
  },
};

export interface GroupSettings {
  basic_rate: string;
  basic_deductible: string;
  smart_rate: string;
  smart_original_rate: string;
  smart_discount: string;
  smart_deductible: string;
  premium_rate: string;
  premium_original_rate: string;
  premium_discount: string;
  premium_deductible: string;
}

const SETTING_SUFFIXES = [
  "basic_rate", "basic_deductible",
  "smart_rate", "smart_original_rate", "smart_discount", "smart_deductible",
  "premium_rate", "premium_original_rate", "premium_discount", "premium_deductible",
] as const;

function getAllSettingKeys(): string[] {
  const keys: string[] = [];
  for (const [, prefix] of Object.entries(GROUP_PREFIXES)) {
    for (const suffix of SETTING_SUFFIXES) {
      keys.push(`${prefix}_${suffix}`);
    }
  }
  return keys;
}

function parseGroupSettings(
  rows: { key: string; value: string }[],
  group: ProtectionGroup
): GroupSettings {
  const defaults = GROUP_DEFAULTS[group];
  const result = { ...defaults };
  const prefix = GROUP_PREFIXES[group];
  
  for (const row of rows) {
    for (const suffix of SETTING_SUFFIXES) {
      if (row.key === `${prefix}_${suffix}`) {
        (result as any)[suffix] = row.value;
      }
    }
  }
  return result;
}

/** Build ProtectionPackage[] from group settings */
export function buildProtectionPackages(settings: GroupSettings): ProtectionPackage[] {
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
      dailyRate: parseFloat(settings.basic_rate) || 32.99,
      deductible: settings.basic_deductible,
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
      dailyRate: parseFloat(settings.smart_rate) || 37.99,
      originalRate: (() => {
        const orig = parseFloat(settings.smart_original_rate);
        const daily = parseFloat(settings.smart_rate) || 37.99;
        return !isNaN(orig) && orig > daily ? orig : undefined;
      })(),
      discount: settings.smart_discount || undefined,
      deductible: settings.smart_deductible,
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
      dailyRate: parseFloat(settings.premium_rate) || 49.99,
      originalRate: (() => {
        const orig = parseFloat(settings.premium_original_rate);
        const daily = parseFloat(settings.premium_rate) || 49.99;
        return !isNaN(orig) && orig > daily ? orig : undefined;
      })(),
      discount: settings.premium_discount || undefined,
      deductible: settings.premium_deductible,
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
 * Fetch protection settings for all groups and return packages for the requested group.
 */
export function useProtectionPackages(categoryName?: string | null) {
  const allKeys = getAllSettingKeys();
  
  const query = useQuery({
    queryKey: ["protection-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("key, value")
        .in("key", allKeys);

      if (error) {
        console.warn("Protection settings fetch failed, using defaults:", error.message);
        return [] as { key: string; value: string }[];
      }

      return (data ?? []) as unknown as { key: string; value: string }[];
    },
    staleTime: 30_000,
  });

  const rows = query.data ?? [];
  const group = getProtectionGroup(categoryName);
  const groupSettings = parseGroupSettings(rows, group);
  const packages = buildProtectionPackages(groupSettings);

  const rates: Record<string, { name: string; rate: number }> =
    Object.fromEntries(
      packages.map((pkg) => [pkg.id, { name: pkg.name, rate: pkg.dailyRate }])
    );

  return {
    packages,
    rates,
    settings: groupSettings,
    allRows: rows,
    isLoading: query.isLoading,
    group,
  };
}

/** Get settings for a specific group from raw rows */
export function getGroupSettingsFromRows(rows: { key: string; value: string }[], group: ProtectionGroup): GroupSettings {
  return parseGroupSettings(rows, group);
}

/** Admin hook: update protection settings for any group */
export function useUpdateProtectionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { group: ProtectionGroup; settings: Partial<GroupSettings> }) => {
      const prefix = GROUP_PREFIXES[updates.group];
      for (const [suffix, value] of Object.entries(updates.settings)) {
        const key = `${prefix}_${suffix}`;
        const { error } = await supabase
          .from("system_settings" as any)
          .upsert({ key, value: String(value) } as any, { onConflict: "key" });
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
