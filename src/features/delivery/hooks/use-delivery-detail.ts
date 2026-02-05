import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDeliveryDetail } from "../api/queries";
import { DELIVERY_QUERY_KEYS } from "../constants/delivery-status";
import type { DeliveryDetail } from "../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DETAIL HOOK
// ─────────────────────────────────────────────────────────────────────────────

interface UseDeliveryDetailOptions {
  enabled?: boolean;
}

export function useDeliveryDetail(
  bookingId: string | undefined,
  options: UseDeliveryDetailOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: DELIVERY_QUERY_KEYS.detail(bookingId || ''),
    queryFn: async (): Promise<DeliveryDetail | null> => {
      if (!bookingId) return null;
      return fetchDeliveryDetail(supabase, bookingId);
    },
    enabled: enabled && !!bookingId,
    staleTime: 10_000, // 10 seconds for detail
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDOVER CHECKLIST STATE
// ─────────────────────────────────────────────────────────────────────────────

export function useHandoverChecklist(detail: DeliveryDetail | null | undefined) {
  return {
    agreementSigned: !!detail?.agreementSignedAt,
    walkaroundComplete: !!detail?.walkaroundAcknowledgedAt,
    photosUploaded: false, // Would need separate photos query
    odometerRecorded: false, // Would need separate inspection query
  };
}
