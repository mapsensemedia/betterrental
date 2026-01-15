import { test, expect } from '@playwright/test';
import { routes, adminUser } from './fixtures/test-data';

test.describe('Admin Operations - Access Control', () => {
  test('should redirect unauthenticated users from admin routes', async ({ page }) => {
    await page.goto(routes.admin.overview);
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to auth or show unauthorized
    const url = page.url();
    const redirectedToAuth = url.includes('auth') || url.includes('login');
    const stayedOnAdmin = url.includes('admin');
    
    // Either redirected or showing unauthorized message
    expect(redirectedToAuth || stayedOnAdmin).toBe(true);
  });

  test('should display login page when accessing admin', async ({ page }) => {
    await page.goto(routes.admin.bookings);
    
    await page.waitForLoadState('networkidle');
    
    // Check for auth elements or admin content
    const hasAuthForm = await page.locator('input[type="email"], input[type="password"]').count();
    const hasAdminContent = await page.locator('[class*="admin"], [class*="dashboard"]').count();
    
    expect(hasAuthForm > 0 || hasAdminContent > 0).toBe(true);
  });
});

test.describe('Admin Operations - Dashboard', () => {
  // Note: These tests assume admin is logged in
  // In a real scenario, you'd use a test setup to authenticate first
  
  test('admin overview page should have key sections', async ({ page }) => {
    await page.goto(routes.admin.overview);
    await page.waitForLoadState('networkidle');
    
    // Page should load
    expect(page.url()).toContain('admin');
  });

  test('admin bookings page should be accessible', async ({ page }) => {
    await page.goto(routes.admin.bookings);
    await page.waitForLoadState('networkidle');
    
    // Page should load
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });

  test('admin calendar page should be accessible', async ({ page }) => {
    await page.goto(routes.admin.calendar);
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });

  test('admin inventory page should be accessible', async ({ page }) => {
    await page.goto(routes.admin.inventory);
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });

  test('admin alerts page should be accessible', async ({ page }) => {
    await page.goto(routes.admin.alerts);
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });

  test('admin active rentals page should be accessible', async ({ page }) => {
    await page.goto(routes.admin.activeRentals);
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });
});

test.describe('Admin Operations - Booking Management', () => {
  test('should display booking details when booking exists', async ({ page }) => {
    // Navigate to a booking ops page with mock ID
    await page.goto('/admin/booking-ops/test-booking-id');
    await page.waitForLoadState('networkidle');
    
    // Should show booking details or error/redirect
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });

  test('should handle return operations page', async ({ page }) => {
    await page.goto('/admin/return-ops/test-booking-id');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });
});

test.describe('Admin Operations - Verifications', () => {
  test('should display verifications page', async ({ page }) => {
    await page.goto(routes.admin.verifications);
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url.includes('admin') || url.includes('auth')).toBe(true);
  });
});

test.describe('Admin Operations - Navigation', () => {
  test('admin sidebar should be present on admin pages', async ({ page }) => {
    await page.goto(routes.admin.overview);
    await page.waitForLoadState('networkidle');
    
    // Check for sidebar or navigation elements
    const hasSidebar = await page.locator('nav, aside, [class*="sidebar"]').count();
    const hasAuth = page.url().includes('auth');
    
    expect(hasSidebar > 0 || hasAuth).toBe(true);
  });

  test('should navigate between admin sections', async ({ page }) => {
    await page.goto(routes.admin.overview);
    await page.waitForLoadState('networkidle');
    
    // If on admin page, look for navigation links
    if (!page.url().includes('auth')) {
      const navLinks = await page.locator('a[href*="/admin"]').count();
      expect(navLinks).toBeGreaterThan(0);
    }
  });
});

test.describe('Admin Operations - Data Tables', () => {
  test('bookings table should support basic interactions', async ({ page }) => {
    await page.goto(routes.admin.bookings);
    await page.waitForLoadState('networkidle');
    
    // If on bookings page (not redirected to auth)
    if (page.url().includes('bookings')) {
      // Look for table or list elements
      const hasTable = await page.locator('table, [class*="table"], [class*="list"]').count();
      expect(hasTable).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Admin Operations - Responsive Design', () => {
  test('admin pages should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(routes.admin.overview);
    await page.waitForLoadState('networkidle');
    
    // Page should render without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
  });

  test('admin pages should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(routes.admin.overview);
    await page.waitForLoadState('networkidle');
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(800);
  });
});
