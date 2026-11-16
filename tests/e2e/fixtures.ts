import { test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";

export * from "@playwright/test";

// Browser tests act only on hydrated pages. On a busy CI machine a test could type into server HTML before React
// attached its handlers: a form then submitted natively (reloading the page) or a controlled input was reset, and the
// expected confirmation never came, in a different test each run. Every page load here waits for the app's
// `<html data-hydrated>` mark (HydrationMark); pages that aren't ours (CMS, Mailpit, JSON) don't wait.

const DONE = Symbol("hydration-wrapped");

/**
 * How long a page has been open before a test may act on it. Public forms refuse anything sent sooner than a person
 * could (FORM_LIMITS.minMs, 300 ms from page load, step 5.9); a fast CI run filled and sent the product question in
 * 246 ms. Tests wait like a person instead; the guard is unchanged.
 */
export const HUMAN_PACE_MS = 700;

/** Waits until one of our pages has hydrated and been open HUMAN_PACE_MS. Pages without `data-app` pass at once. */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(
    (pace) => {
      const html = document.documentElement;
      return html.dataset.app !== "h2india" || (html.dataset.hydrated === "1" && performance.now() >= pace);
    },
    HUMAN_PACE_MS,
    { timeout: 30_000 },
  );
}

function wrapPage(page: Page): Page {
  const marked = page as Page & { [DONE]?: true };
  if (marked[DONE]) return page;
  marked[DONE] = true;
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);
  const goBack = page.goBack.bind(page);
  Object.assign(page, {
    goto: async (...args: Parameters<Page["goto"]>) => {
      const response = await goto(...args);
      await hydrated(page);
      return response;
    },
    reload: async (...args: Parameters<Page["reload"]>) => {
      const response = await reload(...args);
      await hydrated(page);
      return response;
    },
    goBack: async (...args: Parameters<Page["goBack"]>) => {
      const response = await goBack(...args);
      await hydrated(page);
      return response;
    },
  });
  return page;
}

function wrapContext(context: BrowserContext): BrowserContext {
  const marked = context as BrowserContext & { [DONE]?: true };
  if (marked[DONE]) return context;
  marked[DONE] = true;
  for (const p of context.pages()) wrapPage(p);
  context.on("page", wrapPage);
  const newPage = context.newPage.bind(context);
  Object.assign(context, { newPage: async () => wrapPage(await newPage()) });
  return context;
}

let ipSeq = 0;

/**
 * A window a test opens itself (browser.newContext / newPage, for an operator or a phone) gets its own client IP, so
 * per-IP limits (sign-in, delivery codes, forms) never count other tests' requests. Only the header: a fresh window
 * still shows the cookie banner (consent-newsletter.spec.ts relies on that); ownIp() adds the cookie where wanted.
 */
async function ownWindowIp(context: BrowserContext): Promise<void> {
  ipSeq = (ipSeq + 1) % 250;
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${String(200 + (process.pid % 50))}.${String(ipSeq)}.${String(Math.floor(Math.random() * 250))}`,
  });
}

function wrapBrowser(browser: Browser): Browser {
  const marked = browser as Browser & { [DONE]?: true };
  if (marked[DONE]) return browser;
  marked[DONE] = true;
  const newContext = browser.newContext.bind(browser);
  const newPage = browser.newPage.bind(browser);
  Object.assign(browser, {
    newContext: async (...args: Parameters<Browser["newContext"]>) => {
      const context = await newContext(...args);
      if (!args[0]?.extraHTTPHeaders) await ownWindowIp(context);
      return wrapContext(context);
    },
    newPage: async (...args: Parameters<Browser["newPage"]>) => {
      const page = await newPage(...args);
      if (!args[0]?.extraHTTPHeaders) await ownWindowIp(page.context());
      wrapContext(page.context());
      return wrapPage(page);
    },
  });
  return browser;
}

export const test = base.extend({
  browser: [
    async ({ browser }, use) => {
      await use(wrapBrowser(browser));
    },
    { scope: "worker" },
  ],
  context: async ({ context }, use) => {
    await use(wrapContext(context));
  },
  page: async ({ page }, use) => {
    await use(wrapPage(page));
  },
});
