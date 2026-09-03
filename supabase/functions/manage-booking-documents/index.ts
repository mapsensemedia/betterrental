/**
 * manage-booking-documents
 *
 * Records / removes "additional documents" collected during the handover flow.
 * The file itself is uploaded to the private `booking-documents` bucket by the
 * client; this function writes the metadata row and the audit trail with proper
 * staff attribution (never sourced from `profiles`).
 */
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  AuthError,
  authErrorResponse,
} from "../_shared/auth.ts";
import { requireBookingLocationOrThrow } from "../_shared/location-guard.ts";

const STAFF_ROLES = ["super_admin", "manager", "admin", "staff", "finance", "support"];

interface CreateBody {
  action: "create";
  bookingId: string;
  label: string;
  notes?: string | null;
  storagePath: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface DeleteBody {
  action: "delete";
  documentId: string;
}

type Body = CreateBody | DeleteBody;

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, STAFF_ROLES, corsHeaders);

    const body = (await req.json()) as Body;
    const admin = getAdminClient();

    /* ------------------------------- CREATE ------------------------------- */
    if (body.action === "create") {
      const { bookingId, label, notes, storagePath, fileName, mimeType, fileSize } = body;

      if (!bookingId || typeof bookingId !== "string") {
        return json({ error: "bookingId is required" }, 400, corsHeaders);
      }
      if (!label || typeof label !== "string" || !label.trim()) {
        return json({ error: "A document label is required" }, 400, corsHeaders);
      }
      if (label.trim().length > 120) {
        return json({ error: "Label must be 120 characters or fewer" }, 400, corsHeaders);
      }
      if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith(`${bookingId}/`)) {
        return json({ error: "Invalid storage path" }, 400, corsHeaders);
      }
      if (!fileName || typeof fileName !== "string") {
        return json({ error: "fileName is required" }, 400, corsHeaders);
      }
      if (notes != null && (typeof notes !== "string" || notes.length > 1000)) {
        return json({ error: "Notes must be 1000 characters or fewer" }, 400, corsHeaders);
      }

      await requireBookingLocationOrThrow(userId, bookingId);

      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .select("id, user_id, location_id, booking_code")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return json({ error: "Booking not found" }, 404, corsHeaders);
      }

      // Staff branch for attribution — falls back to the booking's branch.
      const { data: assignment } = await admin
        .from("staff_assignments")
        .select("location_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      const actorLocationId = assignment?.location_id ?? booking.location_id ?? null;

      const { data: inserted, error: insertError } = await admin
        .from("booking_documents")
        .insert({
          booking_id: bookingId,
          customer_user_id: booking.user_id,
          label: label.trim(),
          notes: notes?.trim() || null,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: mimeType || null,
          file_size: typeof fileSize === "number" ? fileSize : null,
          uploaded_by: userId,
          uploaded_at_location_id: actorLocationId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("booking_documents insert error:", insertError);
        return json({ error: "Failed to record document" }, 500, corsHeaders);
      }

      await admin.from("audit_logs").insert({
        action: "booking_document_uploaded",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: userId,
        location_id: booking.location_id,
        actor_location_id: actorLocationId,
        new_data: {
          document_id: inserted.id,
          label: inserted.label,
          file_name: fileName,
        },
      });

      return json({ success: true, document: inserted }, 200, corsHeaders);
    }

    /* ------------------------------- DELETE ------------------------------- */
    if (body.action === "delete") {
      const { documentId } = body;
      if (!documentId || typeof documentId !== "string") {
        return json({ error: "documentId is required" }, 400, corsHeaders);
      }

      const { data: doc, error: docError } = await admin
        .from("booking_documents")
        .select("id, booking_id, label, storage_path, deleted_at")
        .eq("id", documentId)
        .single();

      if (docError || !doc) {
        return json({ error: "Document not found" }, 404, corsHeaders);
      }
      if (doc.deleted_at) {
        return json({ success: true, alreadyDeleted: true }, 200, corsHeaders);
      }

      await requireBookingLocationOrThrow(userId, doc.booking_id);

      const { data: booking } = await admin
        .from("bookings")
        .select("location_id")
        .eq("id", doc.booking_id)
        .single();

      const { data: assignment } = await admin
        .from("staff_assignments")
        .select("location_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      const { error: updateError } = await admin
        .from("booking_documents")
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq("id", documentId);

      if (updateError) {
        console.error("booking_documents delete error:", updateError);
        return json({ error: "Failed to remove document" }, 500, corsHeaders);
      }

      // Best-effort file removal — the metadata row is the source of truth.
      const { error: storageError } = await admin.storage
        .from("booking-documents")
        .remove([doc.storage_path]);
      if (storageError) console.warn("storage remove failed:", storageError.message);

      await admin.from("audit_logs").insert({
        action: "booking_document_deleted",
        entity_type: "booking",
        entity_id: doc.booking_id,
        user_id: userId,
        location_id: booking?.location_id ?? null,
        actor_location_id: assignment?.location_id ?? booking?.location_id ?? null,
        old_data: { document_id: doc.id, label: doc.label },
      });

      return json({ success: true }, 200, corsHeaders);
    }

    return json({ error: "Unknown action" }, 400, corsHeaders);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    console.error("manage-booking-documents error:", err);
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
});
