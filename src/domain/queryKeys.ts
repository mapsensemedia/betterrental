/**
 * Centralized Query Keys Registry
 * Single source of truth for all TanStack Query cache keys
 */

export const queryKeys = {
  // ========== Auth & User ==========
  auth: {
    session: ["auth", "session"] as const,
    user: (userId: string) => ["auth", "user", userId] as const,
    roles: (userId: string) => ["auth", "roles", userId] as const,
    isAdmin: (userId: string) => ["user-is-admin", userId] as const,
    capabilities: (userId: string, panel: string) => ["capabilities", userId, panel] as const,
  },

  // ========== Bookings ==========
  bookings: {
    all: ["bookings"] as const,
    list: (filters?: Record<string, unknown>) => ["admin-bookings", filters] as const,
    detail: (id: string) => ["booking", id] as const,
    byCode: (code: string) => ["booking-by-code", code] as const,
    active: ["active-rentals"] as const,
    activeDetail: (id: string) => ["active-rental", id] as const,
    returns: ["returns"] as const,
    handovers: ["handovers"] as const,
  },

  // ========== Fleet ==========
  fleet: {
    categories: ["fleet-categories"] as const,
    availableCategories: (locationId: string) => ["available-categories", locationId] as const,
    categoryDetail: (id: string) => ["fleet-category", id] as const,
    categoryVins: (categoryId: string) => ["category-vins", categoryId] as const,
    units: (filters?: Record<string, unknown>) => ["vehicle-units", filters] as const,
    unitDetail: (id: string) => ["vehicle-unit", id] as const,
    unitExpenses: (unitId: string) => ["vehicle-expenses", unitId] as const,
    costAnalysis: ["fleet-cost-analysis"] as const,
    costTimeline: (unitId: string) => ["vehicle-cost-timeline", unitId] as const,
  },

  // ========== Pricing ==========
  pricing: {
    addOns: ["add-ons"] as const,
    addOnById: (id: string) => ["add-on", id] as const,
    fuelPrices: ["fuel-prices"] as const,
    locationRates: (locationId: string) => ["location-rates", locationId] as const,
    categoryRates: (categoryId: string) => ["category-rates", categoryId] as const,
  },

  // ========== Payments ==========
  payments: {
    byBooking: (bookingId: string) => ["payments", bookingId] as const,
    depositLedger: (bookingId: string) => ["deposit-ledger", bookingId] as const,
    depositJobs: ["deposit-jobs"] as const,
  },

  // ========== Locations ==========
  locations: {
    all: ["locations"] as const,
    detail: (id: string) => ["location", id] as const,
  },

  // ========== Alerts ==========
  alerts: {
    all: ["alerts"] as const,
    pending: ["pending-alerts-count"] as const,
    byType: (type: string) => ["alerts", type] as const,
  },

  // ========== Support ==========
  support: {
    tickets: (filters?: Record<string, unknown>) => ["support-tickets", filters] as const,
    ticketDetail: (id: string) => ["support-ticket", id] as const,
    ticketMessages: (ticketId: string) => ["ticket-messages", ticketId] as const,
  },

  // ========== Incidents ==========
  incidents: {
    all: ["incidents"] as const,
    detail: (id: string) => ["incident", id] as const,
    photos: (incidentId: string) => ["incident-photos", incidentId] as const,
  },

  // ========== Audit ==========
  audit: {
    logs: (filters?: Record<string, unknown>) => ["audit-logs", filters] as const,
    byEntity: (entityType: string, entityId: string) => ["audit-logs", entityType, entityId] as const,
  },

  // ========== Points & Membership ==========
  points: {
    settings: ["points-settings"] as const,
    balance: (userId: string) => ["points-balance", userId] as const,
    ledger: (userId: string) => ["points-ledger", userId] as const,
  },

  // ========== Sidebar ==========
  sidebar: {
    counts: ["sidebar-counts"] as const,
  },
} as const;

export type QueryKeyType = typeof queryKeys;
