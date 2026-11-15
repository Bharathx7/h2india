import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

// Step 12.5: Largest Contentful Paint, layout shift and interaction latency for the main page types, on a mid-range
// Android profile: 4G (9 Mbit/s down, 1.5 up, 150 ms) and the CPU slowed four times. Targets are the playbook's
// defaults until M13: LCP 2.5 s, CLS 0.1, interaction 200 ms. Pages with a parameter are found from their hub.

const TARGET = { lcp: 2500, cls: 0.1, inp: 200 };

const PAGES: { name: string; path: string | (() => Promise<string>) }[] = [
  { name: "Home", path: "/" },
  { name: "News article", path: "first:/news:/news/" },
  { name: "Category listing", path: "first:/marketplace:/marketplace/" },
  { name: "Product page", path: "first:/search?q=a:/marketplace/products/" },
  { name: "Scheme detail", path: "first:/opportunities/schemes:/opportunities/schemes/" },
  { name: "Tender listing", path: "/opportunities/tenders" },
];

const results: Record<string, { lcp: number; cls: number; inp: number }> = {};

for (const p of PAGES) {
  test(p.name, async ({ page, context }) => {
    test.setTimeout(120_000);
    let path = p.path as string;
    if (path.startsWith("first:")) {
      const [, hub, prefix] = path.split(":");
      await page.goto(hub ?? "/");
      const href = await page
        .locator(`main a[href^="${prefix ?? ""}"]`)
        .evaluateAll(
          (as, pre) =>
            as
              .map((a) => a.getAttribute("href") ?? "")
              .find((h) => h.split("/").length > pre.split("/").length - 1 && h !== pre),
          prefix,
        );
      test.skip(!href, `No link to a ${p.name} on ${hub ?? ""}`);
      path = href ?? "/";
    }
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (9 * 1024 * 1024) / 8,
      uploadThroughput: (1.5 * 1024 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const w = window as unknown as { __v: { lcp: number; cls: number; inp: number } };
      w.__v = { lcp: 0, cls: 0, inp: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__v.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
          if (!e.hadRecentInput) w.__v.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__v.inp = Math.max(w.__v.inp, e.duration);
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    // One interaction: open the menu or focus search, whichever the page has.
    const button = page.getByRole("button").first();
    if (await button.isVisible()) await button.click({ trial: false }).catch(() => undefined);
    await page.waitForTimeout(1000);
    const v = await page.evaluate(() => (window as unknown as { __v: { lcp: number; cls: number; inp: number } }).__v);
    results[`${p.name} (${path})`] = v;
    expect.soft(v.lcp, "LCP").toBeLessThanOrEqual(TARGET.lcp);
    expect.soft(v.cls, "CLS").toBeLessThanOrEqual(TARGET.cls);
    expect.soft(v.inp, "interaction").toBeLessThanOrEqual(TARGET.inp);
  });
}

test.afterAll(() => {
  mkdirSync("../../test-results/perf", { recursive: true });
  writeFileSync("../../test-results/perf/vitals.json", JSON.stringify(results, null, 2));
});
