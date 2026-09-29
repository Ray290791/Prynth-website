import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const page = await context.newPage();
  
  // We can also test localhost or prynth.in
  console.log("Navigating to https://prynth.in...");
  await page.goto("https://prynth.in", { waitUntil: "networkidle" });
  
  const header = page.locator("header");
  const headerBox = await header.boundingBox();
  console.log("Header box:", headerBox);

  const menuButton = page.locator('header button[aria-label*="menu"]');
  const menuBox = await menuButton.boundingBox();
  console.log("Menu button box:", menuBox);

  if (menuBox) {
    console.log(`Menu button right edge: ${menuBox.x + menuBox.width}px (Viewport width: 375px)`);
    console.log(`Right margin/padding: ${375 - (menuBox.x + menuBox.width)}px`);
  }

  await page.screenshot({ path: "scratch/mobile-header-signedout.png" });
  console.log("Screenshot saved to scratch/mobile-header-signedout.png");

  await browser.close();
}

run().catch(console.error);
