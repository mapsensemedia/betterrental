import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";
import { differenceInMinutes, parseISO } from "date-fns";

export type TimingStatus = "on_time" | "early" | "late" | "no_show";
export type CheckInStatus = "pending" | "passed" | "needs_review" | "blocked";

export interface CheckInRecord {
  id: string;
  bookingId: string;
  identityVerified: boolean;
  identityNotes: string | null;
  licenseVerified: boolean;
  licenseNameMatches: boolean;
  licenseValid: boolean;
  licenseExpiryDate: string | null;
  licenseNotes: string | null;
  ageVerified: boolean;
  customerDob: string | null;
  ageNotes: string | null;
  arrivalTime: string | null;
  timingStatus: TimingStatus | null;
  timingNotes: string | null;
  checkInStatus: CheckInStatus;
  blockedReason: string | null;
  checkedInBy: string | null;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInValidation {
  field: string;
  label: string;
  passed: boolean;
  required: boolean;
  notes?: string;
}

const MIN_DRIVER_AGE = 21;
const EARLY_WINDOW_MINUTES = 30;
const LATE_WINDOW_MINUTES = 30;

export function useCheckInRecord(bookingId: string | null) {
  return useQuery<CheckInRecord | null>({
    queryKey: ["checkin-record", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("checkin_records")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        bookingId: data.booking_id,
        identityVerified: data.identity_verified || false,
        identityNotes: data.identity_notes,
        licenseVerified: data.license_verified || false,
        licenseNameMatches: data.license_name_matches || false,
        licenseValid: data.license_valid || false,
        licenseExpiryDate: data.license_expiry_date,
        licenseNotes: data.license_notes,
        ageVerified: data.age_verified || false,
        customerDob: data.customer_dob,
        ageNotes: data.age_notes,
        arrivalTime: data.arrival_time,
        timingStatus: data.timing_status as TimingStatus,
        timingNotes: data.timing_notes,
        checkInStatus: data.check_in_status as CheckInStatus,
        blockedReason: data.blocked_reason,
        checkedInBy: data.checked_in_by,
        checkedInAt: data.checked_in_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

export function useCreateOrUpdateCheckIn() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: Partial<{
        identityVerified: boolean;
        identityNotes: string;
        licenseVerified: boolean;
        licenseNameMatches: boolean;
        licenseValid: boolean;
        licenseExpiryDate: string;
        licenseNotes: string;
        ageVerified: boolean;
        customerDob: string;
        ageNotes: string;
        arrivalTime: string;
        timingStatus: TimingStatus;
        timingNotes: string;
        checkInStatus: CheckInStatus;
        blockedReason: string;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert camelCase to snake_case for DB
      const dbData: Record<string, unknown> = {
        booking_id: bookingId,
        identity_verified: data.identityVerified,
        identity_notes: data.identityNotes,
        license_verified: data.licenseVerified,
        license_name_matches: data.licenseNameMatches,
        license_valid: data.licenseValid,
        license_expiry_date: data.licenseExpiryDate,
        license_notes: data.licenseNotes,
        age_verified: data.ageVerified,
        customer_dob: data.customerDob,
        age_notes: data.ageNotes,
        arrival_time: data.arrivalTime,
        timing_status: data.timingStatus,
        timing_notes: data.timingNotes,
        check_in_status: data.checkInStatus,
        blocked_reason: data.blockedReason,
      };

      // Remove undefined values
      Object.keys(dbData).forEach((key) => {
        if (dbData[key] === undefined) delete dbData[key];
      });

      // Check if record exists
      const { data: existing } = await supabase
        .from("checkin_records")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      let result;
      if (existing) {
        const { data: updated, error } = await supabase
          .from("checkin_records")
          .update(dbData)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      } else {
        // Need to explicitly add booking_id to the insert
        const insertData = { ...dbData, booking_id: bookingId };
        const { data: inserted, error } = await supabase
          .from("checkin_records")
          .insert(insertData as any)
          .select()
          .single();
        if (error) throw error;
        result = inserted;
      }

      await logAction("checkin_updated", "booking", bookingId, {
        check_in_status: data.checkInStatus,
      });

      return result;
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      toast.success("Check-in updated");
    },
    onError: (error) => {
      console.error("Check-in update failed:", error);
      toast.error("Failed to update check-in");
    },
  });
}

export function useCompleteCheckIn() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      bookingId,
      validations,
    }: {
      bookingId: string;
      validations: CheckInValidation[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const allPassed = validations.filter(v => v.required).every(v => v.passed);
      const anyFailed = validations.some(v => v.required && !v.passed);

      const status: CheckInStatus = allPassed ? "passed" : anyFailed ? "needs_review" : "pending";
      const blockedReason = anyFailed
        ? validations.filter(v => v.required && !v.passed).map(v => v.label).join(", ")
        : null;

      // Check if record exists
      const { data: existing } = await supabase
        .from("checkin_records")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      const updateData = {
        check_in_status: status,
        blocked_reason: blockedReason,
        checked_in_by: user.id,
        checked_in_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("checkin_records")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("checkin_records")
          .insert([{ booking_id: bookingId, ...updateData }]);
        if (error) throw error;
      }

      // Create alert if needs review (status won't be 'blocked' from the logic above, but kept for safety)
      if (status === "needs_review") {
        await supabase.from("admin_alerts").insert({
          booking_id: bookingId,
          alert_type: "verification_pending",
          title: "Check-in needs review",
          message: `Failed checks: ${blockedReason}`,
          status: "pending",
        });
      }

      await logAction("checkin_completed", "booking", bookingId, {
        status,
        validations: validations.map(v => ({ field: v.field, passed: v.passed })),
      });

      // Fire-and-forget notification (don't block UI)
      if (status === "passed") {
        supabase.functions.invoke("send-booking-notification", {
          body: { bookingId, stage: "checkin_complete" },
        }).catch(e => console.error("Failed to send check-in notification:", e));
      }

      return { status, blockedReason };
    },
    onSuccess: (result, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ["checkin-record", bookingId], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"], refetchType: "active" });

      if (result.status === "passed") {
        toast.success("Check-in completed - customer notified");
      } else {
        toast.warning("Check-in needs review", {
          description: result.blockedReason || undefined,
        });
      }
    },
    onError: (error) => {
      console.error("Check-in completion failed:", error);
      toast.error("Failed to complete check-in");
    },
  });
}

/**
 * Calculate timing status based on booking start time
 */
export function calculateTimingStatus(
  bookingStartAt: string,
  arrivalTime: Date = new Date()
): { status: TimingStatus; minutesDiff: number } {
  const scheduledTime = parseISO(bookingStartAt);
  const diff = differenceInMinutes(arrivalTime, scheduledTime);

  if (diff < -EARLY_WINDOW_MINUTES) {
    return { status: "early", minutesDiff: Math.abs(diff) };
  } else if (diff > LATE_WINDOW_MINUTES) {
    return { status: "late", minutesDiff: diff };
  }
  return { status: "on_time", minutesDiff: diff };
}

/**
 * Calculate age from DOB
 */
export function calculateAge(dob: string): number {
  const birthDate = parseISO(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Check if license is expired (against today)
 */
export function isLicenseExpired(expiryDate: string): boolean {
  const expiry = parseISO(expiryDate);
  return expiry < new Date();
}

/**
 * Check if license expires before a given rental end date
 */
export function isLicenseExpiredForRental(expiryDate: string, rentalEndDate: string): boolean {
  const expiry = parseISO(expiryDate);
  const rentalEnd = parseISO(rentalEndDate);
  return expiry < rentalEnd;
}
