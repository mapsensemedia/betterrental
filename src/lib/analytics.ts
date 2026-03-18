/**
 * Analytics utility for tracking events across the application
 * Persists events to Supabase analytics_events table for centralized tracking.
 */
import { supabase } from "@/integrations/supabase/client";

// Event types for the booking funnel
export type AnalyticsEvent =
  | 'page_view'
  | 'vehicle_viewed'
  | 'vehicle_selected'
  | 'protection_selected'
  | 'addons_selected'
  | 'checkout_started'
  | 'checkout_payment_method_selected'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'contact_form_submitted'
  | 'contact_form_error'
  | 'search_performed'
  | 'auth_signup'
  | 'auth_login'
  | 'auth_logout'
  | 'password_reset_requested'
  | 'error';

interface EventProperties {
  [key: string]: string | number | boolean | undefined | null;
}

// Generate a session ID for the current browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track an analytics event — persists to Supabase
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  const sessionId = getSessionId();
  const page = window.location.pathname;

  // Log in dev
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, properties);
  }

  // Fire-and-forget insert to Supabase
  supabase
    .from('analytics_events')
    .insert([{
      event,
      properties: properties ? (properties as Record<string, unknown>) : {},
      page,
      session_id: sessionId,
    }])
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[Analytics] Insert error:', error.message);
      }
    });
}

// Track page views automatically
export function trackPageView(pageName?: string): void {
  trackEvent('page_view', {
    page_name: pageName || document.title,
    url: window.location.href,
    referrer: document.referrer || undefined,
  });
}

// Track errors
export function trackError(error: Error, context?: EventProperties): void {
  trackEvent('error', {
    error_message: error.message,
    error_name: error.name,
    error_stack: error.stack?.slice(0, 500),
    ...context,
  });
}

// Conversion funnel helpers
export const funnelEvents = {
  vehicleViewed: (vehicleId: string, make: string, model: string) =>
    trackEvent('vehicle_viewed', { vehicle_id: vehicleId, make, model }),

  vehicleSelected: (vehicleId: string, make: string, model: string, dailyRate: number) =>
    trackEvent('vehicle_selected', { vehicle_id: vehicleId, make, model, daily_rate: dailyRate }),

  protectionSelected: (level: string, dailyRate: number) =>
    trackEvent('protection_selected', { protection_level: level, daily_rate: dailyRate }),

  addonsSelected: (addonIds: string[], totalCost: number) =>
    trackEvent('addons_selected', { addon_count: addonIds.length, total_cost: totalCost }),

  checkoutStarted: (vehicleId: string, total: number, rentalDays: number) =>
    trackEvent('checkout_started', { vehicle_id: vehicleId, total_amount: total, rental_days: rentalDays }),

  paymentMethodSelected: (method: 'pay-now' | 'pay-later') =>
    trackEvent('checkout_payment_method_selected', { payment_method: method }),

  bookingCompleted: (bookingId: string, total: number, paymentMethod: string) =>
    trackEvent('booking_completed', { booking_id: bookingId, total_amount: total, payment_method: paymentMethod }),

  bookingCancelled: (bookingId: string, reason?: string) =>
    trackEvent('booking_cancelled', { booking_id: bookingId, reason }),

  searchPerformed: (filters: EventProperties) =>
    trackEvent('search_performed', filters),
};
