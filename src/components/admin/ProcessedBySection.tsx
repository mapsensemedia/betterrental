/**
 * Processed-by + activity history block.
 *
 * Shows which staff member (and at which branch) created, handed over,
 * activated, and closed a rental, followed by the booking's audit trail.
 */
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, UserCheck, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessedByBooking {
  id: string;
  location_id?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  processed_at_location_id?: string | null;
  created_by?: string | null;
  activated_by?: string | null;
  activated_at?: string | null;
  handed_over_by?: string | null;
  handed_over_at?: string | null;
  closed_by?: string | null;
  last_modified_by?: string | null;
}

interface StaffIdentity {
  name: string;
  locationName: string | null;
}

/** Resolve staff identities (name + branch) for a set of user ids. */
function useStaffIdentities(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();

  return useQuery({
    queryKey: ["staff-identities", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, StaffIdentity>();

      const [{ data: assignments }, { data: profiles }, { data: locations }] = await Promise.all([
        supabase
          .from("staff_assignments")
          .select("user_id, display_name, location_id")
          .in("user_id", ids),
        supabase.from("profiles").select("id, full_name, email").in("id", ids),
        supabase.from("locations").select("id, name"),
      ]);

      const locationMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name || p.email || null]),
      );

      for (const id of ids) {
        const assignment = (assignments ?? []).find((a) => a.user_id === id);
        map.set(id, {
          name:
            assignment?.display_name ||
            profileMap.get(id) ||
            `Staff ${id.slice(0, 8)}`,
          locationName: assignment?.location_id
            ? locationMap.get(assignment.location_id) ?? null
            : null,
        });
      }

      return map;
    },
  });
}

function ActorRow({
  label,
  userId,
  at,
  identities,
  branchName,
}: {
  label: string;
  userId: string | null | undefined;
  at?: string | null;
  identities: Map<string, StaffIdentity> | undefined;
  branchName?: string | null;
}) {
  if (!userId) return null;
  const identity = identities?.get(userId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{identity?.name ?? "—"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {(branchName || identity?.locationName) && (
          <Badge variant="outline" className="gap-1 font-normal">
            <MapPin className="w-3 h-3" />
            {branchName || identity?.locationName}
          </Badge>
        )}
        {at && <span>{format(new Date(at), "MMM d, yyyy h:mm a")}</span>}
      </div>
    </div>
  );
}

export function ProcessedBySection({ booking }: { booking: ProcessedByBooking }) {
  const actorIds = [
    booking.processed_by,
    booking.created_by,
    booking.activated_by,
    booking.handed_over_by,
    booking.closed_by,
    booking.last_modified_by,
  ].filter(Boolean) as string[];

  const { data: identities, isLoading } = useStaffIdentities(actorIds);

  const { data: locationNames } = useQuery({
    queryKey: ["locations-name-map"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, name");
      return new Map((data ?? []).map((l) => [l.id, l.name]));
    },
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["booking-activity", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, user_id, actor_role, location_id, actor_location_id")
        .eq("entity_type", "booking")
        .eq("entity_id", booking.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const processedBranch = booking.processed_at_location_id
    ? locationNames?.get(booking.processed_at_location_id) ?? null
    : booking.location_id
      ? locationNames?.get(booking.location_id) ?? null
      : null;

  const hasActors = actorIds.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Processed by
          </CardTitle>
          <CardDescription>Staff accountability for this rental</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !hasActors ? (
            <p className="text-sm text-muted-foreground">No staff activity recorded.</p>
          ) : (
            <div className="divide-y divide-border/60">
              <ActorRow
                label="Processed / handed over"
                userId={booking.processed_by ?? booking.handed_over_by}
                at={booking.processed_at ?? booking.handed_over_at}
                identities={identities}
                branchName={processedBranch}
              />
              <ActorRow
                label="Created by"
                userId={booking.created_by}
                identities={identities}
              />
              <ActorRow
                label="Activated by"
                userId={booking.activated_by}
                at={booking.activated_at}
                identities={identities}
              />
              <ActorRow label="Closed by" userId={booking.closed_by} identities={identities} />
              <ActorRow
                label="Last modified by"
                userId={booking.last_modified_by}
                identities={identities}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Activity history
          </CardTitle>
          <CardDescription>Most recent 50 events</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !activity?.length ? (
            <p className="text-sm text-muted-foreground">No recorded activity.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((event) => {
                const actor = event.user_id ? identities?.get(event.user_id) : null;
                const branch = event.actor_location_id
                  ? locationNames?.get(event.actor_location_id)
                  : event.location_id
                    ? locationNames?.get(event.location_id)
                    : null;
                return (
                  <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {event.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {actor?.name ? `${actor.name} · ` : ""}
                      {branch ? `${branch} · ` : ""}
                      {format(new Date(event.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
