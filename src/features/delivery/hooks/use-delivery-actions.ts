import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  updateDeliveryStatus, 
  claimDelivery, 
  captureHandoverPhotos,
  recordOdometer,
  getCurrentLocation,
  uploadHandoverPhoto
} from "../api/mutations";
import { DELIVERY_QUERY_KEYS, STATUS_CONFIG } from "../constants/delivery-status";
import type { 
  UpdateStatusInput, 
  CaptureHandoverInput, 
  RecordOdometerInput 
} from "../api/types";
import type { DeliveryStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STATUS MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<UpdateStatusInput, 'locationLat' | 'locationLng'> & { captureGPS?: boolean }) => {
      let locationLat: number | undefined;
      let locationLng: number | undefined;

      // Capture GPS if requested
      if (input.captureGPS !== false) {
        const location = await getCurrentLocation();
        if (location) {
          locationLat = location.lat;
          locationLng = location.lng;
        }
      }

      return updateDeliveryStatus(supabase, {
        ...input,
        locationLat,
        locationLng,
      });
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        const statusConfig = STATUS_CONFIG[variables.status];
        toast.success(`Status updated to ${statusConfig.label}`);
        
        // Invalidate all delivery queries
        queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });
      } else {
        toast.error(result.error || "Failed to update status");
      }
    },
    onError: (error) => {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM DELIVERY MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function useClaimDeliveryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      return claimDelivery(supabase, bookingId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Delivery claimed successfully!");
        queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });
      } else {
        toast.error(result.error || "Failed to claim delivery");
      }
    },
    onError: (error) => {
      console.error("Claim error:", error);
      toast.error("Failed to claim delivery");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPTURE HANDOVER MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function useCaptureHandover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CaptureHandoverInput) => {
      return captureHandoverPhotos(supabase, input);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success("Handover photos saved");
        queryClient.invalidateQueries({ 
          queryKey: DELIVERY_QUERY_KEYS.detail(variables.bookingId) 
        });
      } else {
        toast.error(result.error || "Failed to save photos");
      }
    },
    onError: (error) => {
      console.error("Handover capture error:", error);
      toast.error("Failed to save handover photos");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD ODOMETER MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function useRecordOdometer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordOdometerInput) => {
      return recordOdometer(supabase, input);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success("Odometer reading recorded");
        queryClient.invalidateQueries({ 
          queryKey: DELIVERY_QUERY_KEYS.detail(variables.bookingId) 
        });
      } else {
        toast.error(result.error || "Failed to record odometer");
      }
    },
    onError: (error) => {
      console.error("Odometer record error:", error);
      toast.error("Failed to record odometer");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD PHOTO MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadHandoverPhoto() {
  return useMutation({
    mutationFn: async ({ bookingId, file }: { bookingId: string; file: File }) => {
      const result = await uploadHandoverPhoto(supabase, bookingId, file);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED ACTIONS HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDeliveryActions() {
  const updateStatus = useUpdateDeliveryStatus();
  const claim = useClaimDeliveryMutation();
  const captureHandover = useCaptureHandover();
  const recordOdometerMutation = useRecordOdometer();
  const uploadPhoto = useUploadHandoverPhoto();

  return {
    updateStatus,
    claim,
    captureHandover,
    recordOdometer: recordOdometerMutation,
    uploadPhoto,
    isLoading: 
      updateStatus.isPending || 
      claim.isPending || 
      captureHandover.isPending ||
      recordOdometerMutation.isPending ||
      uploadPhoto.isPending,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK STATUS UPDATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function useQuickStatusUpdate(bookingId: string) {
  const { updateStatus } = useDeliveryActions();

  const setStatus = (status: DeliveryStatus, notes?: string) => {
    return updateStatus.mutate({ 
      bookingId, 
      status, 
      notes,
      captureGPS: true 
    });
  };

  return {
    markPickedUp: (notes?: string) => setStatus('picked_up', notes),
    markEnRoute: (notes?: string) => setStatus('en_route', notes),
    markArrived: (notes?: string) => setStatus('arrived', notes),
    markDelivered: (notes?: string) => setStatus('delivered', notes),
    reportIssue: (notes: string) => setStatus('issue', notes),
    isUpdating: updateStatus.isPending,
  };
}
