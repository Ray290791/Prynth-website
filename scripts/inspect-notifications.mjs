import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to /admin?tab=notifications...");
  await page.goto("http://127.0.0.1:8080/admin?tab=notifications", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "screenshots/audit/admin-notifications-tab.png", fullPage: true });
  console.log("Saved admin-notifications-tab.png");

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshots/audit/admin-notifications-mobile.png", fullPage: false });
  console.log("Saved admin-notifications-mobile.png");

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
