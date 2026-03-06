/**
 * Worldline (Bambora NAM) API Client
 * 
 * Provides authenticated HTTP requests to the Bambora Payments API.
 * Uses HTTP Basic Auth: base64(merchantId:passcode)
 * 
 * Environment variables required:
 * - WORLDLINE_MERCHANT_ID
 * - WORLDLINE_API_PASSCODE
 * - WORLDLINE_ENVIRONMENT (sandbox | production)
 */

const BASE_URL = "https://api.na.bambora.com";

function getCredentials() {
  const merchantId = Deno.env.get("WORLDLINE_MERCHANT_ID");
  const passcode = Deno.env.get("WORLDLINE_API_PASSCODE");
  if (!merchantId || !passcode) {
    throw new Error("Worldline credentials not configured");
  }
  return { merchantId, passcode };
}

function getAuthHeader(): string {
  const { merchantId, passcode } = getCredentials();
  const encoded = btoa(`${merchantId}:${passcode}`);
  return `Passcode ${encoded}`;
}

export interface WorldlineResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export interface WorldlineError {
  code: number;
  category: number;
  message: string;
  reference: string;
  details?: { field: string; message: string }[];
}

/**
 * Make an authenticated request to the Bambora NAM API.
 */
export async function worldlineRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<WorldlineResponse<T>> {
  const url = `${BASE_URL}/v1${path}`;

  const headers: Record<string, string> = {
    "Authorization": getAuthHeader(),
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Empty response from payment gateway" };
  }

  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
  };
}

/**
 * Parse a Worldline error response into a user-friendly message.
 */
/**
 * Known Bambora error codes mapped to actionable staff messages.
 */
const KNOWN_ERROR_CODES: Record<number, string> = {
  319: "This hold can no longer be voided (it may have already settled). Try issuing a refund instead.",
  302: "Transaction was already completed — no further action needed.",
  16:  "Transaction not found at the gateway. It may have already been released automatically.",
};

export function parseWorldlineError(data: unknown): string {
  if (data && typeof data === "object" && "code" in data) {
    const err = data as WorldlineError;
    // Return a friendly message for known codes
    if (err.code && KNOWN_ERROR_CODES[err.code]) {
      return KNOWN_ERROR_CODES[err.code];
    }
    const details = err.details?.map(d => `${d.field}: ${d.message}`).join("; ");
    return details ? `${err.message} (${details})` : (err.message || "Payment processing failed");
  }
  return "Payment processing failed";
}

export function getMerchantId(): string {
  return getCredentials().merchantId;
}
