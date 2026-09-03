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
  employeeCode: string | null;
  staffId: string;
}

/**
 * Resolve staff identities (name + employee code + branch) for a set of user ids.
 *
 * Names come exclusively from `staff_assignments` — the staff directory. The
 * `profiles` table is deliberately NOT consulted: profile rows describe
 * customers, so reading them here can surface a customer's name as the staff
 * member who processed a booking. When an id has no staff record we show a
 * neutral placeholder with the raw id instead of guessing a name.
 */
function useStaffIdentities(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();

  return useQuery({
    queryKey: ["staff-identities", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, StaffIdentity>();

      const [{ data: assignments }, { data: roles }, { data: locations }] = await Promise.all([
        supabase
          .from("staff_assignments")
          .select("user_id, display_name, employee_code, location_id, is_active")
          .in("user_id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        supabase.from("locations").select("id, name"),
      ]);

      const locationMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));

      for (const id of ids) {
        const assignment =
          (assignments ?? []).find((a) => a.user_id === id && a.is_active) ??
          (assignments ?? []).find((a) => a.user_id === id);
        const role = roleMap.get(id);
        const fallback = role
          ? `${role.replace(/_/g, " ")} account`
          : `Unknown user`;

        map.set(id, {
          name: assignment?.display_name || fallback,
          employeeCode: assignment?.employee_code ?? null,
          staffId: id,
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
        <p className="text-xs text-muted-foreground font-mono">
          ID: {identity?.employeeCode || `${userId.slice(0, 8)}`}
        </p>
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

export function ProcessedBySection({ bookingId }: { bookingId: string }) {
  const { data: booking } = useQuery({
    queryKey: ["booking-accountability", bookingId],
    queryFn: async (): Promise<ProcessedByBooking> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, location_id, processed_by, processed_at, processed_at_location_id, created_by, activated_by, activated_at, handed_over_by, handed_over_at, closed_by, last_modified_by",
        )
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data as ProcessedByBooking;
    },
  });

  const actorIds = [
    booking?.processed_by,
    booking?.created_by,
    booking?.activated_by,
    booking?.handed_over_by,
    booking?.closed_by,
    booking?.last_modified_by,
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
    queryKey: ["booking-activity", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, user_id, actor_role, location_id, actor_location_id")
        .eq("entity_type", "booking")
        .eq("entity_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const processedBranch = booking?.processed_at_location_id
    ? locationNames?.get(booking.processed_at_location_id) ?? null
    : booking?.location_id
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
                userId={booking?.processed_by ?? booking?.handed_over_by}
                at={booking?.processed_at ?? booking?.handed_over_at}
                identities={identities}
                branchName={processedBranch}
              />
              <ActorRow
                label="Created by"
                userId={booking?.created_by}
                identities={identities}
              />
              <ActorRow
                label="Activated by"
                userId={booking?.activated_by}
                at={booking?.activated_at}
                identities={identities}
              />
              <ActorRow label="Closed by" userId={booking?.closed_by} identities={identities} />
              <ActorRow
                label="Last modified by"
                userId={booking?.last_modified_by}
                identities={identities}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Activity history
          </CardTitle>
          <CardDescription>Most recent events (up to 50)</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !activity?.length ? (
            <p className="text-sm text-muted-foreground">No recorded activity.</p>
          ) : (
            <>
              <ol className="divide-y divide-border/60">
                {(showAllActivity ? activity : activity.slice(0, ACTIVITY_PREVIEW)).map((event) => {
                  const actor = event.user_id ? identities?.get(event.user_id) : null;
                  const branch = event.actor_location_id
                    ? locationNames?.get(event.actor_location_id)
                    : event.location_id
                      ? locationNames?.get(event.location_id)
                      : null;
                  return (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-sm"
                    >
                      <span className="font-medium capitalize">
                        {event.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {actor?.name ? `${actor.name} · ` : ""}
                        {branch ? `${branch} · ` : ""}
                        {format(new Date(event.created_at), "MMM d, h:mm a")}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {activity.length > ACTIVITY_PREVIEW && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 w-full text-xs"
                  onClick={() => setShowAllActivity((v) => !v)}
                >
                  {showAllActivity
                    ? "Show less"
                    : `Show all ${activity.length} events`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
