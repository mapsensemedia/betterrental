/**
 * Authentication utilities for Edge Functions
 * 
 * Provides JWT validation and user extraction
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
