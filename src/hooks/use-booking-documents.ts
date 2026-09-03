/**
 * Additional documents attached to a booking (handover step "Additional Documents").
 *
 * Files live in the private `booking-documents` bucket; metadata rows are written
 * server-side by the `manage-booking-documents` edge function so attribution and
 * audit logging stay correct.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const BOOKING_DOCUMENTS_BUCKET = "booking-documents";
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20MB
export const ACCEPTED_DOCUMENT_TYPES = "image/*,application/pdf";

export interface BookingDocument {
  id: string;
  booking_id: string;
  customer_user_id: string | null;
  label: string;
  notes: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at_location_id: string | null;
  created_at: string;
}

export function useBookingDocuments(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-documents", bookingId],
    queryFn: async () => {
      if (!bookingId) return [] as BookingDocument[];
      const { data, error } = await supabase
        .from("booking_documents")
        .select("*")
        .eq("booking_id", bookingId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as BookingDocument[];
    },
    enabled: !!bookingId,
    staleTime: 15000,
  });
}

/** All additional documents for a customer, across every booking. */
export function useCustomerDocuments(customerUserId: string | null) {
  return useQuery({
    queryKey: ["customer-documents", customerUserId],
    queryFn: async () => {
      if (!customerUserId) return [] as (BookingDocument & { booking_code: string | null })[];
      const { data, error } = await supabase
        .from("booking_documents")
        .select("*, bookings(booking_code)")
        .eq("customer_user_id", customerUserId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        booking_code: row.bookings?.booking_code ?? null,
      })) as (BookingDocument & { booking_code: string | null })[];
    },
    enabled: !!customerUserId,
    staleTime: 30000,
  });
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export function useUploadBookingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      file,
      label,
      notes,
    }: {
      bookingId: string;
      file: File;
      label: string;
      notes?: string;
    }) => {
      if (!label.trim()) throw new Error("Please enter a document label");
      if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} is larger than 20MB`);

      const path = `${bookingId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BOOKING_DOCUMENTS_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke("manage-booking-documents", {
        body: {
          action: "create",
          bookingId,
          label: label.trim(),
          notes: notes?.trim() || null,
          storagePath: path,
          fileName: file.name,
          mimeType: file.type || null,
          fileSize: file.size,
        },
      });

      if (error || data?.error) {
        // Roll back the orphaned file so storage does not drift.
        await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).remove([path]);
        throw new Error(data?.error || error?.message || "Failed to save document");
      }

      return data.document as BookingDocument;
    },
    onSuccess: (_doc, vars) => {
      queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["customer-documents"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err: any) => toast.error(err.message || "Upload failed"),
  });
}

export function useDeleteBookingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string; bookingId: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-booking-documents", {
        body: { action: "delete", documentId },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to remove document");
      }
      return true;
    },
    onSuccess: (_res, vars) => {
      toast.success("Document removed");
      queryClient.invalidateQueries({ queryKey: ["booking-documents", vars.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["customer-documents"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity", vars.bookingId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove document"),
  });
}

/** Create a short-lived signed URL for viewing/downloading a document. */
export async function getBookingDocumentUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(BOOKING_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
