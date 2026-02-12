/**
 * Hook to fetch additional driver and young driver fee settings from system_settings.
 * These fees are admin-configurable and used across the customer booking funnel.
 * 
 * Key priority: new spec keys → old keys → hardcoded defaults.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverFeeSettings {
  additionalDriverDailyRate: number;
  youngAdditionalDriverDailyRate: number;
}

const DEFAULTS: DriverFeeSettings = {
  additionalDriverDailyRate: 14.99,
  youngAdditionalDriverDailyRate: 19.99,
};

const ALL_KEYS = [
  "additional_driver_daily_rate_standard",
  "additional_driver_daily_rate_young",
  "additional_driver_daily_rate",
  "young_additional_driver_daily_rate",
];

export function useDriverFeeSettings() {
  return useQuery({
    queryKey: ["driver-fee-settings"],
    queryFn: async (): Promise<DriverFeeSettings> => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("key, value")
        .in("key", ALL_KEYS);

      if (error) {
        console.warn("Driver fee settings fetch failed, using defaults:", error.message);
        return DEFAULTS;
      }

      const rows = (data ?? []) as unknown as { key: string; value: string }[];
      const get = (key: string) => {
        const r = rows.find((r) => r.key === key);
        return r ? parseFloat(r.value) || undefined : undefined;
      };

      return {
        additionalDriverDailyRate:
          get("additional_driver_daily_rate_standard")
          ?? get("additional_driver_daily_rate")
          ?? DEFAULTS.additionalDriverDailyRate,
        youngAdditionalDriverDailyRate:
          get("additional_driver_daily_rate_young")
          ?? get("young_additional_driver_daily_rate")
          ?? DEFAULTS.youngAdditionalDriverDailyRate,
      };
    },
    staleTime: 30_000,
  });
}
