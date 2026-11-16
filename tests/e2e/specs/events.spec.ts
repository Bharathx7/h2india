import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { signInNew } from "../helpers/join";
import { newEmail, ownIp } from "../helpers/sign-in";

// Step 5.7 DONE WHEN: an event submitted by a visitor appears in the Events queue with a reference and the
// confirmation email arrives; a full webinar shows the closed state and refuses registration (and the core test,
// registrations.int.test.ts); replays are visible only to registered, signed-in people; every form state can be
// reached. Each test makes its own records.

test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const tag = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const inDays = (d: number, hour = 15) => {
  const at = new Date(Date.now() + d * 86_400_000);
  at.setUTCHours(hour - 5, 30, 0, 0);
  return at.toISOString();
};

async function mailTo(page: Page, email: string, subject: RegExp): Promise<string | null> {
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const list = ((await res.json()) as { messages?: { Subject: string }[] }).messages ?? [];
    const hit = list.find((m) => subject.test(m.Subject));
    if (hit) return hit.Subject;
    await page.waitForTimeout(500);
  }
  return null;
}

async function seriousIssues(page: Page) {
  const axe = await new AxeBuilder({ page }).include("main").analyze();
  return axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

test("a visitor submits an event: errors, then a reference, the queue and the email", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await page.goto("/events/submit");
  await expect(page.getByRole("heading", { name: "Sign in to submit an event" })).toBeVisible();

  const email = newEmail("organiser");
  await signInNew(page, email);
  await page.goto("/events/submit");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/Fix \d+ things before you submit/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Enter the event title", { exact: true })).toBeVisible();

  // A logo that's too large is refused before upload (505:329), and nothing else is lost.
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "event-logo.png", mimeType: "image/png", buffer: Buffer.alloc(6 * 1024 * 1024) });
  await expect(page.getByText(/5 MB/).first()).toBeVisible();

  const t = tag();
  await page.getByLabel("Event title").fill(`Safe hydrogen storage workshop ${t}`);
  await page.getByLabel("Event type").selectOption("Workshop and training");
  await page
    .getByLabel("Description")
    .fill("A one-day workshop on safe hydrogen storage for plant engineers, with a visit to our test bay.");
  const day = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await page.getByLabel("Start date").fill(day);
  await page.getByLabel("End date").fill(day);
  await page.getByLabel("Venue and city").fill("Test facility, Ratnagiri");
  await page.getByRole("textbox", { name: "Organiser" }).fill("Konkan Test Works");
  await page.getByLabel("Ticket or registration link").fill("https://example.org/workshop");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, your event is under review" })).toBeVisible({
    timeout: 15_000,
  });
  const reference = (await page.getByText(/^EV-\d{4}-\d{4,}$/).textContent()) ?? "";
  expect(reference).toMatch(/^EV-\d{4}-\d{4,}$/);
  expect(
    await mailTo(page, email, new RegExp(`We've received your event: Safe hydrogen storage workshop ${t}`)),
  ).not.toBeNull();

  const editor = await browser.newContext();
  const ep = await editor.newPage();
  await signInOperator(ep, "Content editor");
  const queue = await cms(ep.request, "GET", `submissions?where[reference][equals]=${reference}`);
  expect((queue.body as unknown as { docs: { kind: string; status: string }[] }).docs[0]).toMatchObject({
    kind: "event",
    status: "Under review",
  });
  await editor.close();
});

