/**
 * Signature save hook for admin rental agreement signing
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SignatureStroke } from "@/components/admin/signature/SignatureCanvas";

interface SignatureCaptureData {
  pngDataUrl: string;
  vectorJson: SignatureStroke[];
  method: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    deviceName?: string;
  };
  workstationId: string;
  capturedAt: string;
}

interface SaveSignatureParams {
  agreementId: string;
  bookingId: string;
  customerName: string;
  signatureData: SignatureCaptureData;
}

// Convert data URL to Blob
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function useSaveSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agreementId, bookingId, customerName, signatureData }: SaveSignatureParams) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      // 1. Upload PNG to storage
      const pngBlob = dataURLtoBlob(signatureData.pngDataUrl);
      const pngPath = `${bookingId}/${agreementId}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(pngPath, pngBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload signature: ${uploadError.message}`);
      }

      // 2. Get public URL (signed URL for private bucket)
      const { data: urlData } = await supabase.storage
        .from("signatures")
        .createSignedUrl(pngPath, 60 * 60 * 24 * 365); // 1 year

      const signatureUrl = urlData?.signedUrl || pngPath;

      // 3. Update rental agreement with signature data
      const { error: updateError } = await supabase
        .from("rental_agreements")
        .update({
          signature_png_url: signatureUrl,
          signature_vector_json: JSON.parse(JSON.stringify(signatureData.vectorJson)),
          signature_method: signatureData.method,
          signature_device_info: JSON.parse(JSON.stringify(signatureData.deviceInfo)),
          signature_workstation_id: signatureData.workstationId,
          customer_signature: customerName,
          customer_signed_at: now,
          signed_manually: true,
          signed_manually_at: now,
          signed_manually_by: user.user.id,
          staff_confirmed_by: user.user.id,
          staff_confirmed_at: now,
          status: "confirmed",
        })
        .eq("id", agreementId);

      if (updateError) {
        throw new Error(`Failed to save signature: ${updateError.message}`);
      }

      // 4. Create audit log
      await supabase.from("audit_logs").insert({
        entity_type: "rental_agreement",
        entity_id: agreementId,
        action: "agreement_signed_with_capture",
        user_id: user.user.id,
        new_data: {
          customer_name: customerName,
          method: signatureData.method,
          workstation_id: signatureData.workstationId,
          device_info: signatureData.deviceInfo,
          signed_at: now,
        },
      });

      return { signatureUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Signature captured and saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRecaptureSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agreementId, bookingId }: { agreementId: string; bookingId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Clear existing signature fields to allow recapture
      const { error } = await supabase
        .from("rental_agreements")
        .update({
          signature_png_url: null,
          signature_vector_json: null,
          signature_method: null,
          signature_device_info: null,
          signature_workstation_id: null,
          customer_signature: null,
          customer_signed_at: null,
          signed_manually: false,
          signed_manually_at: null,
          signed_manually_by: null,
          staff_confirmed_by: null,
          staff_confirmed_at: null,
          status: "pending",
        })
        .eq("id", agreementId);

      if (error) throw error;

      // Audit log for recapture
      await supabase.from("audit_logs").insert({
        entity_type: "rental_agreement",
        entity_id: agreementId,
        action: "agreement_signature_recapture_initiated",
        user_id: user.user.id,
        new_data: {
          initiated_at: new Date().toISOString(),
          reason: "Admin requested signature recapture",
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
      toast.info("Ready for new signature capture");
    },
    onError: (error: Error) => {
      toast.error(`Failed to initiate recapture: ${error.message}`);
    },
  });
}
