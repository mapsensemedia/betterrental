/**
 * Hook to fetch additional driver and young driver fee settings from system_settings.
 * These fees are admin-configurable and used across the customer booking funnel.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverFeeSettings {
  additionalDriverDailyRate: number;
  youngAdditionalDriverDailyRate: number;
}

const DEFAULTS: DriverFeeSettings = {
  additionalDriverDailyRate: 15.99,
  youngAdditionalDriverDailyRate: 15.00,
};

export function useDriverFeeSettings() {
  return useQuery({
    queryKey: ["driver-fee-settings"],
    queryFn: async (): Promise<DriverFeeSettings> => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("key, value")
        .in("key", ["additional_driver_daily_rate", "young_additional_driver_daily_rate"]);

      if (error) {
        console.warn("Driver fee settings fetch failed, using defaults:", error.message);
        return DEFAULTS;
      }

      const rows = (data ?? []) as unknown as { key: string; value: string }[];
      const adRate = rows.find((r) => r.key === "additional_driver_daily_rate");
      const yadRate = rows.find((r) => r.key === "young_additional_driver_daily_rate");

      return {
        additionalDriverDailyRate: adRate ? parseFloat(adRate.value) || DEFAULTS.additionalDriverDailyRate : DEFAULTS.additionalDriverDailyRate,
        youngAdditionalDriverDailyRate: yadRate ? parseFloat(yadRate.value) || DEFAULTS.youngAdditionalDriverDailyRate : DEFAULTS.youngAdditionalDriverDailyRate,
      };
    },
    staleTime: 30_000,
  });
}
