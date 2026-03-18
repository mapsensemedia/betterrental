/**
 * Hook to query analytics_events from Supabase for admin dashboards.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsEventRow {
  id: string;
  event: string;
  properties: Record<string, unknown>;
  page: string | null;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
}

interface UseAnalyticsEventsOptions {
  startDate: Date;
  endDate: Date;
}

export function useAnalyticsEvents({ startDate, endDate }: UseAnalyticsEventsOptions) {
  return useQuery({
    queryKey: ["analytics-events", startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<AnalyticsEventRow[]> => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw error;
      return (data ?? []) as AnalyticsEventRow[];
    },
    staleTime: 60_000,
  });
}
