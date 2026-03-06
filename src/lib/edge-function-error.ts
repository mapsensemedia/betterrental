/**
 * Extract error message from Supabase Edge Function invocation.
 * 
 * When an edge function returns non-2xx, supabase.functions.invoke puts the
 * response in `error.context` (a Response object) and sets `data` to null.
 * This helper extracts the actual error message from the response body.
 */
export async function extractEdgeFunctionError(
  data: any,
  error: any,
): Promise<string> {
  // If the SDK returned an error object, try to read the response body
  if (error) {
    // FunctionsHttpError has a .context that is a Response
    if (error.context && typeof error.context.json === "function") {
      try {
        const body = await error.context.json();
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch {
        // Fall through
      }
    }
    // Fall back to error.message
    if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
      return error.message;
    }
    return "Request failed";
  }

  // If no SDK error but data contains an error field
  if (data?.error) {
    return data.error;
  }

  return "Unknown error";
}
