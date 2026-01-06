import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RentalAgreement {
  id: string;
  booking_id: string;
  agreement_content: string;
  terms_json: Record<string, any>;
  customer_signature: string | null;
  customer_signed_at: string | null;
  customer_ip_address: string | null;
  staff_confirmed_by: string | null;
  staff_confirmed_at: string | null;
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
  });
}

// Generate agreement via edge function
export function useGenerateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-agreement", {
        body: { bookingId },
      });

      if (error) throw error;
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
    },
    onSuccess: (data, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", bookingId] });
      if (data.alreadyExists) {
        toast.info("Agreement already exists for this booking");
      } else {
        toast.success("Rental agreement generated and customer notified");
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
