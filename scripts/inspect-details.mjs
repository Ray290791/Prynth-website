import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const BASE = "http://127.0.0.1:8080";

  // Accept cookies first to get clean screenshots
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const acceptBtn = page.locator("button:has-text('Accept')").first();
  if (await acceptBtn.count() > 0) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }

  // 1. /custom
  console.log("Loading /custom...");
  await page.goto(`${BASE}/custom`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/audit/custom-desktop.png" });
  console.log("Saved custom-desktop.png");

  // Scroll down /custom to see options and pricing window
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/audit/custom-desktop-scrolled.png" });
  console.log("Saved custom-desktop-scrolled.png");

  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/audit/custom-desktop-bottom.png" });
  console.log("Saved custom-desktop-bottom.png");

  // 2. /custom mobile
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.goto(`${BASE}/custom`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await mobile.waitForTimeout(1500);
  const mAccept = mobile.locator("button:has-text('Accept')").first();
  if (await mAccept.count() > 0) {
    await mAccept.click();
    await mobile.waitForTimeout(300);
  }
  await mobile.screenshot({ path: "screenshots/audit/custom-mobile.png" });
  console.log("Saved custom-mobile.png");

  await mobile.evaluate(() => window.scrollBy(0, 600));
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: "screenshots/audit/custom-mobile-scrolled.png" });
  console.log("Saved custom-mobile-scrolled.png");

  // 3. Product page desktop scrolled
  await page.goto(`${BASE}/shop/catch-bowl`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshots/audit/product-top.png" });
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/audit/product-scrolled.png" });
  console.log("Saved product-scrolled.png");

  // 4. Admin Filaments and Printers tab
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1000);
  
  // Click Filaments tab
  const filTab = page.locator("button:has-text('Filaments')").first();
  if (await filTab.count() > 0) {
    await filTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshots/audit/admin-filaments-loaded.png" });
    console.log("Saved admin-filaments-loaded.png");

    // Click "Add Filament" if exists to inspect window/modal
    const addFilBtn = page.locator("button:has-text('Add Filament'), button:has-text('New Filament')").first();
    if (await addFilBtn.count() > 0) {
      await addFilBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "screenshots/audit/admin-add-filament-modal.png" });
      console.log("Saved admin-add-filament-modal.png");
      await page.keyboard.press("Escape");
    }
  }

  // Click Printers tab
  const printTab = page.locator("button:has-text('Printers')").first();
  if (await printTab.count() > 0) {
    await printTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshots/audit/admin-printers-loaded.png" });
    console.log("Saved admin-printers-loaded.png");

    // Click "Add Printer" if exists
    const addPrintBtn = page.locator("button:has-text('Add Printer'), button:has-text('New Printer')").first();
    if (await addPrintBtn.count() > 0) {
      await addPrintBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "screenshots/audit/admin-add-printer-modal.png" });
      console.log("Saved admin-add-printer-modal.png");
      await page.keyboard.press("Escape");
    }
  }

  // Click Custom Pricing Settings tab
  const pricingTab = page.locator("button:has-text('Pricing Settings'), button:has-text('Pricing')").first();
  if (await pricingTab.count() > 0) {
    await pricingTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "screenshots/audit/admin-pricing-loaded.png" });
    console.log("Saved admin-pricing-loaded.png");
  }

  await browser.close();
  console.log("Detailed screenshots captured successfully!");
}

run().catch(console.error);
