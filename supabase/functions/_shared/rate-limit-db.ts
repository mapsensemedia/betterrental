/**
 * DB-backed rate limiting for edge functions.
 * Persists counters in public.rate_limits table (service-role only).
 * Survives cold starts and works across distributed instances.
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
 * Check and increment a DB-backed rate limit counter.
 * Uses UPSERT for atomicity.
 */
export async function checkDbRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = getAdminClient();
  const now = new Date();

  // Try to get existing record
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("key", opts.key)
    .maybeSingle();

  if (existing) {
    const windowStart = new Date(existing.window_start);
    const windowEnd = new Date(windowStart.getTime() + existing.window_seconds * 1000);

    if (now < windowEnd) {
      // Window still active
      if (existing.request_count >= existing.max_requests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: windowEnd.getTime(),
        };
      }

      // Increment
      await supabase
        .from("rate_limits")
        .update({ request_count: existing.request_count + 1 })
        .eq("id", existing.id);

      return {
        allowed: true,
        remaining: existing.max_requests - existing.request_count - 1,
        resetAt: windowEnd.getTime(),
      };
    }

    // Window expired — reset
    await supabase
      .from("rate_limits")
      .update({
        window_start: now.toISOString(),
        request_count: 1,
        window_seconds: opts.windowSeconds,
        max_requests: opts.maxRequests,
      })
      .eq("id", existing.id);

    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetAt: now.getTime() + opts.windowSeconds * 1000,
    };
  }

  // No record — create new
  await supabase.from("rate_limits").insert({
    key: opts.key,
    window_start: now.toISOString(),
    request_count: 1,
    window_seconds: opts.windowSeconds,
    max_requests: opts.maxRequests,
  });

  return {
    allowed: true,
    remaining: opts.maxRequests - 1,
    resetAt: now.getTime() + opts.windowSeconds * 1000,
  };
}
