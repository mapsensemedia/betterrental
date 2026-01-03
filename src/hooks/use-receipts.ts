import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";

interface BookingForReceipt {
  id: string;
  booking_code: string;
  user_id: string;
  daily_rate: number;
  total_days: number;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  start_at: string;
  end_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
  vehicle: {
    make: string;
    model: string;
    year: number;
  } | null;
  addOns: {
    name: string;
    price: number;
  }[];
  hasReceipt: boolean;
  receiptId: string | null;
}

// Search bookings for receipt creation
export function useBookingsForReceipt(search: string) {
  return useQuery({
    queryKey: ["bookings-for-receipt", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      let query = supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          user_id,
          daily_rate,
          total_days,
          subtotal,
          tax_amount,
          total_amount,
          start_at,
          end_at,
          vehicle:vehicles(make, model, year)
        `)
        .or(`booking_code.ilike.%${search}%`)
        .limit(10);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch existing receipts
      const bookingIds = data.map(b => b.id);
      const { data: receipts } = await supabase
        .from("receipts")
        .select("booking_id, id")
        .in("booking_id", bookingIds);
      const receiptMap = new Map(receipts?.map(r => [r.booking_id, r.id]) || []);

      // Fetch add-ons
      const { data: bookingAddOns } = await supabase
        .from("booking_add_ons")
        .select("booking_id, price, add_on:add_ons(name)")
        .in("booking_id", bookingIds);
      
      const addOnsMap = new Map<string, { name: string; price: number }[]>();
      (bookingAddOns || []).forEach((ba: any) => {
        const list = addOnsMap.get(ba.booking_id) || [];
        list.push({ name: ba.add_on?.name || "Add-on", price: ba.price });
        addOnsMap.set(ba.booking_id, list);
      });

      return data.map(b => ({
        id: b.id,
        booking_code: b.booking_code,
        user_id: b.user_id,
        daily_rate: b.daily_rate,
        total_days: b.total_days,
        subtotal: b.subtotal,
        tax_amount: b.tax_amount,
        total_amount: b.total_amount,
        start_at: b.start_at,
        end_at: b.end_at,
        profile: profileMap.get(b.user_id) || null,
        vehicle: b.vehicle,
        addOns: addOnsMap.get(b.id) || [],
        hasReceipt: receiptMap.has(b.id),
        receiptId: receiptMap.get(b.id) || null,
      })) as BookingForReceipt[];
    },
    enabled: search.length >= 2,
  });
}

interface CreateReceiptParams {
  bookingId: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  totals: { subtotal: number; tax: number; total: number };
  notes?: string;
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (params: CreateReceiptParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate receipt number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const receiptNumber = `REC-${timestamp}-${random}`;

      const { data, error } = await supabase
        .from("receipts")
        .insert({
          booking_id: params.bookingId,
          receipt_number: receiptNumber,
          line_items_json: params.lineItems,
          totals_json: params.totals,
          notes: params.notes || null,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      // Log receipt event
      await supabase.from("receipt_events").insert({
        receipt_id: data.id,
        action: "created",
        actor_user_id: user.id,
      });

      await logAction("receipt_created", "receipt", data.id, { booking_id: params.bookingId });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-for-receipt"] });
      toast.success("Receipt created successfully");
    },
    onError: (error: any) => {
      console.error("Create receipt error:", error);
      toast.error(error.message || "Failed to create receipt");
    },
  });
}

export function useIssueReceipt() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("receipts")
        .update({
          status: "issued",
          issued_at: new Date().toISOString(),
        })
        .eq("id", receiptId)
        .eq("status", "draft") // Only issue drafts
        .select()
        .single();

      if (error) throw error;

      // Log receipt event
      await supabase.from("receipt_events").insert({
        receipt_id: receiptId,
        action: "issued",
        actor_user_id: user.id,
      });

      await logAction("receipt_issued", "receipt", receiptId, {});

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      toast.success("Receipt issued successfully");
    },
    onError: (error: any) => {
      console.error("Issue receipt error:", error);
      toast.error(error.message || "Failed to issue receipt");
    },
  });
}

// Customer: fetch receipts for a booking
export function useBookingReceipts(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-receipts", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "issued")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}
