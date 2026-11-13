# CLAUDE.md: H2 India

H2 India is India's hydrogen ecosystem platform: a marketplace (quotes; prices only on fixed-price product pages), a company directory, news and insights, schemes, tenders, grants, jobs, knowledge, the India Hydrogen Tracker and events. It has buyer, supplier, member and admin workspaces.

The design is the Figma file **hydrogen** (key `swxSe4zWyngLYdZ2Qe9CWJ`). The build follows `docs/playbook.pdf`, one step at a time.

## Before any work

1. Read `docs/progress.md` (which step we are on) and `docs/decisions.md` (open items and answers).
2. Find the step in `docs/playbook.pdf` and the frames in `docs/figma-index.md`.
3. **Plan first.** List the Figma frames you will read, the files you will touch and your questions. Then wait for approval.
4. Fetch every frame you build through the Figma MCP tools. Never build a screen from memory or from a description.

## Never

- Invent a price, threshold, date, tax figure or legal wording. If a decision is **Open** in `docs/decisions.md`, build the safe default behind a setting and write `OPEN: <ID>` in the pull request.
- Read, print or commit secrets (`.env*` other than `.env.example`). Never put real data in tests or seeds.
- Change the existing colours or add hex values in components. Use the tokens in `packages/ui`.
- Build from Figma page 20 (Archive) or page 18 (prototype copies).
- Skip, delete or weaken a test or lint rule to make a build pass.
- Show a price on cards, search, filters, compare or listing tables.
- Merge or push to `main` without the founder's approval.

## Commands

