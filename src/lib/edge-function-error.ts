/**
 * Extract error message from Supabase Edge Function invocation.
 * 
 * When an edge function returns non-2xx, supabase.functions.invoke puts the
 * response in `error.context` (a Response object) and sets `data` to null.
 * This helper extracts the actual error message from the response body.
 */
export interface EdgeFunctionErrorDetails {
  message: string;
  gatewayStatus?: number;
  gatewayCode?: number;
  retryable?: boolean;
  requiresManualResolution?: boolean;
}

export async function extractEdgeFunctionErrorDetails(
  data: any,
  error: any,
): Promise<EdgeFunctionErrorDetails> {
  // If the SDK returned an error object, try to read the response body
  if (error) {
    // FunctionsHttpError has a .context that is a Response
    if (error.context && typeof error.context.json === "function") {
      try {
        const body = await error.context.json();
        const message = body?.error || body?.message;
        if (message) {
          return {
            message,
            gatewayStatus: body.gatewayStatus,
            gatewayCode: body.gatewayCode,
            retryable: body.retryable,
            requiresManualResolution: body.requiresManualResolution,
          };
        }
      } catch {
        // Fall through
      }
    }
    // Fall back to error.message
    if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
      return { message: error.message };
    }
    return { message: "Request failed" };
  }

  // If no SDK error but data contains an error field
  if (data?.error) {
    return {
      message: data.error,
      gatewayStatus: data.gatewayStatus,
      gatewayCode: data.gatewayCode,
      retryable: data.retryable,
      requiresManualResolution: data.requiresManualResolution,
    };
  }

  return { message: "Unknown error" };
}

export async function extractEdgeFunctionError(
  data: any,
  error: any,
): Promise<string> {
  const details = await extractEdgeFunctionErrorDetails(data, error);
  return details.message;
}