test("a full webinar shows the closed state; registering sends the confirmation", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const created = await cms(page.request, "POST", "events", {
    _status: "published",
    name: `Sizing webinar ${t}`,
    organiser: "H2 India",
    eventType: "Webinar",
    attendance: "Online",
    startsAt: inDays(20),
    endsAt: inDays(20, 16),
    tickets: "Free",
    webinar: { capacity: 1, learn: [{ point: "How to size a stack" }], joinUrl: "https://example.org/meet" },
    sourceUrl: "https://example.org/webinar",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const slug = (created.body.doc as unknown as { slug: string }).slug;

  const a = await browser.newContext();
  await ownIp(a, info);
  const pa = await a.newPage();
  await pa.goto(`/events/${slug}`);
  expect(await seriousIssues(pa)).toEqual([]);
  const email = newEmail("attendee");
  await pa.getByPlaceholder("Your full name").fill("Ravi Kulkarni");
  await pa.getByPlaceholder("name@company.in").fill(email);
  await pa.getByPlaceholder("Your company, lab or agency").fill("Greenfield Hydrogen");
  await pa.getByRole("button", { name: "Register" }).click();
  await expect(pa.getByRole("heading", { name: "You're registered" })).toBeVisible({ timeout: 15_000 });
  await expect(pa.getByRole("link", { name: /Apple \(\.ics\)/ })).toHaveAttribute(
    "href",
    new RegExp(`/events/${slug}/ics$`),
  );
  expect(await mailTo(pa, email, /^You're registered: Sizing webinar/)).not.toBeNull();
  await a.close();

  // The one seat is taken: the next visitor sees the closed state with the replay form.
  const b = await browser.newContext();
  await ownIp(b, info);
  const pb = await b.newPage();
  await pb.goto(`/events/${slug}`);
  await expect(pb.getByText("Registration closed")).toBeVisible();
  await expect(pb.getByText("Full", { exact: true })).toBeVisible();
  await expect(pb.getByRole("button", { name: "Register" })).toHaveCount(0);
  await submitOnceHydrated(pb, newEmail("late"), "Email me the replay");
  await b.close();

  const ics = await page.request.get(`/events/${slug}/ics`);
  expect(await ics.text()).toContain(`SUMMARY:Sizing webinar ${t}`);
});

test("a replay opens only for people who registered and are signed in", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  await signInOperator(page, "Content editor");
  const t = tag();
  const created = await cms(page.request, "POST", "events", {
    _status: "published",
    name: `PESO replay ${t}`,
    organiser: "H2 India",
    eventType: "Webinar",
    attendance: "Online",
    startsAt: inDays(-10),
    endsAt: inDays(-10, 16),
    webinar: {
      replay: {
        url: "https://example.org/replay.mp4",
        minutes: 48,
        chapters: [{ at: "00:00", title: "Who needs approval" }],
      },
    },
    sourceUrl: "https://example.org/peso",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const slug = (created.body.doc as unknown as { slug: string }).slug;

  const visitor = await browser.newContext();
  await ownIp(visitor, info);
  const pv = await visitor.newPage();
  await pv.goto(`/events/${slug}`);
  await expect(pv.getByRole("heading", { name: "Enter your work email to watch" })).toBeVisible();
  await expect(pv.locator("video")).toHaveCount(0);
  await visitor.close();

  const member = await browser.newContext();
  await ownIp(member, info);
  const pm = await member.newPage();
  const email = newEmail("replay");
  await signInNew(pm, email);
  await pm.goto(`/events/${slug}`);
  await expect(pm.locator("video")).toHaveCount(0);
  await submitOnceHydrated(pm, email, "Watch the replay");
  await pm.reload();
  await expect(pm.locator("video source")).toHaveAttribute("src", "https://example.org/replay.mp4");
  await member.close();
});

test("corrections and pitches need no account; a dropped connection keeps the answers", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/legal/corrections/suggest?page=/news/some-story");
  await expect(page.getByLabel("Page")).toHaveValue("/news/some-story");
  await page.getByLabel("What is wrong").fill("The capacity is given as 60,000 t/yr.");
  await page.getByLabel("Correct information").fill("It is 50,000 t/yr.");
  await page.getByLabel("Source link").fill("https://example.org/notice");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Send correction" }).click();
  await expect(page.getByText("We couldn't send your form")).toBeVisible({ timeout: 15_000 });
  await page.context().setOffline(false);
  await expect(page.getByLabel("What is wrong")).toHaveValue("The capacity is given as 60,000 t/yr.");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, we've received your correction" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/^COR-\d{4}-\d{4,}$/)).toBeVisible();

  await page.goto("/knowledge/insights/write");
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByText("Declare any conflict, or tick I have nothing to declare").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByPlaceholder("Your full name").fill("Meera Pillai");
  await page.getByPlaceholder("you@example.com").fill(newEmail("writer"));
  await page.getByLabel("Affiliation").fill("Independent");
  await page.getByPlaceholder("One line: what's the story?").fill("What green ammonia buyers price in");
  await page
    .getByLabel("Outline")
    .fill("Three points on offtake terms, delivery risk and certificates, and why buyers care.");
  await page.getByRole("checkbox", { name: "I have nothing to declare" }).click();
  await page.getByRole("button", { name: "Send pitch" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, your pitch is with our editors" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/^WFU-\d{4}-\d{4,}$/)).toBeVisible();
});

test("events list, calendar and states", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { level: 1, name: "Hydrogen events in India" })).toBeVisible();
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page.getByRole("columnheader", { name: "Mon" })).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);
  for (const state of ["loading", "error", "empty"]) {
    await page.goto(`/events?view=${state}`);
    if (state === "loading") await expect(page.locator("[aria-busy=true]").first()).toBeVisible();
    if (state === "error") await expect(page.getByText(/We couldn’t load events/)).toBeVisible();
    if (state === "empty") await expect(page.getByText(/No events (match these filters|listed yet)/)).toBeVisible();
  }
});

/** The replay email box is a controlled input: text typed before the page hydrates is reset, and the empty form is
 * refused. Fill and submit until the confirmation shows (never twice once it has). */
async function submitOnceHydrated(p: Page, email: string, button: string) {
  const sentText = p.getByText(/we've sent the replay link/);
  await expect(async () => {
    if (await sentText.isVisible()) return;
    await p.getByPlaceholder("name@company.in").fill(email);
    await p.getByRole("button", { name: button }).click();
    await expect(sentText).toBeVisible({ timeout: 4_000 });
  }).toPass({ timeout: 30_000 });
}
