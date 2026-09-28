import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("screenshots/audit", { recursive: true });

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 },
  });

  const BASE = "http://127.0.0.1:8080";
  const routes = [
    { name: "01-home", url: `${BASE}/` },
    { name: "03-shop", url: `${BASE}/shop` },
    { name: "05-custom", url: `${BASE}/custom` },
    { name: "06-materials", url: `${BASE}/materials` },
    { name: "07-cart", url: `${BASE}/cart` },
    { name: "08-checkout", url: `${BASE}/checkout` },
    { name: "09-admin", url: `${BASE}/admin` },
  ];

  for (const r of routes) {
    try {
      console.log(`Loading ${r.url}`);
      await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `screenshots/audit/${r.name}.png` });
      console.log(`Saved screenshots/audit/${r.name}.png`);
    } catch (e) {
      console.error(`Error loading ${r.name}:`, e.message);
    }
  }

  // Check auth modal
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    // Find sign in / account button in header
    const headerBtns = page.locator("header button");
    const count = await headerBtns.count();
    console.log(`Header buttons count: ${count}`);
    // Click account button or avatar
    const accountBtn = page.locator("button[aria-label*='account' i], button:has(svg.lucide-user), button:has-text('Sign In')").first();
    if (await accountBtn.count() > 0) {
      await accountBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "screenshots/audit/02-auth-modal.png" });
      console.log("Saved screenshots/audit/02-auth-modal.png");
    }
  } catch (e) {
    console.error("Auth modal error:", e.message);
  }

  // Check product page
  try {
    await page.goto(`${BASE}/shop`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    const prodLink = page.locator("a[href^='/shop/']").first();
    if (await prodLink.count() > 0) {
      const href = await prodLink.getAttribute("href");
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "screenshots/audit/04-product.png" });
      console.log("Saved screenshots/audit/04-product.png");
    }
  } catch (e) {
    console.error("Product page error:", e.message);
  }

  // Admin tabs
  try {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    const tabs = ["Filaments", "Printers", "Pricing Settings", "Inquiries", "Payment Options"];
    for (const t of tabs) {
      const btn = page.locator(`button:has-text('${t}')`).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(600);
        const slug = t.toLowerCase().replace(/\s+/g, "-");
        await page.screenshot({ path: `screenshots/audit/09-admin-${slug}.png` });
        console.log(`Saved screenshots/audit/09-admin-${slug}.png`);
      }
    }
  } catch (e) {
    console.error("Admin tabs error:", e.message);
  }

  await browser.close();
  console.log("Audit complete!");
}

run().catch(console.error);
