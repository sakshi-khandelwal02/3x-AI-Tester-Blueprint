import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.SCREENSHOT_BASE_URL || "https://workpulse-delta-eight.vercel.app";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "screenshots");

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "light",
});
const page = await context.newPage();

async function capture(name, waitMs = 2000) {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`Captured ${name}.png`);
}

await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
await capture("01-home");

await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await capture("02-signin");

await page.fill("#email", "demo@workpulse.app");
await page.fill("#firstName", "Alex");
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

const current = page.url();
if (current.includes("/profile")) {
  await capture("03-profile");
  const demoButton = page.getByRole("button", { name: /Use Demo Profile/i });
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
    await page.waitForTimeout(3000);
  }
  const next = page.getByRole("button", { name: /Confirm Profile|Continue|Next/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(2000);
  }
} else {
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await capture("03-profile");
  const demoButton = page.getByRole("button", { name: /Use Demo Profile/i });
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
    await page.waitForTimeout(3000);
  }
}

await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await capture("04-dashboard", 2500);

await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
const searchButton = page.getByRole("button", { name: /Search Jobs/i });
if (await searchButton.isEnabled().catch(() => false)) {
  await searchButton.click();
  await page.waitForTimeout(6000);
}
await capture("05-jobs-discovery", 1500);

const jobCard = page.locator('a[href^="/jobs/"]').first();
if (await jobCard.isVisible().catch(() => false)) {
  await jobCard.click();
  await page.waitForTimeout(5000);
  await capture("06-job-detail", 1500);
}

await page.goto(`${BASE}/applications`, { waitUntil: "networkidle" });
await capture("07-applications", 2000);

await page.goto(`${BASE}/skills`, { waitUntil: "networkidle" });
await capture("08-skills", 2000);

await browser.close();
