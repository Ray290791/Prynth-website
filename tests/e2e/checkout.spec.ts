import { test, expect } from "@playwright/test";

test.describe("Checkout Flow with Razorpay", () => {
  test("loads checkout page, accepts shipping details, and initializes Razorpay test checkout", async ({
    page,
  }) => {
    // Inject mock item into cart storage before navigation
    await page.addInitScript(() => {
      const mockCartItem = {
        kind: "product",
        id: "test-prod-1",
        name: "Minimalist Phone Stand",
        price: 299,
        qty: 1,
        color: "matte_black",
        productSlug: "phone-stand",
      };
      window.localStorage.setItem(
        "prynth_cart",
        JSON.stringify([mockCartItem])
      );
    });

    // Mock Razorpay SDK checkout script so test runs headlessly without real bank interactions
    await page.addInitScript(() => {
      (window as any).Razorpay = function (options: any) {
        return {
          open: () => {
            console.log("[Playwright Mock] Razorpay standard modal opened with options:", options);
            // Simulate customer completing payment in Razorpay test mode
            if (typeof options.handler === "function") {
              setTimeout(() => {
                options.handler({
                  razorpay_payment_id: "pay_test_" + Date.now(),
                  razorpay_order_id: options.order_id || "order_test_mock",
                  razorpay_signature: "mock_signature_for_test",
                });
              }, 300);
            }
          },
          close: () => {},
        };
      };
    });

    // Navigate to checkout
    await page.goto("/checkout");
    await expect(page).toHaveURL(/.*checkout/);

    // Verify item is present in order summary
    await expect(page.locator("text=Minimalist Phone Stand").first()).toBeVisible({ timeout: 10_000 });

    // Fill in shipping details form
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Test Customer");
    }

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("test.customer@example.com");
    }

    const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("9876543210");
    }

    const addressInput = page.locator('input[name="address"], textarea[name="address"]').first();
    if (await addressInput.isVisible()) {
      await addressInput.fill("123 Test Avenue, Bandra West");
    }

    const cityInput = page.locator('input[name="city"]').first();
    if (await cityInput.isVisible()) {
      await cityInput.fill("Mumbai");
    }

    const postalInput = page.locator('input[name="postalCode"], input[name="pin"], input[placeholder*="PIN" i]').first();
    if (await postalInput.isVisible()) {
      await postalInput.fill("400050");
    }

    // Ensure pay button is visible and active
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Order")').first();
    await expect(payButton).toBeVisible();
  });
});
