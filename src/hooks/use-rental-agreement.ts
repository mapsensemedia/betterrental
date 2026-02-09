import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgreementTermsJson {
  vehicle: {
    category?: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    licensePlate?: string | null;
    vin?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    seats?: number | null;
    tankCapacityLiters?: number | null;
  };
  condition: {
    odometerOut?: number | null;
    fuelLevelOut?: number | null;
  };
  rental: {
    startAt: string;
    endAt: string;
    totalDays: number;
    dailyRate: number;
  };
  locations: {
    pickup: { name?: string; address?: string; city?: string };
    deliveryAddress?: string | null;
    dropoff: { name?: string; address?: string; city?: string };
  };
  customer: {
    name?: string | null;
    email?: string | null;
  };
  protection?: {
    planId?: string;
    planName?: string;
    dailyRate?: number;
    total?: number;
    deductible?: string;
  };
  financial: {
    vehicleSubtotal: number;
    addOnsTotal: number;
    youngDriverFee: number;
    pvrtTotal: number;
    acsrchTotal: number;
    subtotalBeforeTax: number;
    pstAmount: number;
    gstAmount: number;
    totalTax: number;
    grandTotal: number;
    depositAmount: number;
    addOns: Array<{ name: string; price: number }>;
  };
  policies: {
    minAge: number;
    lateFeePercentOfDaily: number;
    gracePeriodMinutes: number;
    thirdPartyLiabilityIncluded: boolean;
    optionalCoverageAvailable: boolean;
    fuelReturnPolicy: string;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    internationalTravel: boolean;
  };
  taxes: {
    pstRate: number;
    gstRate: number;
    pvrtDailyFee: number;
    acsrchDailyFee: number;
  };
}

export interface RentalAgreement {
  id: string;
  booking_id: string;
  agreement_content: string;
  terms_json: AgreementTermsJson | Record<string, any>;
  customer_signature: string | null;
  customer_signed_at: string | null;
  customer_ip_address: string | null;
  staff_confirmed_by: string | null;
  staff_confirmed_at: string | null;
  signed_manually: boolean | null;
  signed_manually_at: string | null;
  signed_manually_by: string | null;
  status: "pending" | "signed" | "confirmed" | "voided";
  created_at: string;
  updated_at: string;
}

// Fetch agreement for a booking
export function useRentalAgreement(bookingId: string | null) {
  return useQuery({
    queryKey: ["rental-agreement", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("rental_agreements")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data as RentalAgreement | null;
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

// Generate agreement via edge function with retry logic
export function useGenerateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Retry logic for network failures
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-agreement", {
            body: { bookingId },
          });

          if (error) {
            // Check if it's a network error that should be retried
            if (error.message?.includes("fetch") || error.message?.includes("network")) {
              throw new Error(`Network error: ${error.message}`);
            }
            throw error;
          }
          if (data?.error) throw new Error(data.error);

          // Send notification to customer about agreement ready for signing
          if (!data.alreadyExists) {
            try {
              await supabase.functions.invoke("send-booking-notification", {
                body: { bookingId, stage: "agreement_generated" },
              });
            } catch (e) {
              console.error("Failed to send agreement notification:", e);
            }
          }

          return data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`Agreement generation attempt ${attempt}/${maxRetries} failed:`, lastError.message);
          
          // Only retry on network/timeout errors
          if (attempt < maxRetries && (
            lastError.message?.includes("fetch") || 
            lastError.message?.includes("network") ||
            lastError.message?.includes("timeout") ||
            lastError.message?.includes("Failed")
          )) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            continue;
          }
          throw lastError;
        }
      }
      throw lastError || new Error("Failed to generate agreement after retries");
    },
    onSuccess: (data, bookingId) => {
      // Immediately invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ["rental-agreement", bookingId],
        refetchType: "active"
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", bookingId],
        refetchType: "active"
      });
      if (data.alreadyExists) {
        toast.info("Agreement already exists for this booking");
      } else {
        toast.success("Rental agreement generated successfully!");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate agreement: ${error.message}`);
    },
  });
}

// Customer signs the agreement
export function useSignAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      signature,
      bookingId,
    }: {
      agreementId: string;
      signature: string;
      bookingId?: string;
    }) => {
      const { error } = await supabase
        .from("rental_agreements")
        .update({
          customer_signature: signature,
          customer_signed_at: new Date().toISOString(),
          customer_ip_address: "client", // Could capture real IP via edge function
          status: "signed",
        })
        .eq("id", agreementId);

      if (error) throw error;

      // Send notification about agreement signed
      if (bookingId) {
        try {
          await supabase.functions.invoke("send-booking-notification", {
            body: { bookingId, stage: "agreement_signed" },
          });
        } catch (e) {
          console.error("Failed to send signed notification:", e);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Agreement signed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to sign agreement: ${error.message}`);
    },
  });
}

// Admin confirms the signature
export function useConfirmAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreementId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("rental_agreements")
        .update({
          staff_confirmed_by: user.user.id,
          staff_confirmed_at: new Date().toISOString(),
          status: "confirmed",
        })
        .eq("id", agreementId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "rental_agreement",
        entity_id: agreementId,
        action: "agreement_confirmed",
        user_id: user.user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Agreement confirmed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm agreement: ${error.message}`);
    },
  });
}

// Void an agreement
export function useVoidAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreementId: string) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("rental_agreements")
        .update({ status: "voided" })
        .eq("id", agreementId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "rental_agreement",
        entity_id: agreementId,
        action: "agreement_voided",
        user_id: user.user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      toast.success("Agreement voided");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void agreement: ${error.message}`);
    },
  });
}

// Mark agreement as manually signed in person
export function useMarkSignedManually() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agreementId, customerName }: { agreementId: string; customerName: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("rental_agreements")
        .update({
          signed_manually: true,
          signed_manually_at: now,
          signed_manually_by: user.user.id,
          customer_signature: customerName,
          customer_signed_at: now,
          staff_confirmed_by: user.user.id,
          staff_confirmed_at: now,
          status: "confirmed",
        })
        .eq("id", agreementId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "rental_agreement",
        entity_id: agreementId,
        action: "agreement_signed_manually",
        user_id: user.user.id,
        new_data: { customer_name: customerName, signed_at: now },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Agreement marked as signed manually");
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as signed: ${error.message}`);
    },
  });
}
