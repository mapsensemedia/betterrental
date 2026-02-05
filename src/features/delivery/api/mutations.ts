import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { 
  UpdateStatusInput, 
  CaptureHandoverInput,
  RecordOdometerInput 
} from "./types";
import { canTransitionTo, type DeliveryStatus } from "../constants/delivery-status";

type SupabaseClientType = SupabaseClient<Database>;

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE DELIVERY STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateDeliveryStatus(
  supabase: SupabaseClientType,
  input: UpdateStatusInput
): Promise<{ success: boolean; error?: string }> {
  const { bookingId, status, notes, locationLat, locationLng, photoUrls } = input;

  // Get current status
  const { data: currentStatus, error: fetchError } = await supabase
    .from("delivery_statuses")
    .select("status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching current status:", fetchError);
    return { success: false, error: "Failed to fetch current status" };
  }

  // Validate transition
  const fromStatus = (currentStatus?.status as DeliveryStatus) || 'unassigned';
  if (!canTransitionTo(fromStatus, status)) {
    return { 
      success: false, 
      error: `Cannot transition from ${fromStatus} to ${status}` 
    };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update or insert delivery status
  const { error: updateError } = await supabase
    .from("delivery_statuses")
    .upsert({
      booking_id: bookingId,
      status,
      notes: notes || null,
      photo_urls: photoUrls ? JSON.stringify(photoUrls) : null,
      location_lat: locationLat || null,
      location_lng: locationLng || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "booking_id",
    });

  if (updateError) {
    console.error("Error updating delivery status:", updateError);
    return { success: false, error: "Failed to update status" };
  }

  // If delivered, activate the booking
  if (status === 'delivered') {
    await supabase
      .from("bookings")
      .update({ 
        status: "active",
        handed_over_at: new Date().toISOString(),
        handed_over_by: user.id,
      })
      .eq("id", bookingId);

    // Update vehicle unit status to on_rent
    const { data: booking } = await supabase
      .from("bookings")
      .select("assigned_unit_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking?.assigned_unit_id) {
      await supabase
        .from("vehicle_units")
        .update({ status: "on_rent" })
        .eq("id", booking.assigned_unit_id);
    }
  }

  // Create audit log entry
  await supabase.from("audit_logs").insert({
    action: "delivery_status_change",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: user.id,
    new_data: { status, notes, locationLat, locationLng },
    old_data: { status: fromStatus },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM DELIVERY (For drivers)
// ─────────────────────────────────────────────────────────────────────────────

export async function claimDelivery(
  supabase: SupabaseClientType,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Use edge function for atomic claim with race condition protection
  const { data, error } = await supabase.functions.invoke("claim-delivery", {
    body: { bookingId },
  });

  if (error) {
    console.error("Error claiming delivery:", error);
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    return { success: false, error: data?.error || "Failed to claim delivery" };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPTURE HANDOVER PHOTOS
// ─────────────────────────────────────────────────────────────────────────────

export async function captureHandoverPhotos(
  supabase: SupabaseClientType,
  input: CaptureHandoverInput
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  const { bookingId, photoUrls, odometerReading, notes } = input;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Store photos as condition photos
  const photoRecords = photoUrls.map((url, index) => ({
    booking_id: bookingId,
    photo_url: url,
    photo_type: `handover_${index + 1}`,
    phase: "handover",
    captured_by: user.id,
    captured_at: new Date().toISOString(),
    notes: notes || null,
  }));

  const { error: photoError } = await supabase
    .from("condition_photos")
    .insert(photoRecords);

  if (photoError) {
    console.error("Error saving handover photos:", photoError);
    return { success: false, error: "Failed to save photos" };
  }

  // Record odometer if provided
  if (odometerReading) {
    await recordOdometer(supabase, {
      bookingId,
      reading: odometerReading,
      phase: "handover",
    });
  }

  return { success: true, urls: photoUrls };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD ODOMETER
// ─────────────────────────────────────────────────────────────────────────────

export async function recordOdometer(
  supabase: SupabaseClientType,
  input: RecordOdometerInput
): Promise<{ success: boolean; error?: string }> {
  const { bookingId, reading, phase } = input;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Store as inspection metric
  const { error } = await supabase
    .from("inspection_metrics")
    .insert({
      booking_id: bookingId,
      phase,
      odometer: reading,
      recorded_by: user.id,
      recorded_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error recording odometer:", error);
    return { success: false, error: "Failed to record odometer" };
  }

  // Also update the assigned unit's current mileage
  const { data: booking } = await supabase
    .from("bookings")
    .select("assigned_unit_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (booking?.assigned_unit_id) {
    await supabase
      .from("vehicle_units")
      .update({ current_mileage: reading })
      .eq("id", booking.assigned_unit_id);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT LOCATION (Helper)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD HANDOVER PHOTO (With signed URL)
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadHandoverPhoto(
  supabase: SupabaseClientType,
  bookingId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${bookingId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("condition-photos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading photo:", uploadError);
    return { error: "Failed to upload photo" };
  }

  // Get signed URL (secure, not public)
  const { data: signedUrl } = await supabase.storage
    .from("condition-photos")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

  if (!signedUrl?.signedUrl) {
    return { error: "Failed to generate URL" };
  }

  return { url: signedUrl.signedUrl };
}
