/**
 * Hook for generating return receipts after deposit processing
 * 
 * PR7: Performance optimization - streamlined mutation handling
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateReceiptParams {
  bookingId: string;
  depositReleased: number;
  depositWithheld: number;
  withholdReason?: string;
}

interface GenerateReceiptResult {
  success: boolean;
  receiptId?: string;
  receiptNumber?: string;
  emailSent?: boolean;
  alreadyExists?: boolean;
  error?: string;
}

export function useGenerateReturnReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateReceiptParams): Promise<GenerateReceiptResult> => {
      const { data, error } = await supabase.functions.invoke("generate-return-receipt", {
        body: params,
      });

      if (error) {
        console.error("Generate receipt error:", error);
        throw new Error(error.message || "Failed to generate receipt");
      }

      return data as GenerateReceiptResult;
    },
    onSuccess: (result, variables) => {
      if (result.alreadyExists) {
        toast.info("Receipt already exists for this booking");
      } else if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["booking-receipts", variables.bookingId] });
        
        if (result.emailSent) {
          toast.success("Receipt generated and emailed to customer");
        } else {
          toast.success("Receipt generated successfully");
        }
      }
    },
    onError: (error: Error) => {
      console.error("Receipt generation failed:", error);
      toast.error("Failed to generate receipt: " + error.message);
    },
  });
}
