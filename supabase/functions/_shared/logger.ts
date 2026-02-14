/**
 * Structured Logging Utility for Edge Functions
 * 
 * Provides consistent, JSON-structured log output with:
 * - request_id (unique per invocation)
 * - function_name
 * - booking_id, user_id (when available)
 * - error_code (for error events)
 * - duration_ms (for timed operations)
 */

export interface LogContext {
  requestId: string;
  functionName: string;
  userId?: string;
  bookingId?: string;
}

/** Generate a short request ID for log correlation */
export function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** Create a logger scoped to a request */
export function createLogger(functionName: string, requestId?: string) {
  const ctx: LogContext = {
    requestId: requestId || generateRequestId(),
    functionName,
  };

  function formatLog(level: string, message: string, extra?: Record<string, unknown>) {
    return JSON.stringify({
      level,
      ts: new Date().toISOString(),
      req_id: ctx.requestId,
      fn: ctx.functionName,
      user_id: ctx.userId || undefined,
      booking_id: ctx.bookingId || undefined,
      msg: message,
      ...extra,
    });
  }

  return {
    /** Set user context for all subsequent logs */
    setUser(userId: string) { ctx.userId = userId; },
    /** Set booking context for all subsequent logs */
    setBooking(bookingId: string) { ctx.bookingId = bookingId; },

    info(message: string, extra?: Record<string, unknown>) {
      console.log(formatLog("info", message, extra));
    },

    warn(message: string, extra?: Record<string, unknown>) {
      console.warn(formatLog("warn", message, extra));
    },

    error(message: string, error?: unknown, extra?: Record<string, unknown>) {
      const errData = error instanceof Error
        ? { error_message: error.message, error_stack: error.stack?.slice(0, 500) }
        : error ? { error_raw: String(error) } : {};
      console.error(formatLog("error", message, { ...errData, ...extra }));
    },

    /** Time an async operation */
    async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const durationMs = Math.round(performance.now() - start);
        console.log(formatLog("info", `${label} completed`, { duration_ms: durationMs }));
        return result;
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        console.error(formatLog("error", `${label} failed`, {
          duration_ms: durationMs,
          error_message: err instanceof Error ? err.message : String(err),
        }));
        throw err;
      }
    },

    /** Get the request ID for response headers */
    getRequestId() { return ctx.requestId; },
  };
}

/** Common error codes for structured logging */
export const ErrorCodes = {
  PRICE_VALIDATION_FAILED: "PRICE_VALIDATION_FAILED",
  PRICE_MISMATCH: "PRICE_MISMATCH",
  EXTRAS_PERSIST_FAILED: "EXTRAS_PERSIST_FAILED",
  WEBHOOK_SIGNATURE_INVALID: "WEBHOOK_SIGNATURE_INVALID",
  WEBHOOK_DUPLICATE_EVENT: "WEBHOOK_DUPLICATE_EVENT",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_FAILED: "AUTH_FAILED",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  DEPOSIT_OPERATION_FAILED: "DEPOSIT_OPERATION_FAILED",
} as const;
