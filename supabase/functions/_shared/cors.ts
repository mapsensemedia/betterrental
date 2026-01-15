/**
 * CORS and Rate Limiting Utilities for Edge Functions
 * 
 * This module provides:
 * 1. Origin-whitelisted CORS headers (not wildcard *)
 * 2. IP-based rate limiting helpers
 * 3. Request validation utilities
 */

// Allowed origins - add your domains here
const ALLOWED_ORIGINS = [
  // Production
  "https://betterrental.lovable.app",
  "https://c4r.ca",
  "https://www.c4r.ca",
  // Preview (Lovable)
  "https://id-preview--54271dc8-d163-4520-adb8-38f2d0b29f66.lovable.app",
  // Local development
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

/**
 * Get CORS headers with origin validation
 * Returns wildcard only for webhook endpoints
 */
export function getCorsHeaders(req: Request, isWebhook = false): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  
  // For webhooks (Stripe, etc.), we need to accept all origins since they don't send Origin headers
  if (isWebhook) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith(".lovable.app") || // Allow all Lovable preview URLs
    origin.endsWith(".c4r.ca"); // Allow subdomains
  
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request, isWebhook = false): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(req, isWebhook) 
  });
}

/**
 * Get client IP from request headers
 */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
}

/**
 * Simple in-memory rate limiter
 * In production, use Redis/KV store for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Prefix for the key
}

export function checkRateLimit(
  key: string, 
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: Date } {
  const fullKey = `${config.keyPrefix || "rl"}:${key}`;
  const now = Date.now();
  
  let record = rateLimitStore.get(fullKey);
  
  // Clean up expired records periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  // If no record or expired, create new one
  if (!record || record.resetAt < now) {
    record = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(fullKey, record);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(record.resetAt),
    };
  }
  
  // Increment counter
  record.count++;
  
  const allowed = record.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - record.count);
  
  return {
    allowed,
    remaining,
    resetAt: new Date(record.resetAt),
  };
}

/**
 * Rate limit response
 */
export function rateLimitResponse(resetAt: Date, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests", 
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000)
    }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
      } 
    }
  );
}

/**
 * Input validation helpers
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 255);
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").slice(0, 20);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Anti-enumeration: Generic error messages
 */
export const GENERIC_ERRORS = {
  NOT_FOUND: "Resource not found",
  INVALID_REQUEST: "Invalid request",
  UNAUTHORIZED: "Unauthorized",
  SERVER_ERROR: "An error occurred",
} as const;
