/**
 * Payment Validation Schemas
 */
import { z } from "zod";

// Payment types
export const paymentTypeSchema = z.enum([
  "rental",
  "deposit",
  "addon",
  "damage",
  "refund",
  "late_fee",
]);
export type PaymentType = z.infer<typeof paymentTypeSchema>;

// Payment status
export const paymentStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Payment method
export const paymentMethodSchema = z.enum([
  "card",
  "cash",
  "bank_transfer",
  "stripe",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Deposit action types
export const depositActionSchema = z.enum([
  "hold",
  "capture",
  "release",
  "withhold",
  "partial_release",
]);
export type DepositAction = z.infer<typeof depositActionSchema>;

// Payment creation input
export const createPaymentInputSchema = z.object({
  bookingId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  paymentType: paymentTypeSchema,
  paymentMethod: paymentMethodSchema.optional(),
  transactionId: z.string().max(255).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Deposit ledger entry
export const depositLedgerEntrySchema = z.object({
  bookingId: z.string().uuid(),
  action: depositActionSchema,
  amount: z.number().nonnegative(),
  reason: z.string().max(500).optional(),
  paymentId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
});

export type DepositLedgerEntry = z.infer<typeof depositLedgerEntrySchema>;

// Deposit release request (for return flow)
export const depositReleaseRequestSchema = z.object({
  bookingId: z.string().uuid(),
  releaseAmount: z.number().nonnegative("Release amount must be non-negative"),
  withholdAmount: z.number().nonnegative("Withhold amount must be non-negative"),
  withholdReason: z.string().max(500).optional(),
}).refine(
  (data) => data.releaseAmount > 0 || data.withholdAmount > 0,
  { message: "Either release or withhold amount must be specified" }
);

export type DepositReleaseRequest = z.infer<typeof depositReleaseRequestSchema>;

// Stripe checkout session request
export const checkoutSessionRequestSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("cad"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

// Refund request
export const refundRequestSchema = z.object({
  bookingId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.string().min(1).max(500),
});

export type RefundRequest = z.infer<typeof refundRequestSchema>;

/**
 * Validate currency code (ISO 4217)
 */
export function isValidCurrency(currency: string): boolean {
  const validCurrencies = ["cad", "usd", "eur", "gbp"];
  return validCurrencies.includes(currency.toLowerCase());
}

/**
 * Format amount for display
 */
export function formatCurrency(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}
