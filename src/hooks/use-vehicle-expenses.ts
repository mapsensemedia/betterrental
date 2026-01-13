import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface VehicleExpense {
  id: string;
  vehicle_unit_id: string;
  expense_type: string;
  amount: number;
  description: string | null;
  expense_date: string;
  vendor: string | null;
  receipt_url: string | null;
  mileage_at_expense: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_TYPES = [
  { value: "gas", label: "Gas/Fuel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "servicing", label: "Servicing" },
  { value: "damage", label: "Damage" },
  { value: "insurance", label: "Insurance" },
  { value: "registration", label: "Registration" },
  { value: "cleaning", label: "Cleaning" },
  { value: "tires", label: "Tires" },
  { value: "oil_change", label: "Oil Change" },
  { value: "inspection", label: "Inspection" },
  { value: "parts", label: "Parts" },
  { value: "other", label: "Other" },
] as const;

export interface ExpenseFilters {
  vehicleUnitId?: string;
  expenseType?: string;
  startDate?: string;
  endDate?: string;
}

export function useVehicleExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ["vehicle-expenses", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (filters.vehicleUnitId) {
        query = query.eq("vehicle_unit_id", filters.vehicleUnitId);
      }

      if (filters.expenseType && filters.expenseType !== "all") {
        query = query.eq("expense_type", filters.expenseType);
      }

      if (filters.startDate) {
        query = query.gte("expense_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("expense_date", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VehicleExpense[];
    },
    enabled: !!filters.vehicleUnitId,
  });
}

export function useExpenseSummary(vehicleUnitId: string | null) {
  return useQuery({
    queryKey: ["expense-summary", vehicleUnitId],
    queryFn: async () => {
      if (!vehicleUnitId) return null;

      const { data, error } = await supabase
        .from("vehicle_expenses")
        .select("expense_type, amount")
        .eq("vehicle_unit_id", vehicleUnitId);

      if (error) throw error;

      // Group by expense type
      const byType: Record<string, number> = {};
      let total = 0;

      (data || []).forEach((expense) => {
        const amount = Number(expense.amount);
        byType[expense.expense_type] = (byType[expense.expense_type] || 0) + amount;
        total += amount;
      });

      return {
        byType,
        total,
        count: data?.length || 0,
      };
    },
    enabled: !!vehicleUnitId,
  });
}

export function useCreateVehicleExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<VehicleExpense, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("vehicle_expenses")
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary", variables.vehicle_unit_id] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
      toast({ title: "Expense added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateVehicleExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehicleExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicle_expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
      toast({ title: "Expense updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteVehicleExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
