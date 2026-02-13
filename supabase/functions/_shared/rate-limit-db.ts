/**
 * DB-backed rate limiting for edge functions.
 * Uses atomic RPC (check_rate_limit) to prevent race conditions.
 * Persists counters in public.rate_limits table (service-role only).
 */

import { getAdminClient } from "./auth.ts";

interface RateLimitOptions {
  /** Unique key for this limit (e.g. "otp-ip:1.2.3.4") */
  key: string;
  /** Window size in seconds */
  windowSeconds: number;
  /** Max requests per window */
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Atomic DB-backed rate limit check using RPC.
 * Single upsert statement prevents race conditions under concurrency.
 */
export async function checkDbRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: opts.key,
    p_window_seconds: opts.windowSeconds,
    p_max_requests: opts.maxRequests,
  });

  if (error || !data || data.length === 0) {
    console.error("[rate-limit-db] RPC error, failing open:", error);
    // Fail open: allow the request but log the error
    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetAt: Date.now() + opts.windowSeconds * 1000,
    };
  }

  const row = data[0];
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  };
}
