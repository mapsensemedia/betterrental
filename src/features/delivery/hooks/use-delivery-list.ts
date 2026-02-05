import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchDeliveryList, fetchDeliveryCounts } from "../api/queries";
import { DELIVERY_QUERY_KEYS } from "../constants/delivery-status";
import type { DeliveryListOptions, DeliveryBooking, DeliveryScope } from "../api/types";
import type { PortalStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY LIST HOOK
// ─────────────────────────────────────────────────────────────────────────────

interface UseDeliveryListOptions {
  scope?: DeliveryScope;
  statusFilter?: PortalStatus | null;
  enabled?: boolean;
}

export function useDeliveryList(options: UseDeliveryListOptions = {}) {
  const { scope = 'my', statusFilter = null, enabled = true } = options;
  const { user } = useAuth();

  return useQuery({
    queryKey: DELIVERY_QUERY_KEYS.list(scope, statusFilter || undefined),
    queryFn: async (): Promise<DeliveryBooking[]> => {
      if (!user?.id) return [];
      
      const listOptions: DeliveryListOptions = {
        scope,
        statusFilter,
      };
      
      return fetchDeliveryList(supabase, user.id, listOptions);
    },
    enabled: enabled && !!user?.id,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY COUNTS HOOK (For tab badges)
// ─────────────────────────────────────────────────────────────────────────────

export function useDeliveryCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...DELIVERY_QUERY_KEYS.all, 'counts'],
    queryFn: async () => {
      if (!user?.id) {
        return { my: 0, available: 0, pending: 0, enRoute: 0, completed: 0, issue: 0 };
      }
      return fetchDeliveryCounts(supabase, user.id);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MY DELIVERIES HOOK (Convenience wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export function useMyDeliveries() {
  return useDeliveryList({ scope: 'my' });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABLE DELIVERIES HOOK (For claiming)
// ─────────────────────────────────────────────────────────────────────────────

export function useAvailableDeliveries() {
  return useDeliveryList({ scope: 'available' });
}
