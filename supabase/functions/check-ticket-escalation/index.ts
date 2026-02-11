/**
 * Check Ticket Escalation
 * 
 * This function runs on a schedule to auto-escalate tickets
 * that have been unresolved for too long.
 * 
 * Escalation rules:
 * - Normal priority: escalate to high after 24 hours unresolved
 * - High priority: escalate to urgent after 12 hours unresolved
 * - Urgent priority: create admin alert after 4 hours unresolved
 */

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const ESCALATION_RULES = {
  normal: {
    escalateAfterHours: 24,
    newPriority: "high",
  },
  high: {
    escalateAfterHours: 12,
    newPriority: "urgent",
  },
  urgent: {
    escalateAfterHours: 4,
    createAlert: true,
  },
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const results = {
      escalated: 0,
      alerted: 0,
      errors: [] as string[],
    };

    // Get all open/in_progress tickets
    const { data: tickets, error: fetchError } = await supabase
      .from("tickets")
      .select("id, subject, priority, status, updated_at, user_id, booking_id")
      .in("status", ["open", "in_progress"])
      .order("updated_at", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch tickets: ${fetchError.message}`);
    }

    for (const ticket of tickets || []) {
      const priority = (ticket.priority || "normal") as keyof typeof ESCALATION_RULES;
      const rule = ESCALATION_RULES[priority];
      
      if (!rule) continue;

      const updatedAt = new Date(ticket.updated_at);
      const hoursElapsed = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

      // Check if escalation is needed
      if (hoursElapsed < rule.escalateAfterHours) continue;

      try {
        if ("newPriority" in rule) {
          // Escalate priority
          const { error: updateError } = await supabase
            .from("tickets")
            .update({ 
              priority: rule.newPriority,
              updated_at: now.toISOString(),
            })
            .eq("id", ticket.id);

          if (updateError) {
            results.errors.push(`Failed to escalate ticket ${ticket.id}: ${updateError.message}`);
            continue;
          }

          // Add a system message noting the escalation
          await supabase
            .from("ticket_messages")
            .insert({
              ticket_id: ticket.id,
              sender_id: "00000000-0000-0000-0000-000000000000", // System user
              message: `⚠️ This ticket has been automatically escalated from ${priority} to ${rule.newPriority} priority due to no response for ${Math.round(hoursElapsed)} hours.`,
              is_staff: true,
            });

          // Log the escalation
          await supabase.from("audit_logs").insert({
            action: "ticket_auto_escalated",
            entity_type: "ticket",
            entity_id: ticket.id,
            new_data: {
              from_priority: priority,
              to_priority: rule.newPriority,
              hours_elapsed: Math.round(hoursElapsed),
            },
          });

          results.escalated++;
        } else if (rule.createAlert) {
          // Already urgent - create admin alert
          // Check if we already created an alert for this ticket recently
          const { data: existingAlerts } = await supabase
            .from("admin_alerts")
            .select("id")
            .eq("booking_id", ticket.booking_id)
            .eq("alert_type", "verification_pending")
            .ilike("title", "%urgent ticket%")
            .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

          if (existingAlerts && existingAlerts.length > 0) {
            // Already alerted in the last 24 hours
            continue;
          }

          const { error: alertError } = await supabase
            .from("admin_alerts")
            .insert({
              alert_type: "verification_pending",
              title: `⚠️ Urgent ticket unresolved: ${ticket.subject.substring(0, 50)}`,
              message: `Ticket has been urgent for ${Math.round(hoursElapsed)} hours without resolution. Immediate attention required.`,
              booking_id: ticket.booking_id,
              user_id: ticket.user_id,
              status: "pending",
            });

          if (alertError) {
            results.errors.push(`Failed to create alert for ticket ${ticket.id}: ${alertError.message}`);
            continue;
          }

          results.alerted++;
        }
      } catch (err) {
        results.errors.push(`Error processing ticket ${ticket.id}: ${err.message}`);
      }
    }

    console.log(`Ticket escalation complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Ticket escalation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