| What                         | Command                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Install                      | `pnpm install`                                                                                        |
| Local services (Docker)      | `cp .env.example .env.local` once, then `pnpm dev:up`, `pnpm health`, `pnpm dev:down`                 |
| Web app                      | `pnpm dev` (http://localhost:3000)                                                                    |
| Worker                       | `pnpm dev:worker`                                                                                     |
| All checks                   | `pnpm check` (types, lint, format)                                                                    |
| Unit tests                   | `pnpm test`                                                                                           |
| Browser tests                | `pnpm e2e` (app running), or `E2E_START_SERVER=1 pnpm e2e` after `pnpm build`                         |
| Build                        | `pnpm build`                                                                                          |
| Sample data (local, staging) | `pnpm db:seed`; set `FLAG_SAMPLE_CONTENT=true` to see it                                              |
| Bulk import                  | `pnpm import:<type> <file.csv\|file.json>` checks; add `--apply` to write (`docs/runbooks/import.md`) |

## Layout

- `apps/web`: Next.js App Router. Route groups `(site)` public, `(auth)`, `(buyer)`, `(supplier)`, `(member)`, `(admin)`.
- `apps/worker`: queues, clocks, imports and indexing.
- `packages/ui`: tokens and components (Figma pages 01 and 02).
- `packages/core`: **all business rules.** Pages call core and never hold rules.
- `packages/db`: schema and migrations. **Only `packages/core` may import it** (lint enforces this).
- `packages/emails`: email, WhatsApp and SMS templates (Figma page 16).
- `packages/config`: typed settings (`env.ts`) and feature flags (`flags.ts`).
- `tests/e2e`: Playwright flows A to J at 1440 and 390.
- `docs/`: playbook, decisions, progress, ADRs, runbooks.

## Database (Stage 3)

- `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset` (local only), `pnpm db:generate`. Conventions in `docs/database.md`.
- Money is bigint paise and goes through `Money`; status changes go through `changeStatus()`; important actions call `audit()`.
- Never edit an applied migration. Destructive SQL needs `-- destructive-ok: <reason>`.

## Design rules (Stage 2)

- Colours, type, radius, shadows only from the Figma tokens: classes like `text-primary`, `bg-accent`, `type-h1`. No hex codes; `pnpm lint` fails on them. See `docs/design-tokens.md`.
- Never change a token value in code. If a value looks wrong (contrast, size), raise it; the designer changes Figma.
- Green fills (`bg-accent`) take ink text, never white.
- Every list or panel that loads data shows loading, empty and error states (step 2.5).

## Sign-in (step 3.2)

- The one Better Auth setup is `packages/core/src/sign-in/auth.ts`; the web app adds only its cookie plugin (`apps/web/src/server/auth.ts`). Our extra rules (pause, per-email limits, tries left) are hooks in `hooks.ts`.
- Numbers live in `SIGN_IN` (`@h2india/core/sign-in`, decision A2). Never repeat them in pages.
- After sign-in, send people only to `safeReturnPath(next)`.
- Browser tests read sign-in codes from Mailpit (`MAILPIT_URL`) and give each test its own IP with `ownIp()` (`tests/e2e/helpers/sign-in.ts`), so per-IP limits do not leak between tests.
- A test that needs an existing person signs in with `signInExisting()` (`tests/e2e/helpers/rfq.ts`), which waits out the passkey offer and the redirect; rows inserted by SQL give `id` with `gen_random_uuid()` (ids are made in the app, not by the database).

## Authorisation (step 3.4)

- Decide permissions only with `can(actor, permission, { organisationId })` from `@h2india/core/authz`; load the actor per request with `loadActor()`.
- Every read of a company-owned table takes a `Scope` from `scopeFor(actor)` as its first argument and filters with `inScope()`.
- Every new company-owned record type adds a case to `packages/core/src/authz/authz.int.test.ts` (company B cannot read or change company A's record).
- Roles and permissions are data. To change the defaults, edit `authz/catalogue.ts`, then generate a new seed migration with `scripts/authz-seed.ts`.

## Audit log (step 3.6)

- Every status change, permission or role change, setting change, money action and admin action calls `audit()` in the same transaction as the change, with before and after values and a reason where the design asks for one.
- In the web app, pass `await requestContext()` (`apps/web/src/server/request-context.ts`) so the entry gets the IP, user agent and request ID.
- `mask()` hides secrets and codes fully and keeps the last four of bank, card, PAN and mobile numbers; name fields so it recognises them (`accountNumber`, `mobile`, `code`).
- Settings: declare with `defineSetting()` and change only with `setSetting()` (needs `settings.edit`, audited). Feature flags stay in `packages/config`.
- Never write to `core.audit_log` except through `audit()`; never set `h2.audit_retention` outside `pruneAuditLog()`.

## Files (step 3.7)

- Upload only through `startUpload` → browser PUT to the signed quarantine link → `completeUpload` → worker `processFile`. Never accept file bytes in a page or API route, and never serve a file through the app. On the server, storage shares the public domain under the bucket paths (only two domains); nginx gives those paths nosniff and a script-blocking CSP (`infra/nginx/h2india.conf`), so keep them.
- A file is usable only when `status = 'Available'`. Open it only with `fileLink()` (permission check, 5-minute link); add who may read a new kind to `files/rules.ts` with least access.
- Limits and types per kind live in `packages/config/src/files.ts` (A20); show the same messages in the browser with `checkFile()` and `uploadProblemMessage()`.
- A record that holds a file attaches it with `attachFile()` and sets retention with `scheduleFileDeletion()` where a decision asks for it (Work ID: A22).

## Clocks and jobs (step 3.8)

- Every timer is a deadline in `core.deadlines`, started with `startClock()` from a named clock in `packages/config/src/clocks.ts` (A24). Never compute a due date by hand, and never keep a deadline only in the queue.
- Working days come from `workingCalendar()` (IST, Monday to Saturday minus `core.holidays`, M18).
- React to a deadline with `onDeadline(type, handler)`; the handler runs inside the claim's transaction, so anything it sends must be idempotent (queue a job with a stable job ID).
- New background work goes on a queue from `QUEUES` through `enqueue()`; job data never holds secrets (it is kept, masked, in the dead-letter list). Housekeeping goes in `queue/schedule.ts`.

## Notifications (step 3.9)

- Send every message through `packages/core/src/notify`: `notify()` for a person (checks their choices, quiet hours and unsubscribe; email, WhatsApp, in-app), `deliverEmail` and `deliverSms` for codes and links. Never call the mail transport directly.
- Register each template in `packages/emails/src/registry.ts` with its frame and key before using it; SMS and WhatsApp wording lives only in `APPROVED_TEXT` and must match the approved template exactly.
- Mark codes, sign-in links and confirmation links `security: true` (security sender, never stored, never retried).
- A new kind of notification picks a topic in `notify/topics.ts`; add one only with the defaults from its design.

## Content (Stage 4)

- Content lives in Payload (`apps/web/src/payload.config.ts`, collections in `apps/web/src/cms`), tables in the `cms` schema. Editors use /cms with their H2 India account; access comes from operator permissions (`content.view/edit/delete/publish`) via `cms/auth-strategy.ts`.
- After changing a collection: `pnpm --filter @h2india/web cms:migration <name>` (then mark the generated `MigrateUpArgs`/`MigrateDownArgs` imports as `type`), `pnpm --filter @h2india/web cms:types`, and commit the migration, `payload-types.ts` and the import map.
- An article type's label (Sponsored, Press release) comes from `cms/types.ts`, never a free field. Publishing rules live in the collection hooks, not the UI.
- Change an article's status only with `transitionArticle()` (`cms/workflow.ts`); it checks the rule and permission and writes the audit log. Direct publishing is refused.
- Read content in server code through Payload's Local API (`getPayload({ config })`), never by SQL on the cms schema.
- Show an article body with `ArticleBody` and pass `glossary={await glossaryTerms(payload)}`: glossary hover-cards are linked automatically (first mention only), never by hand.
- Tracker records (`cms/tracker`) always carry a source, its type and an as-of date. Recent changes are written by the collection hook when a record is published; never write `tracker-changes` by hand. The status field is `stage`.
- Report PDFs are private; readers get them only through `requestReport()` (`cms/knowledge/gate.ts`), which records the lead and consent. Report leads are personal data (A33).

## Search (step 5.2)

- The Meilisearch indexes are a copy; the database is the truth. Index definitions and synonyms live in `packages/core/src/search/indexes.ts`; only `packages/core/src/search/client.ts` talks to the engine.
- Every change reaches search through `core.search_outbox`, written in the same transaction as the record change: CMS collections spread `searchHooks` (`apps/web/src/search/hooks.ts`) into their hooks; core code calls `queueIndexChange(tx, …)`. Never write to an index directly from a page or hook.
- A new content type adds its index to `SEARCH_INDEXES`, its collection to `COLLECTION_INDEX` and its document builder to `apps/web/src/search/documents.ts`. Documents are built only from what readers may see (`publicWhere()`), never drafts or company-private data.
- No price in search: product documents are made only with `productDocument()`, which keeps the allowed fields and throws on a price. Don't add price-like fields to any index.
- Log a search with no results only when it is finished (the /search page, or Enter in the overlay), with `logSearchMiss()`; never store who searched.
- Integration tests need `TEST_MEILI_MASTER_KEY` and use their own prefixed indexes (`SEARCH_INDEX_PREFIX`). Runbook: `docs/runbooks/search.md`.

## Newsroom (step 5.3)

- Public newsroom reads go through `apps/web/src/news/data.ts`: every read is cached under `NEWS_TAG`, and the collections that feed the newsroom spread `newsroomHooks` (`cms/newsroom.ts`) so a save refreshes the cache. A new collection the newsroom shows needs both.
- Pure formatting (IST times, eyebrows) lives in `news/format.ts` and structured data in `news/jsonld.ts`, so they're unit-tested without the CMS. Web unit tests import with relative paths, not `@/`.
- A topic with an `order` is a news section. Article slugs can't be a section's or a word in `RESERVED_NEWS_SLUGS` (checked in a save hook, because Payload skips validation for drafts).
- A published article changes only through the workflow; the one exception is the `live-update` action, which publishes the live explainer block alone (A61).
- Every `<main>` on a newsroom page carries `[&_:is(h1,h2,h3)]:text-wrap`, so headings wrap as drawn rather than balanced. Runbook: `docs/runbooks/news.md`.

## Schemes and states (step 5.4)

- Eligibility rules are data on each scheme (`eligibilityRules`, CMS group in `cms/records/eligibility.ts`); the matching is `matchSchemes()` in `@h2india/core/schemes`. A scheme counts only when an editor ticks "Rules checked". Never write criteria in code or seeds (M25).
- Scheme statuses: `schemeStatus()` with `SCHEME_STATUS_OVERRIDES` (Announced, Results declared, Next round expected, Closed); otherwise the deadline decides.
- Tenders link to schemes (`schemes` relationship); scheme pages and the SIGHT tracker read related tenders from it. The SIGHT tracker's figures, rounds and awardees are the `sight-tracker` global.
- The schemes hub uses `?state=` as a filter, so its designed states are forced with `?view=loading|error|empty`.
- Newsroom reads are cached by `news/data.ts`; when a filter's meaning changes, bump `CACHE_VERSION` there so old entries aren't served.

## Tenders, grants and jobs (step 5.5)

- Public reads go through `apps/web/src/opportunities/data.ts`; filters, labels and JobPosting data are pure in `opportunities/views.ts` (unit-tested). Tables and cards read the same filtered list.
- Statuses only from `tenderStatus()`, `grantStatus()` and `jobStatus()` in `cms/records/status.ts`; "days left" only from `daysLeft()` (`@h2india/core/time`, re-exported by `opportunities/views.ts`; India calendar days).
- Job posting rules (options, limits, closing date) live in `@h2india/core/opportunities` (`/rules` for client code). A posted job is saved only by `saveJobPost()` in `opportunities/posting.ts`: always a draft, for a company the person belongs to, never Featured (A69). An editor publishing it is the approval.
- Create alert, Track and Save go to `/member/alerts` or `/member/saved` through `memberHref()` (sign-in first when signed out) until step 7.3 (A71).

## Knowledge and tracker pages (step 5.6)

- Public reads: `apps/web/src/knowledge/data.ts` and `apps/web/src/tracker/data.ts` (published only, samples only where shown). Tracker sub-views are configured once in `tracker/views.ts` (filters, tiles, chart, columns); the page, its CSV and the tests use the same config, and every CSV row carries its source and as-of date.
- Video and audio play only through `@h2india/core/media` (M9): no third-party embeds or player scripts until the host is chosen.
- Gated reports record the consent words and `CONSENT_VERSION` (`cms/knowledge/gate.ts`); bump the version whenever the words change.
- A guide with product categories is a buyer's guide (`/knowledge/guides/<slug>`); the Insights page redirects it there.
- Links inside a sentence are underlined (axe "link-in-text-block"); colour alone isn't enough.

## Events, webinars and submissions (step 5.7)

- Webinar registrations live in `core.webinar_registrations`; register only through `registerForWebinar()` (`@h2india/core/events`): it counts seats under a lock, stores the consent words and version, and starts the reminder deadline.
- Reminders: the deadline engine fires (`events/reminders.ts`, registered by the schedule), the handler only queues a notify job with a stable id, the worker calls `/api/internal/notify-job`, and `claimReminder()` makes each reminder go at most once. Don't send reminders any other way.
- Join and replay links in emails are signed with `registrationToken()`; a replay shows only to a registered, signed-in person or through that link.
- Public forms post through `submitContent()` (`apps/web/src/submissions/actions.ts`): checks in `@h2india/core/events/rules`, a reference (EV-, PR-, COR-, WFU-), the Submissions queue, the audit log and Submission received. Events and press releases need an account.
- Messages whose templates live in `@h2india/emails` are sent from core (`notify/events.ts`); the web app doesn't import the emails package.

## Company, trust, legal and help (step 5.8)

- Company details, the grievance officer, About and audience figures live in the CMS setting Company and legal details (`trust-settings`); read them only through `trustDetails()` (`apps/web/src/trust/data.ts`), which returns the design's `[placeholders]` until M2 is entered. Never write a name, address or legal text in a page.
- Legal pages are `legal-pages` records (version, last updated, sections, history), published by an Editor-in-chief; render them with `LegalDocument`. Without a published version the page says it's being finalised.
- Prices on Pricing come only from the `pricing` setting (C1, C3, M16); `pricing()` returns null for hidden samples and each section has a being-finalised state.
- Grievances go through `raiseGrievance()` and `moveGrievance()` (`@h2india/core/grievances`): GRV reference, two clocks, status changes through `changeStatus()`. The status lookup needs the ticket and the email together (`findGrievance()`) and returns only the steps.
- Contact, partnership and advertising forms post through `submitContent()` like step 5.7 (CON-, PE-, ADV-).
- Scrollable table wrappers need `tabIndex={0}`, `role="region"` and a label (axe "scrollable-region-focusable").

## Newsletter, consent and form protection (step 5.9)

- Every public form calls `checkForm()` (`@h2india/core`) on the server before saving, and sends `guard()` from `useFormGuard()` (`apps/web/src/lib/form-guard.tsx`) with its `{trap}` rendered inside the form. A new public form does both.
- Cookie choices live in the `h2_consent` cookie (`@h2india/core/consent/cookies`); read them with `useCookieChoice()`. Load nothing that tracks people except through `Analytics`, which needs consent and skips operators. Bump `COOKIE_CONSENT_VERSION` when the categories or banner words change.
- Newsletter mail carries `unsubscribeHeaders()`; unsubscribing goes only through `unsubscribe()` (one-click POST or the confirm page).
- Browser tests start as a returning visitor who rejected optional cookies (`ownIp()` sets the cookie); `consent-newsletter.spec.ts` tests the banner from a fresh context.

## Search engines, errors and maintenance (step 5.10)

- Indexing stays off until Launch 1: the `searchIndexing` flag drives robots.txt and meta robots. Don't add `robots` to page metadata.
- Every public page sets `alternates.canonical`. Absolute URLs come from `absolute()` (`apps/web/src/seo/site.ts`).
- A new public content type adds its collection and URL to `COLLECTIONS` in `apps/web/src/seo/sitemaps.ts`.
- Structured data goes through `JsonLd` (`apps/web/src/seo/jsonld.tsx`); breadcrumbs get BreadcrumbList from `Crumbs` automatically. Only facts the page shows.
- Redirects live in `apps/web/src/seo/redirects.json` (301, followed by `seo.spec.ts`); every target must be a real page.
- Unknown addresses render `app/global-not-found.tsx`; a missing record calls `notFound()`. Public errors render `(site)/error.tsx` with the digest as the reference, logged with the request ID by `instrumentation.ts`.

## Catalogue (step 6.1)

- Classes, categories, sub-categories, applications and attribute schemas are data in `core.catalogue_*`; change them only through `@h2india/core/catalogue/taxonomy` (checks `catalogue.edit`, audits, writes the change history). The launch catalogue is migration 0022 (A103); never write categories or attributes in pages or seeds except the sample ones in `catalogue/samples.ts`.
- Check product attribute values only with `checkAttributeValues()` / `schemaFor()` from `@h2india/core/catalogue/attributes`, built from `categorySchema()`. Filters use `filterable`, compare and the table view `comparable`, the spec table `displayGroup` and order.
- An attribute's key never changes. Type and unit can't change, and the attribute can't be removed, once products use it (`productsUsingAttribute()`, filled in at step 8.3, A107).
- Product search documents keep attribute values under `attributes` (already filterable), so a new filterable attribute needs no index change.
- A scrolling table that holds Radix checkboxes needs `relative` on its scroll box, or their hidden inputs widen the page on phones.

## Marketplace pages (step 6.2)

- Public catalogue reads go through `apps/web/src/marketplace/data.ts` (`catalogue()` = `publicCatalogue()`: no hidden categories, sample only with the flag); addresses and count words are pure in `marketplace/views.ts`. Home tiles and the Marketplace menu (`menusWithCatalogue()`) read the same data.
- Product counts are live listings only and are left out while they are 0 (A109). Never show a frame's sample counts.
- Application pages are one template; their words and figures are the `application-pages` CMS collection (figures need a source and as-of date). Categories join applications in admin Catalogue.
- Server pages use `LiveSection` (`components/LiveSection.tsx`) instead of `AsyncSection`, so the error state has Try again.

## Products and listings (step 6.3)

- Products live in `core.products` (A115). Public reads go through `listProducts()` (`@h2india/core/products`): live, non-sample unless the flag is on, filtered and counted in the database (A114). A company's own products only through `listCompanyProducts(scope)`.
- Listing state is the address: `parseListing()` and `listingSearch()` in `@h2india/core/products/rules`. Filters come only from the category's filterable attributes (`effectiveSchema()`: parent's attributes, then the sub-category's).
- The price rule is `canShowPrice()`: only the product page, for a fixed-price item (its price) or an indicative item (the supplier's range, A141). `ProductCard`, listing rows and `ProductCard` data have no price at all; the database refuses a price on a quote-only product.
- Product search documents come only from `productSearchDocuments()`; any change to a product, its category or its supplier queues it in the same transaction (`queueIndexChange(tx, "products", …)` or `queueProductsOf()`).
- Compare selection: `useCompare()` (`marketplace/compare.ts`), up to `COMPARE_LIMIT`.
- The product page reads `productDetail()`; its price comes only from there (`canShowPrice`, GST from the supplier's rate). Add to cart and Buy now render only when `isEnabled("transactions")`.
- Ask a question and Report this listing go through `askQuestion()` and `reportListing()` after `checkForm()`.
- Services are products in the Services class with `service` details; a paused service stays visible and can't take a request. Compare: `compareProducts()` (one category, no price). Brands: `@h2india/core/brands`; a dealer is Verified only through `recordDealerEvidence()` while the letter is valid.

## Directory (step 6.6)

- Companies: `directoryEntries()` and the pure `filterDirectory()` (`@h2india/core/directory`); list and map read the same result. Maps only through `MapView` (`packages/ui`) with a provider adapter; until M7 there is no provider and the list by state shows.
- People are the `people` CMS collection and are read only with `consentRecorded` (M24); never show a person's email or phone, and keep person pages out of the sitemap. Associations are the `associations` collection.
- On pages where `?state=` is a real filter (directory, people), the designed states are forced with `?ui=` (companies accepts `?state=loading|error|empty`).

## Company profiles and claims (step 6.7)

- A profile is read with `companyProfile()`; its storefront with `storefrontProducts()`. Contact details only for signed-in people.
- Claims go only through `startEmailClaim()`/`confirmEmailClaim()` (code to an email on the profile's website domain), `submitGstinClaim()`, and `decideClaim()` (verification.edit, audited). Every claim needs an operator (A137); a claimed profile offers a join request instead.

## Member workspace (Stage 7)

- Member pages use `MemberShell`/`requireMember` (`apps/web/src/member/shell.tsx`); buyer pages before Stage 9 use `BuyerShell`. Save and Follow links arrive as `?<type>=slug` and finish in `FromLink` (an effect, never on prefetch).
- Alerts live in `@h2india/core/alerts`: filters are built only by `filterExpression()` from `ALERT_FILTER_FIELDS`; matching runs after search sync (`matchAlerts`, outbox `alerts_at`) and records each (alert, record) once in `core.alert_sends`. Never send an alert outside `sendAlerts()`; caps are the `alerts.limits` setting (A150).
- Every alert email carries Turn off this alert (`alertOffUrl()`) and the one-click header; the page lives outside the Coming soon gate. Queue a search refresh that isn't a person's change with `queueIndexChange(…, { alerts: false })`.
- "Days left" is `daysLeft()` from `@h2india/core/time` (re-exported by `opportunities/views.ts`).
- A member's profile saves only through `saveProfile()`; the people directory shows members only from `listedMembers()` (opted in, signed-in visitors only, M24). Preferences go through `saveMemberPreferences()` and are the choices `notify()` reads. Download my data is `exportMemberData()`: add every new member-owned table to it.
- Hydrogen 101 progress is written only by `ChapterTracker`/`Quiz` through `learning-actions.ts` (chapters checked against the CMS). Job Apply links go through `/opportunities/jobs/<slug>/apply`, which records the click for a signed-in member (A70); nothing goes to the employer.

## Supplier workspace (Stage 8)

- Supplier pages call `requireSupplier()` and render in `SupplierShell` (`apps/web/src/supplier/shell.tsx`); server actions get the company from `supplierActor()`, never from the form. Core lives in `@h2india/core/supplier`.
- The onboarding checklist is `buildChecklist(supplierFacts())`: derived from records only. A step that adds a supplier record adds it to `supplierFacts()`.
- Every new supplier-owned table gets a case in `supplier/supplier.int.test.ts` proving supplier B can't read or change supplier A's rows.
- Badges are granted and revoked only through `grantBadge()`/`revokeBadge()` (operators, recorded evidence, audited); `organisations.verification = "Verified"` follows the Verified supplier badge and is set only by `syncCompanyVerified()`. Company-records checks go through `supplier/adapters/registry.ts`.
- Supplier listings change only through `saveProduct()` (drafts and submissions; a live listing's reviewed fields go to `product_revisions`), `setListingStatus()` and `decideRevision()` (operators, `queues.edit`). `REVIEWED_FIELDS` and `INSTANT_FIELDS` in `products/rules.ts` decide what needs review. Admin screens use `requireOperator()` and `AdminShell` (`apps/web/src/admin/shell.tsx`).
- The datasheet engine is called only by the worker (`runImportJob` on the imports queue) through `adapters/datasheet`; extracted values reach a listing only after the supplier's check and `valueProblem()`.
- Spreadsheet imports go through `startImport()` → worker `runProductImport()`: rows become drafts only, matched on the supplier's SKU (`products_sku`). CSV files use the `product_import` kind; never read a CSV in a page.
- The payout bank account changes only through `addBankAccount()` → `confirmBankAccount()` (passkey step-up from `sign-in/step-up.ts`) → the `bankChangeHold` deadline; never read or log `accountCipher` outside `supplier/bank.ts`. There is no way to shorten a hold.
- Team changes go through `inviteMember()`/`acceptInvitation()` (invited email only), `changeMemberRole()` and `removeMember()` (never the last admin). Storefront edits go through `saveStorefrontDraft()` → `publishStorefront()` → `decideStorefront()`; the public profile changes only on approval.
- Supplier analytics events come only from `recordEvent()` (via the `ViewBeacon` component, `/api/v1/events` or a server action): never record a person, and keep operators and the supplier's own team out. Read figures only with `supplierAnalytics()`.

## Buyer workspace (Stage 9)

- Buyer pages call `requireBuyer()` and render in `BuyerWorkspace` (`apps/web/src/buyer/shell.tsx`); actions get the company from `buyerOf()`, never from the form. Core lives in `@h2india/core/buyer`.
- The onboarding checklist is `buildBuyerChecklist(buyerFacts())`: derived from records only.
- Company settings change only through `@h2india/core/buyer/settings` (company.manage, audited); people and roles through the team functions in `supplier/team.ts` (team.manage), shared by buyers and suppliers through `teamActor()`.
- A second GSTIN must share the company's PAN; only a verified GSTIN can be the default; a GSTIN a delivery site bills to can't be removed.
- Approval rules are stored now and enforced only when ordering opens (A162). Project lists never carry a price.
- Every new buyer-owned table gets a case in `authz/authz.int.test.ts` and `buyer/buyer.int.test.ts`.
- RFQs and quotes live in `@h2india/core/rfq` (pure rules in `/rfq/rules` and `/rfq/totals`). Statuses change only through `moveRfq()`/`moveQuote()` with a typed move from `transitions.ts` (A163); never set `status` directly.
- A sent quote version is never changed; revising saves a new version. Buyers read only sent versions (`quoteVersion()`), suppliers see an RFQ only once `sentAt` is set.
- Quote figures come only from `quoteFigures()` (GST per line, freight with its own rate); payment schedules are basis points that add to 10000 (`scheduleProblem()`).
- The RFQ wizard (`apps/web/src/rfq`) saves only through `saveRfqDraft`/`sendRfq`; the supplier picker reads `matchSuppliers()` (verified only). A signed-out draft lives in local storage under `LOCAL_DRAFT_KEY` and is picked up on `/rfq/new` after sign-in.
- Supplier RFQ pages read `supplierRfqs()`/`supplierRfq()` and save quotes only through `apps/web/src/supplier/rfq/actions.ts` (company from `supplierActor()`). Never show a commission, TCS or TDS figure until C1 and C3 are decided.
- RFQ files are `quote_attachment` with `sharedOnRfq`: suppliers an RFQ was sent to may open its attachments, and the buyer may open a sent quote's documents (`onSharedRfq()` in `files.ts`).
- The buyer comparison reads each supplier's latest sent version with `quoteVersion()` and highlights only through `compareQuotes()`; buyer RFQ actions go through `apps/web/src/buyer/rfq-actions.ts` and tell suppliers with `tellSuppliers()`.
- Messages go only through `@h2india/core/messages` (`rfqThread()`, `postMessage()`, `threadMessages()`); a thread exists only for its two companies (`sideIn()`). Message files use `sharedOnRfq` like RFQ files. No email for new messages until M21.
- Accepting a quote is only `acceptQuote()`, which calls `requireFlag("transactions")` before anything else (C8); the order is created there in step 10.1. Payment milestone amounts come from `milestoneAmounts()` (they add up to the total exactly).
- RFQ moderation is `approveRfq()`/`returnRfq()`/`rejectRfq()` (queues.edit); notices go through `rfq/notices.ts` only after the status change succeeds, so each supplier is told once.
- In a single-table Drizzle select, `${table.column}` inside a raw `sql` subquery is printed unqualified and binds to the subquery's own table. Write the outer column out (`core.rfqs.id`) or join so Drizzle qualifies it.
- The offer deadline and quote validity are `CHOSEN_DEADLINES` started with `startDeadline()` at the chosen time; moving one cancels and starts it again.

## Native content screens (step 4.6)

- Editors work in `/admin/content` with our components; `/cms` stays as the advanced editor (images in rich text, embeds, live updates).
- Every native content read and save runs as the signed-in editor from `cmsSession()` (`admin/cms/session.ts`) with `overrideAccess: false`, so CMS access rules and hooks apply. Never save content with `overrideAccess: true` from a page.
- Articles use `ArticleEditor` and change status only through `moveArticleAction()` → `transitionArticle()`. Other content uses `RecordForm`, drawn from the collection's fields by `describeFields()`; a new collection shows up by adding it to `CONTENT_GROUPS` (`admin/cms/registry.ts`), a single-document setting to `SETTING_SLUGS`.
- Publishing, unpublishing and setting changes are audited in `record-actions.ts`.

## Admin back office (Stage 11)

- Admin pages call `requireOperator(permission, path)` and render in `AdminShell`; the sidebar shows only `adminAreas(actor)` (Commerce only with `transactions` on). Overview tiles come from `overviewTiles()` (`@h2india/core/admin`), counting the same records as their queues, aged against the `queueAmber` and `queueRed` clocks.
- Moderation decisions go through `decideItem()` (`@h2india/core/queues`): it claims, refuses a second decision and runs `apply` (the CMS change and the message) once; never change a queued item from a page without it. Moderators never edit the item itself; they return it with reasons.
- Newsletter issues are sent only through `@h2india/core/newsletter/sends` (`scheduleSend()` starts a `newsletterSend` deadline; `sendBatch()` sends to confirmed subscribers, each once, with unsubscribe headers). Core renders the email; the web app only builds `IssueContent` (`admin/content/issue.ts`).
- Search synonyms and boosted results are the settings `SEARCH_SYNONYMS` and `SEARCH_BOOSTS`; change them only with `saveSynonyms()`/`saveBoosts()` (they apply to the live indexes, and `ensureIndexes()` keeps them).
- Switches changed in System settings are the setting `FLAG_OVERRIDES`, changed only with `switchFlag()` (money switches become a proposal for a second operator, `decideProposal()`); servers re-read them every 30 seconds and `isEnabled()` prefers them. Clocks change only with `setClock()`.
- Reports read `report_daily` (rolled up nightly by `rollUpReports()`), never live tables.
- Users are suspended only with `suspendUser()`/`suspendCompany()`; View as only through `startViewAs()` (read-only: the proxy refuses every write while the cookie is set). Admin screens use `operatorSession()`, never the viewed person.
- Data-rights erasure runs only through `erasurePlan()` then `eraseForRequest()` (`@h2india/core/compliance`): add every new table holding personal data to its STEPS.
- `money.view` (and other names shared with company permissions) can't be checked with `can(actor, p)` without a company: for operator areas read `actor.operator.has(p)`.

## Server and deploys (step 1.7)

- Production runs from one image (`Dockerfile`, built by `.github/workflows/image.yml`, never on the server) with `infra/compose.prod.yml` behind the host nginx (`infra/nginx/`). Commands: `docs/runbooks/deploy.md`.
- `web-public` (h2india.deecodes.io) and `web-admin` (adminh2india.deecodes.io) are the same image with their own `APP_URL`; nginx decides which paths each domain serves. A new admin-only top-level path needs adding to the admin `location` in `infra/nginx/h2india.conf`.
- The worker reaches the web app through `INTERNAL_WEB_URL`; `/api/internal/*` is blocked from outside.
- The first Super admin is made once with `pnpm admin:bootstrap`; after that only through `grantOperatorRole()`.

## Companies and Join (step 3.3)

- GSTIN checks go through `packages/core/src/companies/adapters/gstin` only. The fake answers until M4; test numbers are in `docs/runbooks/test-gstins.md`.
- Duplicates are found on GSTIN and PAN, never on the company name.
- Join details are copied to an account only after its email is proved (link or sign-in code).
- The worker must run for background GSTIN checks (`pnpm dev:worker`); browser tests in CI start it.

## Data rules (playbook Section 8)

- Money is whole **paise** in `bigint`, with a currency column. No floats. One formatting helper (₹48,79,400; lakh and crore).
- Times are stored in UTC and shown in IST. Working days come from one calendar module.
- Internal IDs are UUID v7. The references people see (ORD-2026-0091, RFQ-2026-0142) are separate and never reused.
- Statuses use the exact badge words, change only through one function per record, and write history and the audit log.
- Product attributes are validated against the category's attribute schema.
- Soft-delete anything people created. Financial tables are append-only.

## Feature flags

`transactions` is **off** (Batch 6 on hold). Every cart, checkout, order, payment and payout route calls `requireFlag("transactions")` on the server; hiding a button is not enough.

`comingSoon` (FLAG_COMING_SOON) is **off**. When on, every public page shows the Coming soon page except to signed-in operators and the emails on the Pre-launch allow-list (A44); newsletter pages stay reachable so pre-launch sign-ups can confirm.

`sampleContent` (FLAG_SAMPLE_CONTENT) is **off** by default (F9, A37). Content with `sample` ticked is shown only when it is on (local, staging). Collections with a sample field use `publicOrEditor` and `refuseSamplePublish` from `cms/sample.ts`; Local API reads for readers use `publicWhere()`.

## Definition of done (every screen)

- Matches its Figma frame at 1440 and 390. Put the side-by-side screenshots in the pull request.
- Loading, empty and error states exist and match their state boards.
- Works by keyboard with a visible focus ring. No serious axe issue.
- Uses `packages/ui` tokens and components only. Copy is taken from the frame.
- Server-side permission and company-scope checks, with a test proving another company cannot see the data.
- Unit tests for rules, an e2e test for the main path, and the step's "Done when" checks pass.

## Working loop

1. Branch: `git switch -c step/<id>-<name>`.
2. Plan, then get approval.
3. Build and test.
4. Check the screens against the frames.
5. `pnpm check && pnpm test`.
6. Summarise in plain words.
7. Open a pull request.
8. Update `docs/progress.md`.

Add any new rule you learned here, in the same pull request.

## Machine notes

- On the founder's Windows computer, never rewrite UTF-8 files with PowerShell 5.1 `Get-Content` or `Set-Content`; it damages `₹`, `—` and `·`.
- The founder's computer is short on memory. Run heavy checks in CI, and start Docker services only when needed.
- Payload stays on 3.x. TypeScript stays on 6.0 until `typescript-eslint` supports 7 (`docs/versions.md`).
