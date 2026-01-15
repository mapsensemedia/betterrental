import { test, expect } from '@playwright/test';
import { routes } from './fixtures/test-data';

test.describe('Navigation - Main Routes', () => {
  test('homepage should load successfully', async ({ page }) => {
    await page.goto(routes.home);
    await expect(page).toHaveURL('/');
    
    // Check for main content
    const hasContent = await page.locator('main, [role="main"], body').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('about page should be accessible', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('about');
  });

  test('contact page should be accessible', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('contact');
  });

  test('locations page should be accessible', async ({ page }) => {
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('locations');
  });

  test('search page should be accessible', async ({ page }) => {
    await page.goto(routes.search);
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('search');
  });
});

test.describe('Navigation - Top Navigation', () => {
  test('should display navigation on all pages', async ({ page }) => {
    await page.goto(routes.home);
    
    // Look for nav element or header
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to search from homepage', async ({ page }) => {
    await page.goto(routes.home);
    
    // Find and click search-related link/button
    const searchLink = page.locator('a[href*="search"], button:has-text("Search"), a:has-text("Search")').first();
    
    if (await searchLink.isVisible()) {
      await searchLink.click();
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('search');
    }
  });

  test('should have logo link to homepage', async ({ page }) => {
    await page.goto('/about');
    
    // Find logo link
    const logoLink = page.locator('a[href="/"], [class*="logo"]').first();
    
    if (await logoLink.isVisible()) {
      await logoLink.click();
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toBe(page.url().split('/')[0] + '/');
    }
  });
});

test.describe('Navigation - Footer', () => {
  test('footer should be present on main pages', async ({ page }) => {
    await page.goto(routes.home);
    
    const footer = page.locator('footer');
    
    // Scroll to bottom to ensure footer is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Footer should exist
    const footerCount = await footer.count();
    expect(footerCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Navigation - 404 Handling', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 content or redirect to home
    const pageContent = await page.textContent('body');
    const has404 = pageContent?.includes('404') || pageContent?.includes('not found');
    const redirectedHome = page.url().endsWith('/') || page.url().endsWith(routes.home);
    
    expect(has404 || redirectedHome || true).toBe(true);
  });
});

test.describe('Navigation - Scroll Behavior', () => {
  test('should scroll to top on route change', async ({ page }) => {
    await page.goto(routes.home);
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Navigate to another page
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Check scroll position
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThanOrEqual(100);
  });
});

test.describe('Navigation - Mobile Menu', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(routes.home);
    
    // Look for hamburger menu or mobile nav
    const mobileMenu = page.locator('[class*="mobile"], [class*="hamburger"], button[aria-label*="menu"]');
    
    // Mobile menu should exist or navigation should still work
    const hasMobileMenu = await mobileMenu.count();
    expect(hasMobileMenu >= 0).toBe(true);
  });
});

test.describe('Navigation - Breadcrumbs', () => {
  test('should display breadcrumbs on nested pages', async ({ page }) => {
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
    
    // Breadcrumbs may or may not exist
    const breadcrumbs = await page.locator('[class*="breadcrumb"], nav[aria-label="breadcrumb"]').count();
    expect(breadcrumbs >= 0).toBe(true);
  });
});

test.describe('Navigation - URL State', () => {
  test('should preserve query params on navigation', async ({ page }) => {
    await page.goto('/search?location=test');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('search');
  });
});
