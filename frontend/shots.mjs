import { chromium } from "playwright";

const OUT = "/tmp/claude-1000/-home-gokul-smartgrids/d4165e21-ea6d-4fe4-a99f-7b44dadaa9b6/scratchpad";
const targets = [
  { name: "home-mobile", url: "http://localhost:3000/", w: 390, h: 844 },
  { name: "shop-mobile", url: "http://localhost:3000/shop", w: 390, h: 844 },
  { name: "pdp-mobile", url: "http://localhost:3000/product/131bd7ab-a332-43ca-a003-d6ec0d650f0d", w: 390, h: 844 },
  { name: "home-desktop", url: "http://localhost:3000/", w: 1440, h: 900 },
  { name: "shop-desktop", url: "http://localhost:3000/shop", w: 1440, h: 900 },
];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.w, height: t.h } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${t.name}.png`, fullPage: false });
  // full page too for layout overflow inspection
  await page.screenshot({ path: `${OUT}/${t.name}-full.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`${t.name}: h-overflow=${overflow}px, console-errors=${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log(`   ERR: ${e.slice(0, 200)}`));
  await page.close();
}
await browser.close();
