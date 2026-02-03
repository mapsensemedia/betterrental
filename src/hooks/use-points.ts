/**
 * Points & Membership Hooks
 * Handles points balance, ledger, settings, and transactions
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface PointsSettings {
  earnRate: { points_per_dollar: number };
  earnBase: { include_addons: boolean; exclude_taxes: boolean };
  redeemRate: { points_per_dollar: number };
  redeemRules: { min_points: number; max_percent_of_total: number };
  expiration: { enabled: boolean; months: number };
}

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  bookingId: string | null;
  transactionType: "earn" | "redeem" | "adjust" | "expire" | "reverse";
  points: number;
  moneyValue: number | null;
  balanceAfter: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface MembershipInfo {
  memberId: string | null;
  pointsBalance: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  joinedAt: string | null;
  status: "active" | "suspended" | "inactive";
}

// Fetch user's membership info
export function useMembershipInfo() {
  const { user } = useAuth();

  return useQuery<MembershipInfo | null>({
    queryKey: ["membership-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("member_id, points_balance, membership_tier, membership_joined_at, membership_status")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        memberId: data.member_id,
        pointsBalance: data.points_balance || 0,
        tier: (data.membership_tier as MembershipInfo["tier"]) || "bronze",
        joinedAt: data.membership_joined_at,
        status: (data.membership_status as MembershipInfo["status"]) || "active",
      };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

// Map database snake_case keys to frontend camelCase keys
const DB_KEY_TO_FRONTEND: Record<string, keyof PointsSettings> = {
  earn_rate: 'earnRate',
  earn_base: 'earnBase',
  redeem_rate: 'redeemRate',
  redeem_rules: 'redeemRules',
  expiration: 'expiration',
};

const FRONTEND_KEY_TO_DB: Record<keyof PointsSettings, string> = {
  earnRate: 'earn_rate',
  earnBase: 'earn_base',
  redeemRate: 'redeem_rate',
  redeemRules: 'redeem_rules',
  expiration: 'expiration',
};

// Helper to parse settings from database rows
export function parsePointsSettings(rows: { setting_key: string; setting_value: unknown }[] | null): PointsSettings {
  const settings: PointsSettings = {
    earnRate: { points_per_dollar: 10 },
    earnBase: { include_addons: true, exclude_taxes: true },
    redeemRate: { points_per_dollar: 100 },
    redeemRules: { min_points: 100, max_percent_of_total: 50 },
    expiration: { enabled: false, months: 12 },
  };

  (rows || []).forEach((row) => {
    // Map snake_case DB key to camelCase frontend key
    const frontendKey = DB_KEY_TO_FRONTEND[row.setting_key];
    if (frontendKey && frontendKey in settings) {
      settings[frontendKey] = row.setting_value as any;
    }
  });

  return settings;
}

// Fetch points settings
export function usePointsSettings() {
  return useQuery<PointsSettings>({
    queryKey: ["points-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      return parsePointsSettings(data);
    },
    staleTime: 60000,
  });
}

// Update points settings (admin only)
export function useUpdatePointsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PointsSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const [frontendKey, value] of Object.entries(updates)) {
        // Map camelCase frontend key to snake_case DB key
        const dbKey = FRONTEND_KEY_TO_DB[frontendKey as keyof PointsSettings];
        if (!dbKey) continue;
        
        const { error } = await supabase
          .from("points_settings")
          .update({ 
            setting_value: value as any,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null,
          })
          .eq("setting_key", dbKey);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-settings"] });
      toast.success("Points settings updated");
    },
    onError: (error) => {
      console.error("Failed to update points settings:", error);
      toast.error("Failed to update settings");
    },
  });
}

// Fetch user's points ledger history
export function usePointsLedger(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery<PointsLedgerEntry[]>({
    queryKey: ["points-ledger", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from("points_ledger")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        bookingId: row.booking_id,
        transactionType: row.transaction_type as PointsLedgerEntry["transactionType"],
        points: row.points,
        moneyValue: row.money_value ? Number(row.money_value) : null,
        balanceAfter: row.balance_after,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
    },
    enabled: !!targetUserId,
    staleTime: 30000,
  });
}

// Calculate points that would be earned for a booking total
export function calculatePointsToEarn(
  bookingTotal: number,
  taxAmount: number,
  addOnsTotal: number,
  settings: PointsSettings
): number {
  let eligibleAmount = bookingTotal;

  // Exclude taxes if configured
  if (settings.earnBase.exclude_taxes) {
    eligibleAmount -= taxAmount;
  }

  // Exclude add-ons if configured
  if (!settings.earnBase.include_addons) {
    eligibleAmount -= addOnsTotal;
  }

  // Calculate points
  const points = Math.floor(eligibleAmount * settings.earnRate.points_per_dollar);
  return Math.max(0, points);
}

// Calculate discount value from points
export function calculatePointsDiscount(
  pointsToRedeem: number,
  bookingTotal: number,
  settings: PointsSettings
): { discount: number; actualPointsUsed: number } {
  // Points to dollar conversion
  const maxDiscountFromPoints = pointsToRedeem / settings.redeemRate.points_per_dollar;
  
  // Max discount based on booking total percentage
  const maxDiscountPercent = (bookingTotal * settings.redeemRules.max_percent_of_total) / 100;
  
  // Take the lower of the two
  const discount = Math.min(maxDiscountFromPoints, maxDiscountPercent);
  
  // Calculate actual points used
  const actualPointsUsed = Math.ceil(discount * settings.redeemRate.points_per_dollar);
  
  return {
    discount: Math.round(discount * 100) / 100,
    actualPointsUsed,
  };
}

// Award points for a completed booking
export function useAwardPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      bookingId,
      bookingTotal,
      taxAmount,
      addOnsTotal,
    }: {
      userId: string;
      bookingId: string;
      bookingTotal: number;
      taxAmount: number;
      addOnsTotal: number;
    }) => {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from("points_settings")
        .select("setting_key, setting_value");

      const settings = parsePointsSettings(settingsData);

      const pointsToEarn = calculatePointsToEarn(bookingTotal, taxAmount, addOnsTotal, settings);

      if (pointsToEarn <= 0) return { pointsEarned: 0 };

      // Check if points already awarded for this booking
      const { data: existingEntry } = await supabase
        .from("points_ledger")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("transaction_type", "earn")
        .maybeSingle();

      if (existingEntry) {
        console.log("Points already awarded for booking:", bookingId);
        return { pointsEarned: 0, alreadyAwarded: true };
      }

      // Calculate expiration date if enabled
      let expiresAt: string | null = null;
      if (settings.expiration.enabled) {
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + settings.expiration.months);
        expiresAt = expDate.toISOString();
      }

      // Use the database function for safe concurrent updates
      const { data, error } = await supabase.rpc("update_points_balance", {
        p_user_id: userId,
        p_points: pointsToEarn,
        p_booking_id: bookingId,
        p_transaction_type: "earn",
        p_money_value: bookingTotal,
        p_notes: `Points earned from booking completion`,
        p_expires_at: expiresAt,
      });

      if (error) throw error;

      return { pointsEarned: pointsToEarn };
    },
    onSuccess: (data) => {
      if (data.pointsEarned > 0) {
        queryClient.invalidateQueries({ queryKey: ["membership-info"] });
        queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
      }
    },
    onError: (error) => {
      console.error("Failed to award points:", error);
    },
  });
}

// Redeem points for a discount
export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      bookingId,
      pointsToRedeem,
      discountValue,
    }: {
      userId: string;
      bookingId: string;
      pointsToRedeem: number;
      discountValue: number;
    }) => {
      // Use the database function for safe concurrent updates
      const { data, error } = await supabase.rpc("update_points_balance", {
        p_user_id: userId,
        p_points: -pointsToRedeem, // Negative to subtract
        p_booking_id: bookingId,
        p_transaction_type: "redeem",
        p_money_value: discountValue,
        p_notes: `Points redeemed for CA$${discountValue.toFixed(2)} discount`,
      });

      if (error) throw error;

      return { pointsRedeemed: pointsToRedeem, discount: discountValue };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
      queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
    },
    onError: (error) => {
      console.error("Failed to redeem points:", error);
      toast.error("Failed to redeem points");
    },
  });
}

// Reverse points when booking is cancelled
export function useReversePoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      bookingId,
      reason,
    }: {
      userId: string;
      bookingId: string;
      reason?: string;
    }) => {
      // Find original earn entry
      const { data: earnEntry } = await supabase
        .from("points_ledger")
        .select("points")
        .eq("booking_id", bookingId)
        .eq("transaction_type", "earn")
        .maybeSingle();

      if (!earnEntry) {
        console.log("No points to reverse for booking:", bookingId);
        return { pointsReversed: 0 };
      }

      // Check if already reversed
      const { data: existingReverse } = await supabase
        .from("points_ledger")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("transaction_type", "reverse")
        .maybeSingle();

      if (existingReverse) {
        console.log("Points already reversed for booking:", bookingId);
        return { pointsReversed: 0, alreadyReversed: true };
      }

      const pointsToReverse = earnEntry.points;

      // Use the database function for safe concurrent updates
      const { data, error } = await supabase.rpc("update_points_balance", {
        p_user_id: userId,
        p_points: -pointsToReverse, // Negative to subtract
        p_booking_id: bookingId,
        p_transaction_type: "reverse",
        p_notes: reason || `Points reversed due to booking cancellation`,
      });

      if (error) throw error;

      return { pointsReversed: pointsToReverse };
    },
    onSuccess: (data) => {
      if (data.pointsReversed > 0) {
        queryClient.invalidateQueries({ queryKey: ["membership-info"] });
        queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
      }
    },
    onError: (error) => {
      console.error("Failed to reverse points:", error);
    },
  });
}

// Admin: Adjust points manually
export function useAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      points,
      notes,
    }: {
      userId: string;
      points: number;
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc("update_points_balance", {
        p_user_id: userId,
        p_points: points,
        p_transaction_type: "adjust",
        p_notes: notes,
        p_created_by: user?.id,
      });

      if (error) throw error;

      return { newBalance: (data as any)?.[0]?.new_balance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
      queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
      toast.success("Points adjusted");
    },
    onError: (error) => {
      console.error("Failed to adjust points:", error);
      toast.error("Failed to adjust points");
    },
  });
}
