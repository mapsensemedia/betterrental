/**
 * Customer Validation Schemas
 * 
 * Validation for customer/profile data.
 */
import { z } from "zod";

// Phone number regex - supports international formats
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

// Email validation with sanitization
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email is too long")
  .transform((s) => s.toLowerCase().trim());

// Phone validation with sanitization
export const phoneSchema = z
  .string()
  .min(10, "Phone number is too short")
  .max(20, "Phone number is too long")
  .transform((s) => s.replace(/[\s\-\(\)\.]/g, "")) // Remove common formatting
  .refine((s) => phoneRegex.test(s), "Invalid phone number format");

// Customer name validation
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .transform((s) => s.trim());

// Full customer/profile schema
export const customerProfileSchema = z.object({
  fullName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

// Guest checkout contact info
export const guestContactSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  countryCode: z.string().min(1).max(5).default("+1"),
});

export type GuestContact = z.infer<typeof guestContactSchema>;

// Driver license validation
export const driverLicenseSchema = z.object({
  frontUrl: z.string().url("Invalid license front URL"),
  backUrl: z.string().url("Invalid license back URL").optional(),
  expiryDate: z.string().datetime().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export type DriverLicense = z.infer<typeof driverLicenseSchema>;

/**
 * Sanitize email for consistent storage
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize phone number - remove formatting
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, "");
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Check if phone is valid
 */
export function isValidPhone(phone: string): boolean {
  // Allow some leniency - just check length and format
  const sanitized = sanitizePhone(phone);
  return sanitized.length >= 10 && sanitized.length <= 15 && phoneRegex.test(sanitized);
}
