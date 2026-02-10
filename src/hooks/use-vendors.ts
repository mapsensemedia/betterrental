/**
 * Vendor Directory Hook
 * CRUD operations for the unified vendor directory
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const VENDOR_TYPES = [
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "acquisition", label: "Acquisition" },
  { value: "towing", label: "Towing" },
  { value: "general", label: "General" },
] as const;

export interface Vendor {
  id: string;
  name: string;
  vendor_type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  rating: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VendorServiceHistory {
  source: "maintenance" | "expense" | "incident";
  id: string;
  date: string;
  description: string;
  cost: number;
  vehicle_info?: string;
}

export function useVendors(filters?: { type?: string; active?: boolean }) {
  return useQuery({
    queryKey: ["vendors", filters],
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (filters?.type && filters.type !== "all") {
        query = query.eq("vendor_type", filters.type);
      }
      if (filters?.active !== undefined) {
        query = query.eq("is_active", filters.active);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Vendor[];
    },
  });
}

export function useVendorServiceHistory(vendorName: string | null) {
  return useQuery({
    queryKey: ["vendor-service-history", vendorName],
    queryFn: async () => {
      if (!vendorName) return [];

      const results: VendorServiceHistory[] = [];

      // Maintenance logs
      const { data: maintenance } = await supabase
        .from("maintenance_logs")
        .select("id, service_date, description, cost, maintenance_type, vehicle_unit_id")
        .ilike("vendor_name", vendorName)
        .order("service_date", { ascending: false })
        .limit(50);

      maintenance?.forEach((m) => {
        results.push({
          source: "maintenance",
          id: m.id,
          date: m.service_date,
          description: `${m.maintenance_type}: ${m.description || "No description"}`,
          cost: m.cost,
        });
      });

      // Vehicle expenses
      const { data: expenses } = await supabase
        .from("vehicle_expenses")
        .select("id, expense_date, description, amount, expense_type")
        .ilike("vendor", vendorName)
        .order("expense_date", { ascending: false })
        .limit(50);

      expenses?.forEach((e) => {
        results.push({
          source: "expense",
          id: e.id,
          date: e.expense_date,
          description: `${e.expense_type}: ${e.description || "No description"}`,
          cost: Number(e.amount),
        });
      });

      // Incident repairs
      const { data: incidents } = await supabase
        .from("incident_cases")
        .select("id, incident_date, description, final_invoice_amount, incident_type")
        .ilike("repair_vendor", vendorName)
        .order("incident_date", { ascending: false })
        .limit(50);

      incidents?.forEach((i) => {
        results.push({
          source: "incident",
          id: i.id,
          date: i.incident_date,
          description: `${i.incident_type}: ${i.description}`,
          cost: i.final_invoice_amount || 0,
        });
      });

      return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!vendorName,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: Omit<Vendor, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("vendors")
        .insert(vendor as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor added");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { error } = await supabase
        .from("vendors")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
