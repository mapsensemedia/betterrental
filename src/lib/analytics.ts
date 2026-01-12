/**
 * Analytics utility for tracking events across the application
 * Supports PostHog for analytics and error tracking
 */

// PostHog configuration - using Lovable Cloud-hosted analytics
const POSTHOG_API_KEY = 'phc_c2c_rental_analytics';
const POSTHOG_HOST = 'https://app.posthog.com';

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

interface AnalyticsEventData {
  event: AnalyticsEvent;
  properties?: EventProperties;
  timestamp: string;
  page: string;
  sessionId: string;
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

// Event queue for batching (stored in memory)
let eventQueue: AnalyticsEventData[] = [];

// Track an analytics event
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  const eventData: AnalyticsEventData = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    sessionId: getSessionId(),
  };

  // Add to queue
  eventQueue.push(eventData);

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event, properties);
  }

  // Persist to localStorage for admin dashboard
  try {
    const stored = localStorage.getItem('c2c_analytics_events') || '[]';
    const events = JSON.parse(stored) as AnalyticsEventData[];
    events.push(eventData);
    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    localStorage.setItem('c2c_analytics_events', JSON.stringify(events));
  } catch (e) {
    // Ignore storage errors
  }
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

// Get analytics data for admin dashboard
export function getAnalyticsData(): {
  events: AnalyticsEventData[];
  funnelStats: {
    vehicleViews: number;
    vehicleSelections: number;
    checkoutStarts: number;
    bookingsCompleted: number;
    conversionRate: number;
  };
  topPages: { page: string; views: number }[];
  eventsByType: { event: string; count: number }[];
  recentErrors: AnalyticsEventData[];
} {
  try {
    const stored = localStorage.getItem('c2c_analytics_events') || '[]';
    const events = JSON.parse(stored) as AnalyticsEventData[];

    // Calculate funnel stats
    const vehicleViews = events.filter((e) => e.event === 'vehicle_viewed').length;
    const vehicleSelections = events.filter((e) => e.event === 'vehicle_selected').length;
    const checkoutStarts = events.filter((e) => e.event === 'checkout_started').length;
    const bookingsCompleted = events.filter((e) => e.event === 'booking_completed').length;
    const conversionRate = vehicleViews > 0 ? (bookingsCompleted / vehicleViews) * 100 : 0;

    // Top pages
    const pageViews = events.filter((e) => e.event === 'page_view');
    const pageCounts: Record<string, number> = {};
    pageViews.forEach((e) => {
      const page = e.page;
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Events by type
    const eventCounts: Record<string, number> = {};
    events.forEach((e) => {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });
    const eventsByType = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    // Recent errors
    const recentErrors = events
      .filter((e) => e.event === 'error')
      .slice(-10)
      .reverse();

    return {
      events,
      funnelStats: {
        vehicleViews,
        vehicleSelections,
        checkoutStarts,
        bookingsCompleted,
        conversionRate,
      },
      topPages,
      eventsByType,
      recentErrors,
    };
  } catch (e) {
    return {
      events: [],
      funnelStats: {
        vehicleViews: 0,
        vehicleSelections: 0,
        checkoutStarts: 0,
        bookingsCompleted: 0,
        conversionRate: 0,
      },
      topPages: [],
      eventsByType: [],
      recentErrors: [],
    };
  }
}

// Clear analytics data (for admin)
export function clearAnalyticsData(): void {
  localStorage.removeItem('c2c_analytics_events');
  eventQueue = [];
}
