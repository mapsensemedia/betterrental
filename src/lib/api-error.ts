/**
 * Centralized API Error Handling
 * 
 * Provides consistent error handling patterns across hooks and edge functions.
 * PR3: Standardize Error Handling
 */

import { toast } from "sonner";

// Standard API error codes
export const API_ERROR_CODES = {
  // Client errors
  VALIDATION_FAILED: "validation_failed",
  AGE_VALIDATION_FAILED: "age_validation_failed",
  RESERVATION_EXPIRED: "reservation_expired",
  VEHICLE_UNAVAILABLE: "vehicle_unavailable",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  
  // Server errors
  SERVER_ERROR: "server_error",
  BOOKING_FAILED: "booking_failed",
  PAYMENT_FAILED: "payment_failed",
  NOTIFICATION_FAILED: "notification_failed",
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// Standard API error structure
export interface ApiError {
  error: ApiErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [API_ERROR_CODES.VALIDATION_FAILED]: "Please check your information and try again.",
  [API_ERROR_CODES.AGE_VALIDATION_FAILED]: "Driver age confirmation is required.",
  [API_ERROR_CODES.RESERVATION_EXPIRED]: "Your reservation has expired. Please start over.",
  [API_ERROR_CODES.VEHICLE_UNAVAILABLE]: "This vehicle is no longer available.",
  [API_ERROR_CODES.UNAUTHORIZED]: "Please sign in to continue.",
  [API_ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action.",
  [API_ERROR_CODES.NOT_FOUND]: "The requested resource was not found.",
  [API_ERROR_CODES.RATE_LIMITED]: "Too many requests. Please wait and try again.",
  [API_ERROR_CODES.SERVER_ERROR]: "Something went wrong. Please try again.",
  [API_ERROR_CODES.BOOKING_FAILED]: "Failed to create booking. Please try again.",
  [API_ERROR_CODES.PAYMENT_FAILED]: "Payment processing failed. Please try again.",
  [API_ERROR_CODES.NOTIFICATION_FAILED]: "Failed to send notification.",
};

/**
 * Parse API error from response
 */
export function parseApiError(response: unknown): ApiError {
  if (typeof response === "object" && response !== null) {
    const obj = response as Record<string, unknown>;
    return {
      error: (obj.error as ApiErrorCode) || API_ERROR_CODES.SERVER_ERROR,
      message: (obj.message as string) || ERROR_MESSAGES[API_ERROR_CODES.SERVER_ERROR],
      details: obj.details,
      retryable: obj.retryable as boolean | undefined,
    };
  }
  return {
    error: API_ERROR_CODES.SERVER_ERROR,
    message: ERROR_MESSAGES[API_ERROR_CODES.SERVER_ERROR],
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return obj.message;
    }
    if (typeof obj.error === "string" && obj.error in ERROR_MESSAGES) {
      return ERROR_MESSAGES[obj.error as ApiErrorCode];
    }
  }
  return ERROR_MESSAGES[API_ERROR_CODES.SERVER_ERROR];
}

/**
 * Standard error handler for mutations
 * Shows toast and logs error
 */
export function handleMutationError(
  error: unknown,
  context?: string
): void {
  const message = getErrorMessage(error);
  console.error(`${context || "Mutation"} failed:`, error);
  toast.error(message);
}

/**
 * Standard success handler for mutations
 */
export function handleMutationSuccess(message: string): void {
  toast.success(message);
}

/**
 * Create standard mutation handlers
 */
export function createMutationHandlers<TData = unknown>(options: {
  successMessage?: string;
  errorContext?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
}) {
  return {
    onSuccess: (data: TData) => {
      if (options.successMessage) {
        handleMutationSuccess(options.successMessage);
      }
      options.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      handleMutationError(error, options.errorContext);
      options.onError?.(error);
    },
  };
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, onRetry } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        onRetry?.(attempt, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    
    // Explicit retryable flag
    if (obj.retryable === true) return true;
    if (obj.retryable === false) return false;
    
    // Rate limit errors are retryable
    if (obj.error === API_ERROR_CODES.RATE_LIMITED) return true;
    
    // Server errors are often retryable
    if (obj.error === API_ERROR_CODES.SERVER_ERROR) return true;
  }
  
  // Network errors are typically retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  
  return false;
}
