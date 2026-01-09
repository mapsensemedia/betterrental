import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AbandonedCart {
  id: string;
  user_id: string | null;
  session_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  vehicle_id: string | null;
  pickup_date: string | null;
  return_date: string | null;
  location_id: string | null;
  delivery_mode: string | null;
  delivery_address: string | null;
  protection: string | null;
  add_on_ids: string[] | null;
  total_amount: number | null;
  cart_data: Record<string, unknown> | null;
  abandoned_at: string;
  converted_at: string | null;
  contacted_at: string | null;
  contact_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  vehicle?: {
    make: string;
    model: string;
    year: number;
    image_url: string | null;
    daily_rate: number;
  } | null;
  location?: {
    name: string;
    city: string;
  } | null;
}

// Generate or retrieve session ID for cart tracking
export function getCartSessionId(): string {
  const storageKey = "cart_session_id";
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

// Hook for admin to view abandoned carts
export function useAbandonedCarts(options?: { showConverted?: boolean }) {
  return useQuery({
    queryKey: ["abandoned-carts", options?.showConverted],
    queryFn: async (): Promise<AbandonedCart[]> => {
      let query = supabase
        .from("abandoned_carts")
        .select(`
          *,
          vehicle:vehicles(make, model, year, image_url, daily_rate),
          location:locations(name, city)
        `)
        .order("abandoned_at", { ascending: false });

      if (!options?.showConverted) {
        query = query.is("converted_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as AbandonedCart[];
    },
  });
}

// Hook to save/update abandoned cart
export function useSaveAbandonedCart() {
  return useMutation({
    mutationFn: async (cartData: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      vehicleId?: string;
      pickupDate?: string;
      returnDate?: string;
      locationId?: string;
      deliveryMode?: string;
      deliveryAddress?: string;
      protection?: string;
      addOnIds?: string[];
      totalAmount?: number;
      fullCartData?: Record<string, unknown>;
    }) => {
      const sessionId = getCartSessionId();
      
      // Check if cart exists for this session
      const { data: existing } = await supabase
        .from("abandoned_carts")
        .select("id")
        .eq("session_id", sessionId)
        .is("converted_at", null)
        .maybeSingle();

      const payload = {
        session_id: sessionId,
        email: cartData.email || null,
        phone: cartData.phone || null,
        first_name: cartData.firstName || null,
        last_name: cartData.lastName || null,
        vehicle_id: cartData.vehicleId || null,
        pickup_date: cartData.pickupDate || null,
        return_date: cartData.returnDate || null,
        location_id: cartData.locationId || null,
        delivery_mode: cartData.deliveryMode || null,
        delivery_address: cartData.deliveryAddress || null,
        protection: cartData.protection || null,
        add_on_ids: cartData.addOnIds || null,
        total_amount: cartData.totalAmount || null,
        cart_data: cartData.fullCartData || {},
        abandoned_at: new Date().toISOString(),
      };

      if (existing?.id) {
        // Update existing
        const { error } = await supabase
          .from("abandoned_carts")
          .update(payload as any)
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("abandoned_carts")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
  });
}

// Hook to mark cart as converted
export function useMarkCartConverted() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId?: string) => {
      const sessionId = getCartSessionId();
      
      const { error } = await supabase
        .from("abandoned_carts")
        .update({ 
          converted_at: new Date().toISOString(),
          cart_data: bookingId ? { booking_id: bookingId } : {},
        })
        .eq("session_id", sessionId)
        .is("converted_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
    },
  });
}

// Hook for admin to update cart outreach status
export function useUpdateAbandonedCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      cartId, 
      contactedAt, 
      contactNotes 
    }: { 
      cartId: string; 
      contactedAt?: string; 
      contactNotes?: string;
    }) => {
      const { error } = await supabase
        .from("abandoned_carts")
        .update({
          contacted_at: contactedAt || new Date().toISOString(),
          contact_notes: contactNotes || null,
        })
        .eq("id", cartId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast({ title: "Cart updated" });
    },
  });
}

// Hook to delete abandoned cart
export function useDeleteAbandonedCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cartId: string) => {
      const { error } = await supabase
        .from("abandoned_carts")
        .delete()
        .eq("id", cartId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast({ title: "Cart deleted" });
    },
  });
}
