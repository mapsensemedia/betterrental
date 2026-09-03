/**
 * manage-staff — Super Admin only staff management.
 *
 * Actions:
 *  - list                : all staff assignments + role + email
 *  - create              : create an auth user, grant `manager`, assign a branch
 *  - set_location        : move a manager to another branch
 *  - set_active          : activate / deactivate a staff member
 *  - send_setup_link     : email a password-setup (recovery) link
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, getAdminClient, authErrorResponse } from "../_shared/auth.ts";
import { getStaffScope, requireSuperAdmin } from "../_shared/location-guard.ts";

type Action = "list" | "create" | "set_location" | "set_active" | "send_setup_link";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { userId } = await getUserOrThrow(req, corsHeaders);
    const scope = await getStaffScope(userId);
    requireSuperAdmin(scope);

    const supabase = getAdminClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;

    if (action === "list") {
      const { data: assignments, error } = await supabase
        .from("staff_assignments")
        .select("id, user_id, location_id, display_name, employee_code, is_active, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: locations } = await supabase.from("locations").select("id, name");

      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
      }

      const staff = [] as Record<string, unknown>[];
      for (const a of assignments ?? []) {
        const { data: authUser } = await supabase.auth.admin.getUserById(a.user_id);
        staff.push({
          ...a,
          email: authUser?.user?.email ?? null,
          roles: roleMap.get(a.user_id) ?? [],
        });
      }

      return json({ staff, locations: locations ?? [] });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const displayName = body.displayName ? String(body.displayName).trim() : null;
      const employeeCode = body.employeeCode ? String(body.employeeCode).trim() : null;
      const locationId = body.locationId ? String(body.locationId) : null;
      const role = body.role === "super_admin" ? "super_admin" : "manager";

      if (!email || !email.includes("@")) return json({ error: "A valid email is required" }, 400);
      if (role === "manager" && !locationId) return json({ error: "Managers require a branch" }, 400);

      // Reuse an existing auth user when the email already exists.
      let targetUserId: string | null = null;
      const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = existing?.users?.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        targetUserId = match.id;
      } else {
        const tempPassword = `C2C-${crypto.randomUUID()}`;
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });
        if (createErr || !created?.user) {
          return json({ error: createErr?.message ?? "Failed to create account" }, 400);
        }
        targetUserId = created.user.id;
      }

      // Role (idempotent) — exactly two business roles exist.
      await supabase.from("user_roles").upsert(
        { user_id: targetUserId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

      // Branch assignment (one row per staff member).
      const { data: existingAssignment } = await supabase
        .from("staff_assignments")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingAssignment) {
        await supabase
          .from("staff_assignments")
          .update({
            location_id: locationId,
            display_name: displayName,
            employee_code: employeeCode,
            is_active: true,
          })
          .eq("id", existingAssignment.id);
      } else {
        const { error: insertErr } = await supabase.from("staff_assignments").insert({
          user_id: targetUserId,
          location_id: locationId,
          display_name: displayName,
          employee_code: employeeCode,
          is_active: true,
        });
        if (insertErr) return json({ error: insertErr.message }, 400);
      }

      // Password setup link so no password is ever transported by us.
      const { data: link } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      return json({
        success: true,
        userId: targetUserId,
        reusedExistingAccount: !!match,
        setupLinkSent: !!link,
      });
    }

    if (action === "set_location") {
      const staffId = String(body.staffId ?? "");
      const locationId = body.locationId ? String(body.locationId) : null;
      if (!staffId) return json({ error: "staffId is required" }, 400);

      const { error } = await supabase
        .from("staff_assignments")
        .update({ location_id: locationId })
        .eq("id", staffId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "set_active") {
      const staffId = String(body.staffId ?? "");
      const isActive = body.isActive === true;
      if (!staffId) return json({ error: "staffId is required" }, 400);

      const { error } = await supabase
        .from("staff_assignments")
        .update({ is_active: isActive })
        .eq("id", staffId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "send_setup_link") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return json({ error: "email is required" }, 400);
      const { error } = await supabase.auth.admin.generateLink({ type: "recovery", email });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
