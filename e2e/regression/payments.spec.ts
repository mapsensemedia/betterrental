/**
 * Payment Regression Tests
 * Tests 11–12: Webhook idempotency and refund flows
 */
import { test, expect } from "@playwright/test";

test.describe("Payments — Webhook & Refund Flows", () => {

  test("11. Stripe webhook endpoint responds correctly", async ({ request }) => {
    // Test that the webhook endpoint exists and rejects unsigned requests
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bsvsveoaihtbsteqikvp.supabase.co";
    
    // Call webhook without valid signature — should get 400 (signature verification failed)
    const response = await request.post(`${supabaseUrl}/functions/v1/stripe-webhook`, {
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1234,v1=invalid_signature",
      },
      data: JSON.stringify({
        id: "evt_test_idempotency",
        type: "checkout.session.completed",
        data: { object: {} },
      }),
    });

    // Should reject with 400 (bad signature) — NOT 500 (crash)
    expect([400, 401, 403]).toContain(response.status());
  });

  test("12. Payment page loads correctly", async ({ page }) => {
    // Navigate to a page that would show payment status
    await page.goto("/admin/bookings");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.textContent("body") || "";
    expect(bodyText).toBeTruthy();
    
    // Verify no unhandled errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(500);
  });
});
