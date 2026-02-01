/**
 * Maintenance Logs Hook
 * CRUD operations for vehicle maintenance records
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaintenanceLog {
  id: string;
  vehicle_unit_id: string;
  maintenance_type: string;
  description: string | null;
  cost: number;
  mileage_at_service: number | null;
  service_date: string;
  vendor_name: string | null;
  invoice_number: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle_unit?: {
    vin: string;
    license_plate: string | null;
    vehicle: {
      make: string;
      model: string;
      year: number;
    };
  };
}

export function useMaintenanceLogs(filters?: {
  vehicleUnitId?: string;
  dateFrom?: string;
  dateTo?: string;
  maintenanceType?: string;
}) {
  return useQuery({
    queryKey: ["maintenance-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_logs")
        .select(`
          *,
          vehicle_unit:vehicle_units(
            vin,
            license_plate,
            vehicle:vehicles(make, model, year)
          )
        `)
        .order("service_date", { ascending: false });

      if (filters?.vehicleUnitId) {
        query = query.eq("vehicle_unit_id", filters.vehicleUnitId);
      }
      if (filters?.dateFrom) {
        query = query.gte("service_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("service_date", filters.dateTo);
      }
      if (filters?.maintenanceType) {
        query = query.eq("maintenance_type", filters.maintenanceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceLog[];
    },
  });
}

export function useMaintenanceLogsByUnit(vehicleUnitId: string | null) {
  return useQuery({
    queryKey: ["maintenance-logs-unit", vehicleUnitId],
    queryFn: async () => {
      if (!vehicleUnitId) return [];

      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .eq("vehicle_unit_id", vehicleUnitId)
        .order("service_date", { ascending: false });

      if (error) throw error;
      return data as MaintenanceLog[];
    },
    enabled: !!vehicleUnitId,
  });
}

export interface CreateMaintenanceParams {
  vehicle_unit_id: string;
  maintenance_type: string;
  description?: string;
  cost: number;
  mileage_at_service?: number;
  service_date: string;
  vendor_name?: string;
  invoice_number?: string;
  notes?: string;
  receipt_url?: string;
}

export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateMaintenanceParams) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("maintenance_logs")
        .insert({
          ...params,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
      toast.success("Maintenance log added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add maintenance log: " + error.message);
    },
  });
}

export function useUpdateMaintenanceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: Partial<MaintenanceLog> & { id: string }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("maintenance_logs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
      toast.success("Maintenance log updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update maintenance log: " + error.message);
    },
  });
}

export function useDeleteMaintenanceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_logs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
      toast.success("Maintenance log deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete maintenance log: " + error.message);
    },
  });
}

export function useMaintenanceTotalByUnit(vehicleUnitId: string | null) {
  return useQuery({
    queryKey: ["maintenance-total", vehicleUnitId],
    queryFn: async () => {
      if (!vehicleUnitId) return 0;

      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("cost")
        .eq("vehicle_unit_id", vehicleUnitId);

      if (error) throw error;
      return data.reduce((sum, log) => sum + Number(log.cost), 0);
    },
    enabled: !!vehicleUnitId,
  });
}
