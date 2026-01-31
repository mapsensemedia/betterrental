/**
 * Competitor Pricing Hook
 * Manages competitor pricing data for internal reference
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CompetitorPricing {
  id: string;
  vehicleId: string;
  competitorName: string;
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  notes: string | null;
  lastUpdated: string | null;
  createdAt: string;
}

export function useCompetitorPricing(vehicleId?: string) {
  return useQuery({
    queryKey: ["competitor-pricing", vehicleId],
    queryFn: async (): Promise<CompetitorPricing[]> => {
      let query = supabase
        .from("competitor_pricing")
        .select("*")
        .order("competitor_name");

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        competitorName: row.competitor_name,
        dailyRate: row.daily_rate,
        weeklyRate: row.weekly_rate,
        monthlyRate: row.monthly_rate,
        notes: row.notes,
        lastUpdated: row.last_updated,
        createdAt: row.created_at,
      }));
    },
    enabled: true,
  });
}

export function useUpsertCompetitorPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pricing: {
      id?: string;
      vehicleId: string;
      competitorName: string;
      dailyRate?: number | null;
      weeklyRate?: number | null;
      monthlyRate?: number | null;
      notes?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        vehicle_id: pricing.vehicleId,
        competitor_name: pricing.competitorName,
        daily_rate: pricing.dailyRate,
        weekly_rate: pricing.weeklyRate,
        monthly_rate: pricing.monthlyRate,
        notes: pricing.notes,
        last_updated: new Date().toISOString().split("T")[0],
        updated_by: userData?.user?.id,
      };

      if (pricing.id) {
        const { error } = await supabase
          .from("competitor_pricing")
          .update(payload)
          .eq("id", pricing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("competitor_pricing")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });
      toast({ title: "Competitor pricing saved" });
    },
    onError: (error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCompetitorPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("competitor_pricing")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitor-pricing"] });
      toast({ title: "Competitor pricing deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });
}
