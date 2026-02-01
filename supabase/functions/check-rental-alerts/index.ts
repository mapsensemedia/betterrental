import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[check-rental-alerts] Starting alert check...");

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Fetch active bookings
    const { data: activeBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_code,
        user_id,
        vehicle_id,
        end_at
      `)
      .eq("status", "active");

    if (bookingsError) {
      console.error("[check-rental-alerts] Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    console.log(`[check-rental-alerts] Found ${activeBookings?.length || 0} active bookings`);

    // Fetch categories separately
    const categoryIds = [...new Set((activeBookings || []).map((b: any) => b.vehicle_id).filter(Boolean))];
    const { data: categories } = await supabase
      .from("vehicle_categories")
      .select("id, name")
      .in("id", categoryIds);
    
    const categoriesMap = new Map((categories || []).map((c: any) => [c.id, c]));

    // Fetch profiles separately
    const userIds = [...new Set((activeBookings || []).map((b: any) => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", userIds);
    
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const alertsCreated: string[] = [];
    const notificationsSent: string[] = [];

    for (const booking of activeBookings || []) {
      const endAt = new Date(booking.end_at);
      const category = categoriesMap.get(booking.vehicle_id);
      const vehicleName = category ? category.name : "Vehicle";
      const profile = profilesMap.get(booking.user_id);

      // Check if overdue
      if (endAt < now) {
        const overdueHours = Math.floor((now.getTime() - endAt.getTime()) / (1000 * 60 * 60));
        
        // Check if we already created an overdue alert for this booking today
        const { data: existingAlert } = await supabase
          .from("admin_alerts")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("alert_type", "overdue")
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingAlert) {
          // Create overdue alert
          const { error: alertError } = await supabase
            .from("admin_alerts")
            .insert({
              alert_type: "overdue",
              title: `Overdue: ${booking.booking_code}`,
              message: `${vehicleName} is ${overdueHours}+ hours overdue. Customer: ${profile?.full_name || "Unknown"}`,
              booking_id: booking.id,
              vehicle_id: booking.vehicle_id,
              user_id: booking.user_id,
              status: "pending",
            });

          if (!alertError) {
            alertsCreated.push(`overdue:${booking.booking_code}`);
            console.log(`[check-rental-alerts] Created overdue alert for ${booking.booking_code}`);
          }

          // TODO: Send SMS/email to customer about overdue status
          // For now, just log it
          notificationsSent.push(`overdue_notification:${booking.booking_code}`);
        }
      }
      // Check if approaching return (within 2 hours)
      else if (endAt <= twoHoursFromNow) {
        // Check if we already created a return_due_soon alert for this booking
        const { data: existingAlert } = await supabase
          .from("admin_alerts")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("alert_type", "return_due_soon")
          .maybeSingle();

        if (!existingAlert) {
          const minutesRemaining = Math.floor((endAt.getTime() - now.getTime()) / (1000 * 60));
          
          // Create return due soon alert
          const { error: alertError } = await supabase
            .from("admin_alerts")
            .insert({
              alert_type: "return_due_soon",
              title: `Return Due Soon: ${booking.booking_code}`,
              message: `${vehicleName} due back in ${minutesRemaining} minutes. Customer: ${profile?.full_name || "Unknown"}`,
              booking_id: booking.id,
              vehicle_id: booking.vehicle_id,
              user_id: booking.user_id,
              status: "pending",
            });

          if (!alertError) {
            alertsCreated.push(`return_due_soon:${booking.booking_code}`);
            console.log(`[check-rental-alerts] Created return due soon alert for ${booking.booking_code}`);
          }
        }
      }
    }

    // Also check for late_return alerts (from existing alert_type)
    // These are manually created or from customer reports

    const result = {
      success: true,
      timestamp: now.toISOString(),
      activeBookings: activeBookings?.length || 0,
      alertsCreated,
      notificationsSent,
    };

    console.log("[check-rental-alerts] Completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[check-rental-alerts] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
