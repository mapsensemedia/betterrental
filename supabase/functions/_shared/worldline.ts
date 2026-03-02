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
  const { merchantId } = getCredentials();
  const url = `${BASE_URL}/v1/${merchantId}${path}`;

  const headers: Record<string, string> = {
    "Authorization": getAuthHeader(),
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
  };
}

/**
 * Parse a Worldline error response into a user-friendly message.
 */
export function parseWorldlineError(data: unknown): string {
  if (data && typeof data === "object" && "message" in data) {
    const err = data as WorldlineError;
    const details = err.details?.map(d => `${d.field}: ${d.message}`).join("; ");
    return details ? `${err.message} (${details})` : err.message;
  }
  return "Payment processing failed";
}

export function getMerchantId(): string {
  return getCredentials().merchantId;
}
