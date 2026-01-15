/**
 * Shared test data and constants for E2E tests
 */

export const testUser = {
  email: 'test-e2e@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
};

export const guestUser = {
  email: 'guest-e2e@example.com',
  firstName: 'Guest',
  lastName: 'Tester',
  phone: '+0987654321',
};

export const adminUser = {
  email: 'admin-e2e@example.com',
  password: 'AdminPassword123!',
};

export const testBooking = {
  // Use tomorrow and day after for consistent test dates
  getStartDate: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    return date;
  },
  getEndDate: () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    date.setHours(10, 0, 0, 0);
    return date;
  },
  protection: 'basic',
};

export const routes = {
  home: '/',
  search: '/search',
  checkout: '/checkout',
  auth: '/auth',
  dashboard: '/dashboard',
  admin: {
    overview: '/admin',
    bookings: '/admin/bookings',
    activeRentals: '/admin/active-rentals',
    calendar: '/admin/calendar',
    inventory: '/admin/inventory',
    alerts: '/admin/alerts',
    verifications: '/admin/verifications',
  },
};

export const selectors = {
  // Navigation
  topNav: '[data-testid="top-nav"]',
  navLogo: '[data-testid="nav-logo"]',
  
  // Search components
  searchBar: '[data-testid="search-bar"]',
  locationSelect: '[data-testid="location-select"]',
  datePickerStart: '[data-testid="date-picker-start"]',
  datePickerEnd: '[data-testid="date-picker-end"]',
  searchButton: '[data-testid="search-button"]',
  
  // Vehicle cards
  vehicleCard: '[data-testid="vehicle-card"]',
  vehicleDetailsModal: '[data-testid="vehicle-details-modal"]',
  rentNowButton: '[data-testid="rent-now-button"]',
  
  // Checkout
  checkoutForm: '[data-testid="checkout-form"]',
  firstNameInput: 'input[name="firstName"]',
  lastNameInput: 'input[name="lastName"]',
  emailInput: 'input[name="email"]',
  phoneInput: 'input[name="phone"]',
  submitBookingButton: '[data-testid="submit-booking"]',
  
  // Auth
  loginForm: '[data-testid="login-form"]',
  signupForm: '[data-testid="signup-form"]',
  authEmailInput: 'input[type="email"]',
  authPasswordInput: 'input[type="password"]',
  authSubmitButton: 'button[type="submit"]',
  
  // Admin
  adminSidebar: '[data-testid="admin-sidebar"]',
  bookingsTable: '[data-testid="bookings-table"]',
  bookingRow: '[data-testid="booking-row"]',
  statusBadge: '[data-testid="status-badge"]',
};
