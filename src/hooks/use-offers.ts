/**
 * Points Offers Hooks
 * Handles offers that can be unlocked with points
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface PointsOffer {
  id: string;
  name: string;
  description: string | null;
  offerType: "percent_off" | "dollar_off" | "free_addon" | "free_upgrade";
  offerValue: number;
  pointsRequired: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  minRentalDays: number | null;
  eligibleCategories: string[] | null;
  eligibleLocations: string[] | null;
  maxUsesTotal: number | null;
  maxUsesPerUser: number;
  currentUses: number;
  createdAt: string;
}

export interface OfferRedemption {
  id: string;
  offerId: string;
  userId: string;
  bookingId: string | null;
  pointsSpent: number;
  discountValue: number;
  redeemedAt: string;
}

// Fetch all active offers (customer view)
export function useActiveOffers() {
  const { user } = useAuth();

  return useQuery<PointsOffer[]>({
    queryKey: ["active-offers"],
    queryFn: async () => {
      const now = new Date().toISOString();

      let query = supabase
        .from("points_offers")
        .select("*")
        .eq("is_active", true)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order("points_required", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(mapOfferFromDb);
    },
    staleTime: 60000,
  });
}

// Fetch all offers (admin view)
export function useAdminOffers() {
  return useQuery<PointsOffer[]>({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(mapOfferFromDb);
    },
    staleTime: 30000,
  });
}

// Fetch user's offer redemptions
export function useUserOfferRedemptions() {
  const { user } = useAuth();

  return useQuery<OfferRedemption[]>({
    queryKey: ["offer-redemptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("offer_redemptions")
        .select("*")
        .eq("user_id", user.id)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        offerId: row.offer_id,
        userId: row.user_id,
        bookingId: row.booking_id,
        pointsSpent: row.points_spent,
        discountValue: Number(row.discount_value),
        redeemedAt: row.redeemed_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

// Check if user can redeem an offer
export function canRedeemOffer(
  offer: PointsOffer,
  userPointsBalance: number,
  userRedemptions: OfferRedemption[],
  rentalDays?: number,
  categoryId?: string,
  locationId?: string
): { canRedeem: boolean; reason?: string } {
  // Check points balance
  if (userPointsBalance < offer.pointsRequired) {
    return { 
      canRedeem: false, 
      reason: `Need ${offer.pointsRequired - userPointsBalance} more points` 
    };
  }

  // Check per-user limit
  const userUsesForOffer = userRedemptions.filter(r => r.offerId === offer.id).length;
  if (userUsesForOffer >= offer.maxUsesPerUser) {
    return { canRedeem: false, reason: "Already redeemed maximum times" };
  }

  // Check total uses limit
  if (offer.maxUsesTotal && offer.currentUses >= offer.maxUsesTotal) {
    return { canRedeem: false, reason: "Offer fully redeemed" };
  }

  // Check min rental days
  if (offer.minRentalDays && rentalDays && rentalDays < offer.minRentalDays) {
    return { 
      canRedeem: false, 
      reason: `Requires at least ${offer.minRentalDays} rental days` 
    };
  }

  // Check category eligibility
  if (offer.eligibleCategories?.length && categoryId) {
    if (!offer.eligibleCategories.includes(categoryId)) {
      return { canRedeem: false, reason: "Not eligible for this vehicle category" };
    }
  }

  // Check location eligibility
  if (offer.eligibleLocations?.length && locationId) {
    if (!offer.eligibleLocations.includes(locationId)) {
      return { canRedeem: false, reason: "Not eligible for this location" };
    }
  }

  return { canRedeem: true };
}

// Create a new offer (admin)
export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offer: Omit<PointsOffer, "id" | "currentUses" | "createdAt">) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("points_offers")
        .insert({
          name: offer.name,
          description: offer.description,
          offer_type: offer.offerType,
          offer_value: offer.offerValue,
          points_required: offer.pointsRequired,
          is_active: offer.isActive,
          valid_from: offer.validFrom,
          valid_until: offer.validUntil,
          min_rental_days: offer.minRentalDays,
          eligible_categories: offer.eligibleCategories,
          eligible_locations: offer.eligibleLocations,
          max_uses_total: offer.maxUsesTotal,
          max_uses_per_user: offer.maxUsesPerUser,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapOfferFromDb(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["active-offers"] });
      toast.success("Offer created");
    },
    onError: (error) => {
      console.error("Failed to create offer:", error);
      toast.error("Failed to create offer");
    },
  });
}

// Update an offer (admin)
export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PointsOffer> }) => {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.offerType !== undefined) updateData.offer_type = updates.offerType;
      if (updates.offerValue !== undefined) updateData.offer_value = updates.offerValue;
      if (updates.pointsRequired !== undefined) updateData.points_required = updates.pointsRequired;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.validFrom !== undefined) updateData.valid_from = updates.validFrom;
      if (updates.validUntil !== undefined) updateData.valid_until = updates.validUntil;
      if (updates.minRentalDays !== undefined) updateData.min_rental_days = updates.minRentalDays;
      if (updates.eligibleCategories !== undefined) updateData.eligible_categories = updates.eligibleCategories;
      if (updates.eligibleLocations !== undefined) updateData.eligible_locations = updates.eligibleLocations;
      if (updates.maxUsesTotal !== undefined) updateData.max_uses_total = updates.maxUsesTotal;
      if (updates.maxUsesPerUser !== undefined) updateData.max_uses_per_user = updates.maxUsesPerUser;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("points_offers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapOfferFromDb(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["active-offers"] });
      toast.success("Offer updated");
    },
    onError: (error) => {
      console.error("Failed to update offer:", error);
      toast.error("Failed to update offer");
    },
  });
}

// Delete an offer (admin)
export function useDeleteOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("points_offers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["active-offers"] });
      toast.success("Offer deleted");
    },
    onError: (error) => {
      console.error("Failed to delete offer:", error);
      toast.error("Failed to delete offer");
    },
  });
}

// Redeem an offer
export function useRedeemOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      bookingId,
      discountValue,
    }: {
      offerId: string;
      bookingId: string;
      discountValue: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get offer details
      const { data: offer, error: offerError } = await supabase
        .from("points_offers")
        .select("points_required, current_uses")
        .eq("id", offerId)
        .single();

      if (offerError) throw offerError;

      // Deduct points
      const { error: pointsError } = await supabase.rpc("update_points_balance", {
        p_user_id: user.id,
        p_points: -offer.points_required,
        p_booking_id: bookingId,
        p_transaction_type: "redeem",
        p_money_value: discountValue,
        p_notes: `Offer redeemed`,
      });

      if (pointsError) throw pointsError;

      // Record redemption
      const { data: redemption, error: redemptionError } = await supabase
        .from("offer_redemptions")
        .insert({
          offer_id: offerId,
          user_id: user.id,
          booking_id: bookingId,
          points_spent: offer.points_required,
          discount_value: discountValue,
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Increment offer uses
      await supabase
        .from("points_offers")
        .update({ current_uses: (offer.current_uses || 0) + 1 })
        .eq("id", offerId);

      return redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
      queryClient.invalidateQueries({ queryKey: ["points-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["offer-redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["active-offers"] });
      toast.success("Offer redeemed!");
    },
    onError: (error) => {
      console.error("Failed to redeem offer:", error);
      toast.error("Failed to redeem offer");
    },
  });
}

// Helper to map DB row to PointsOffer
function mapOfferFromDb(row: any): PointsOffer {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    offerType: row.offer_type,
    offerValue: Number(row.offer_value),
    pointsRequired: row.points_required,
    isActive: row.is_active,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    minRentalDays: row.min_rental_days,
    eligibleCategories: row.eligible_categories,
    eligibleLocations: row.eligible_locations,
    maxUsesTotal: row.max_uses_total,
    maxUsesPerUser: row.max_uses_per_user || 1,
    currentUses: row.current_uses || 0,
    createdAt: row.created_at,
  };
}
