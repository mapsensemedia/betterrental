/**
 * Waiting support tickets, surfaced the moment a staff member opens a panel.
 *
 * - Counts tickets nobody has picked up yet (new / escalated), scoped to the
 *   acting user's branch through the same helper the support queue uses.
 * - Raises a single floating notice per sign-in session (sessionStorage guard),
 *   so it does not repeat on every page change.
 * - Read-only: it never writes, sends, or resends anything.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffectiveLocationId } from "@/hooks/use-staff-location";
import { filterTicketsByBranch } from "@/hooks/use-support-v2";

const WAITING_STATUSES = ["new", "escalated"] as const;
const SESSION_KEY = "pending-ticket-notice-shown";

export interface PendingTicketSummary {
  count: number;
  urgentCount: number;
  latest: { id: string; ticket_id: string; subject: string }[];
}

export function usePendingTicketSummary() {
  const { user } = useAuth();
  const { locationId, isReady, isUnassignedManager } = useEffectiveLocationId();

  return useQuery<PendingTicketSummary>({
    queryKey: ["pending-ticket-summary", locationId ?? "all"],
    enabled: isReady && !isUnassignedManager,
    staleTime: 20000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("support_tickets_v2") as any)
        .select(
          "id, ticket_id, subject, status, is_urgent, created_at, booking_id, incident_id, damage_id, created_by, assigned_to",
        )
        .in("status", WAITING_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const scoped = await filterTicketsByBranch(data || [], locationId, user?.id);

      return {
        count: scoped.length,
        urgentCount: scoped.filter((t: any) => t.is_urgent).length,
        latest: scoped.slice(0, 3).map((t: any) => ({
          id: t.id,
          ticket_id: t.ticket_id,
          subject: t.subject,
        })),
      };
    },
  });
}

/**
 * One floating notice per session when tickets are already waiting.
 * The live toast for brand-new incoming tickets lives in useGlobalRealtime.
 */
export function usePendingTicketNotice() {
  const { data } = usePendingTicketSummary();

  useEffect(() => {
    if (!data || data.count === 0) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private browsing without sessionStorage: show it once per mount instead.
    }

    const label =
      data.count === 1
        ? "1 support ticket needs attention"
        : `${data.count} support tickets need attention`;

    const notify = data.urgentCount > 0 ? toast.error : toast.info;
    notify(label, {
      description: data.latest.map((t) => `${t.ticket_id}: ${t.subject}`).join(" · "),
      duration: 15000,
      action: {
        label: "Open",
        onClick: () => window.location.assign("/support"),
      },
    });
  }, [data]);

  return data;
}
