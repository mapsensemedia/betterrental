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

type Action =
  | "list"
  | "create"
  | "set_location"
  | "set_active"
  | "send_setup_link"
  | "update"
  | "delete";

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
      const password = body.password ? String(body.password) : null;

      if (!email || !email.includes("@")) return json({ error: "A valid email is required" }, 400);
      if (role === "manager" && !locationId) return json({ error: "Managers require a branch" }, 400);
      if (password && password.length < 8) {
        return json({ error: "Password must be at least 8 characters" }, 400);
      }

      // Reuse an existing auth user when the email already exists.
      let targetUserId: string | null = null;
      const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = existing?.users?.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        targetUserId = match.id;
        // A supplied password overwrites the existing one so the admin can hand
        // out working credentials for accounts that are not real mailboxes.
        if (password) {
          const { error: pwErr } = await supabase.auth.admin.updateUserById(targetUserId, {
            password,
            email_confirm: true,
          });
          if (pwErr) return json({ error: pwErr.message }, 400);
        }
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password: password ?? `C2C-${crypto.randomUUID()}`,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });
        if (createErr || !created?.user) {
          return json({ error: createErr?.message ?? "Failed to create account" }, 400);
        }
        targetUserId = created.user.id;
      }

      // Role — exactly two business roles exist; keep only the chosen one.
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .in("role", ["super_admin", "manager", "admin", "staff"]);
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

      // Only email a setup link when no password was set by the admin.
      let setupLinkSent = false;
      if (!password) {
        const { data: link } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        setupLinkSent = !!link;
      }

      return json({
        success: true,
        userId: targetUserId,
        reusedExistingAccount: !!match,
        passwordSet: !!password,
        setupLinkSent,
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

    if (action === "update") {
      const staffId = String(body.staffId ?? "");
      if (!staffId) return json({ error: "staffId is required" }, 400);

      const { data: target, error: targetErr } = await supabase
        .from("staff_assignments")
        .select("id, user_id")
        .eq("id", staffId)
        .maybeSingle();
      if (targetErr || !target) return json({ error: "Staff member not found" }, 404);

      const role = body.role === undefined
        ? null
        : body.role === "super_admin" ? "super_admin" : "manager";
      const hasLocation = Object.prototype.hasOwnProperty.call(body, "locationId");
      const locationId = body.locationId ? String(body.locationId) : null;
      const password = body.password ? String(body.password) : null;

      if (password && password.length < 8) {
        return json({ error: "Password must be at least 8 characters" }, 400);
      }
      if (role === "manager" && hasLocation && !locationId) {
        return json({ error: "Managers require a branch" }, 400);
      }
      if (role === "manager" && target.user_id === userId) {
        return json({ error: "You cannot demote your own account" }, 400);
      }

      if (role) {
        // Never leave the company without a Super Admin.
        if (role === "manager") {
          const { data: supers } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "super_admin");
          const remaining = (supers ?? []).filter((r) => r.user_id !== target.user_id);
          if (remaining.length === 0) {
            return json({ error: "At least one Super Admin must remain" }, 400);
          }
        }
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", target.user_id)
          .in("role", ["super_admin", "manager", "admin", "staff"]);
        await supabase.from("user_roles").upsert(
          { user_id: target.user_id, role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      }

      const patch: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
        patch.display_name = body.displayName ? String(body.displayName).trim() : null;
      }
      if (Object.prototype.hasOwnProperty.call(body, "employeeCode")) {
        patch.employee_code = body.employeeCode ? String(body.employeeCode).trim() : null;
      }
      if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
        patch.is_active = body.isActive === true;
      }
      // Super Admins are never branch-locked.
      if (role === "super_admin") patch.location_id = null;
      else if (hasLocation) patch.location_id = locationId;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("staff_assignments").update(patch).eq("id", staffId);
        if (error) return json({ error: error.message }, 400);
      }

      if (password) {
        const { error: pwErr } = await supabase.auth.admin.updateUserById(target.user_id, {
          password,
          email_confirm: true,
        });
        if (pwErr) return json({ error: pwErr.message }, 400);
      }

      return json({ success: true, passwordSet: !!password });
    }

    if (action === "delete") {
      const staffId = String(body.staffId ?? "");
      if (!staffId) return json({ error: "staffId is required" }, 400);

      const { data: target } = await supabase
        .from("staff_assignments")
        .select("id, user_id")
        .eq("id", staffId)
        .maybeSingle();
      if (!target) return json({ error: "Staff member not found" }, 404);
      if (target.user_id === userId) {
        return json({ error: "You cannot delete your own account" }, 400);
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "super_admin");
      const isTargetSuper = (roles ?? []).some((r) => r.user_id === target.user_id);
      if (isTargetSuper && (roles ?? []).length <= 1) {
        return json({ error: "At least one Super Admin must remain" }, 400);
      }

      await supabase.from("staff_assignments").delete().eq("id", staffId);
      await supabase.from("user_roles").delete().eq("user_id", target.user_id);
      const { error: delErr } = await supabase.auth.admin.deleteUser(target.user_id);
      if (delErr) {
        return json({
          success: true,
          warning: `Staff record removed, but the login could not be deleted: ${delErr.message}`,
        });
      }

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
