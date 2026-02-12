/**
 * Authentication utilities for Edge Functions
 * 
 * Provides JWT validation, user extraction, and role enforcement.
 * 
 * Usage patterns:
 *   // Simple auth check
 *   const user = await getUserOrThrow(req, corsHeaders);
 *   
 *   // Role-gated (admin/staff only)
 *   const user = await getUserOrThrow(req, corsHeaders);
 *   await requireRoleOrThrow(user.userId, ["admin", "staff"], corsHeaders);
 *   
 *   // Booking ownership check
 *   const user = await getUserOrThrow(req, corsHeaders);
 *   await requireBookingOwnerOrStaff(bookingId, user.userId, corsHeaders);
 */

import { createClient } from "npm:@supabase/supabase-js@2";

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Validate JWT and extract user information
 * Use this for endpoints that require authentication
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing authorization header" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return { authenticated: false, error: "Invalid or expired token" };
    }
    
    return {
      authenticated: true,
      userId: data.user.id,
      email: data.user.email,
    };
  } catch (err) {
    console.error("Auth validation error:", err);
    return { authenticated: false, error: "Authentication failed" };
  }
}

/**
 * Get admin Supabase client (bypasses RLS)
 */
export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Check if user has admin or staff role
 */
export async function isAdminOrStaff(userId: string): Promise<boolean> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "staff", "cleaner", "finance"])
    .limit(1)
    .maybeSingle();
  
  return !error && !!data;
}

// ============================================================
// Throwing helpers — use these to short-circuit edge functions
// ============================================================

class AuthError extends Error {
  status: number;
  errorCode?: string;
  remainingAttempts?: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Validate auth and return user, or throw a Response-ready error.
 * Callers catch AuthError and return the appropriate HTTP response.
 */
export async function getUserOrThrow(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string; email?: string }> {
  const result = await validateAuth(req);
  if (!result.authenticated || !result.userId) {
    throw new AuthError("Unauthorized", 401);
  }
  return { userId: result.userId, email: result.email };
}

/**
 * Require caller has one of the specified roles, or throw 403.
 */
export async function requireRoleOrThrow(
  userId: string,
  allowedRoles: string[],
  corsHeaders: Record<string, string>,
): Promise<string> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", allowedRoles)
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    throw new AuthError("Forbidden: insufficient role", 403);
  }
  
  return data.role as string;
}

/**
 * Require caller owns the booking OR has admin/staff role, or throw 403.
 */
export async function requireBookingOwnerOrStaff(
  bookingId: string,
  userId: string,
  corsHeaders: Record<string, string>,
): Promise<void> {
  const supabase = getAdminClient();
  
  // Check ownership first (fast path)
  const { data: booking } = await supabase
    .from("bookings")
    .select("user_id")
    .eq("id", bookingId)
    .single();
  
  if (booking?.user_id === userId) return;
  
  // Fall back to role check
  const isStaff = await isAdminOrStaff(userId);
  if (!isStaff) {
    throw new AuthError("Forbidden: not booking owner or staff", 403);
  }
}

/**
 * Build a JSON error response from an AuthError (or any error).
 * Use in catch blocks:
 *   catch (err) {
 *     if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
 *     ...
 *   }
 */
export function authErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response {
  if (err instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  // Not an auth error — rethrow
  throw err;
}

export { AuthError };
