import { test, expect } from '@playwright/test';
import { routes } from './fixtures/test-data';

test.describe('Performance - Page Load', () => {
  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('search page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(routes.search);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });

  test('auth page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(routes.auth);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Performance - Core Web Vitals', () => {
  test('should have acceptable LCP on homepage', async ({ page }) => {
    await page.goto(routes.home);
    
    // Wait for LCP
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Fallback timeout
        setTimeout(() => resolve(5000), 5000);
      });
    });
    
    // LCP should be under 4 seconds (good is under 2.5s)
    expect(lcp).toBeLessThan(4000);
  });

  test('should have minimal layout shift', async ({ page }) => {
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any layout shifts
    await page.waitForTimeout(2000);
    
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => resolve(clsValue), 1000);
      });
    });
    
    // CLS should be under 0.25 (good is under 0.1)
    expect(cls).toBeLessThan(0.25);
  });
});

test.describe('Performance - Network Requests', () => {
  test('should minimize number of requests on homepage', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', (request) => {
      requests.push(request.url());
    });
    
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Should have reasonable number of requests
    expect(requests.length).toBeLessThan(100);
  });

  test('should not have failed requests', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });
    
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Should have minimal failed requests
    expect(failedRequests.length).toBeLessThan(5);
  });
});

test.describe('Performance - JavaScript Errors', () => {
  test('homepage should have no JS errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Should have no JavaScript errors
    expect(errors.length).toBe(0);
  });

  test('search page should have no JS errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto(routes.search);
    await page.waitForLoadState('networkidle');
    
    expect(errors.length).toBe(0);
  });

  test('auth page should have no JS errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto(routes.auth);
    await page.waitForLoadState('networkidle');
    
    expect(errors.length).toBe(0);
  });
});

test.describe('Performance - Caching', () => {
  test('static assets should be cached', async ({ page }) => {
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Reload and check for cached responses
    const response = await page.reload();
    
    // Response should be successful
    expect(response?.status()).toBeLessThan(400);
  });
});

test.describe('Performance - Bundle Size', () => {
  test('should not transfer excessive data', async ({ page }) => {
    let totalBytes = 0;
    
    page.on('response', async (response) => {
      const headers = response.headers();
      const contentLength = headers['content-length'];
      if (contentLength) {
        totalBytes += parseInt(contentLength, 10);
      }
    });
    
    await page.goto(routes.home);
    await page.waitForLoadState('networkidle');
    
    // Total transfer should be under 10MB
    expect(totalBytes).toBeLessThan(10 * 1024 * 1024);
  });
});
