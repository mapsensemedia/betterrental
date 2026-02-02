/**
 * Add-Ons Management Hook
 * Full CRUD operations for add-ons pricing in admin panel
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AddOnRecord {
  id: string;
  name: string;
  description: string | null;
  daily_rate: number;
  one_time_fee: number | null;
  is_active: boolean;
  created_at: string;
}

export interface UpdateAddOnInput {
  id: string;
  name?: string;
  description?: string | null;
  daily_rate?: number;
  one_time_fee?: number | null;
  is_active?: boolean;
}

export interface CreateAddOnInput {
  name: string;
  description?: string;
  daily_rate: number;
  one_time_fee?: number;
  is_active?: boolean;
}

/**
 * Fetch all add-ons for admin management (includes inactive)
 */
export function useManageAddOns() {
  return useQuery({
    queryKey: ["admin-add-ons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("add_ons")
        .select("*")
        .order("name");

      if (error) throw error;

      return (data || []).map((addon) => ({
        id: addon.id,
        name: addon.name,
        description: addon.description,
        daily_rate: Number(addon.daily_rate),
        one_time_fee: addon.one_time_fee ? Number(addon.one_time_fee) : null,
        is_active: addon.is_active ?? true,
        created_at: addon.created_at,
      })) as AddOnRecord[];
    },
    staleTime: 10000, // 10 seconds - allow quick updates
  });
}

/**
 * Update add-on pricing or details
 */
export function useUpdateAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAddOnInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("add_ons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both admin and customer add-on queries
      queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });
      queryClient.invalidateQueries({ queryKey: ["add-ons"] });
      toast.success("Add-on updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update add-on: " + error.message);
    },
  });
}

/**
 * Create new add-on
 */
export function useCreateAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAddOnInput) => {
      const { data, error } = await supabase
        .from("add_ons")
        .insert({
          name: input.name,
          description: input.description || null,
          daily_rate: input.daily_rate,
          one_time_fee: input.one_time_fee || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });
      queryClient.invalidateQueries({ queryKey: ["add-ons"] });
      toast.success("Add-on created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create add-on: " + error.message);
    },
  });
}

/**
 * Delete add-on
 */
export function useDeleteAddOn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("add_ons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-add-ons"] });
      queryClient.invalidateQueries({ queryKey: ["add-ons"] });
      toast.success("Add-on deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete add-on: " + error.message);
    },
  });
}
