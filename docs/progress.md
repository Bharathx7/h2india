# Progress

One row per playbook step. Claude Code updates this file in the same pull request that finishes a step.

Batches: 0 plan · 1 foundations (stages 1–3) · 2 content and website (4–5) · 3 marketplace (6–7) · 4 suppliers and RFQs (8–9) · 5 Launch 1 (11 Launch 1 steps, 12, 13.1–13.6) · 6 orders and payments (on hold).

## Stage 0 · Decisions, accounts and the audit · Batch 0

| Step | What it delivers | Status |
|---|---|---|
| 0.1 | Set up the decisions register | Done (docs/decisions.md) |
| 0.2 | Start the outside accounts that take time | GitHub repository given. Server: existing. Domain: deferred. |
| 0.3 | Prepare the workstation and Claude Code | Waiting for you: run `node scripts/check-env.mjs` |
| 0.4 | Connect Claude Code to the Figma file | Done for this session; you connect Claude Code (docs/setup.md) |
| 0.5 | Audit the existing hy-gen code and live site | Done (docs/audit-existing.md) |
| 0.6 | Record the architecture decisions | Done (Accepted at Gate 0; ADR 0006 amended) |
| 0.7 | Gate 0: approve the plan | Done (approved 11 Nov 2026) |

## Stage 1 · Repository and engineering foundations · Batch 1

| Step | What it delivers | Status |
|---|---|---|
| 1.1 | Create the repository and application skeleton | Done (11 Nov 2026) |
| 1.2 | Write CLAUDE.md and Claude Code settings | Done (11 Nov 2026) |
| 1.3 | Local services with one command | Done (11 Nov 2026). Needs Docker on your computer to run; check with `pnpm dev:up` and `pnpm health` |
| 1.4 | Code quality gates | Done (11 Nov 2026) |
| 1.5 | Continuous integration | Done (11 Nov 2026). First run happens on the first push |
| 1.6 | Configuration and secrets policy | Done (11 Nov 2026) |
| 1.7 | Walking skeleton on staging | Built 13 Nov 2026 (branch `step/1.7-server`, on top of 5.10, not merged): one Docker image built by the Image workflow and pushed to GitHub Container Registry, `infra/compose.prod.yml` (web-public, web-admin, worker, PostgreSQL, Redis, Meilisearch, MinIO, ClamAV, Mailpit until M6), host nginx for h2india.deecodes.io (with file storage under the bucket paths) and adminh2india.deecodes.io, settings made by `infra/new-env.sh`, `pnpm admin:bootstrap` for the first Super admin, worker calls the web app inside Docker (INTERNAL_WEB_URL). You: run `docs/runbooks/deploy.md` |

## Stage 2 · Design system in code · Batch 1

| Step | What it delivers | Status |
|---|---|---|
| 2.1 | Generate tokens from the Figma variables | Done 11 Nov 2026: 86 variables, 15 text styles, 8 effects; matched to Figma token by token |
| 2.2 | Fonts and base styles | Done 11 Nov 2026: self-hosted, ₹ ₂ → × • checked; phone check by you pending |
| 2.3 | Core components | Done 11 Nov 2026 for the sections in this step: icons, buttons and links, form controls, selection and upload, feedback and status, navigation, overlays, tables and panels, search and dates. Order banner comes with the order pages (Batch 6); Search overlay and the v2 header, footer and workspace pieces come with the shells (2.4) |
| 2.4 | Shells: site, workspace and auth | Done 11 Nov 2026: logo (8 versions), workspace sidebar and top bar v2 for all four areas, auth panel, site header with six mega menus, mobile menu, footer v2, announcement bar, cookie banner. Search overlay comes with search (Stage 4); auth panel supplier and admin copy open (C15) |
| 2.5 | The required-states rule | Done 11 Nov 2026: AsyncSection, ?state= in development, expectStates() test helper |
| 2.6 | Component gallery and visual checks | In progress: /dev/ui gallery with axe and keyboard checks at 1440 and 390; screenshot baselines wait for a CI run and your approval |

## Stage 3 · Platform core: accounts, companies, roles, files, clocks, messages · Batch 1

| Step | What it delivers | Status |
|---|---|---|
| 3.1 | Database conventions and first migration | Done 11 Nov 2026: core and cms schemas, money, reference numbers, changeStatus with history, append-only audit log, migration safety check, integration tests on PostgreSQL. You: confirm reference formats (calendar year vs financial year) |
| 3.2 | Sign-in: passkey, email code, Google | Done 12 Nov 2026: Better Auth on our PostgreSQL; Sign in, Enter code, wrong, expired, paused and passkey offer at 1440 and 390; sign-in code email. Decisions A1 to A4 and C6 answered. You: Google credentials (`docs/runbooks/google-sign-in.md`), test a passkey on your laptop (and phone once the domain M1 is set) |
| 3.3 | Join flow, companies and the GSTIN check | Done 12 Nov 2026 (merged). Join steps 1 to 5, Verify email, Join request states, the 8 GSTIN states with a fake provider (M4 open), SMS into Mailpit (M5 open), background GSTIN check in the worker. Decisions A5 to A8. You: choose the GSTIN provider (M4), try the 8 states (`docs/runbooks/test-gstins.md`) |
| 3.4 | Roles, permissions and company scoping | Done 12 Nov 2026: roles and permissions as data (buyer, supplier, 7 operator roles), can(), query scope (a query without a scope does not compile), two-company cross-company tests for organisations, memberships, invitations and join requests. Grids accepted (A12, A13) |
| 3.5 | Account recovery | Done 12 Nov 2026: Forgot access hub; lost passkey (email and SMS codes, then a new passkey; admins emailed, 831:1148); changed mobile (email code and new-number code, then an Admin approves, A14); lost email (SMS code, Admin confirms, new work email by link, A15); support approves when the person is the only Admin (A17). One factor is always refused. The support request form with its Work ID upload comes with step 3.7 |
| 3.6 | Audit log | Done 12 Nov 2026: one `audit()` call with masked before and after values (bank, card, PAN and mobile numbers keep the last four; codes and secrets hidden), IP, user agent and request ID (every response carries X-Request-Id); append-only in the database with 8-year retention (A18) and an audited retention job; settings table with audited changes (`settings.edit`); company role and name changes and operator role grants audited (operator roles need Super admin, the last one can't be removed); query and CSV export API for the Audit log screen (656:872, built in 11.4), export audited. The retention job is scheduled with the clocks in step 3.8 |
| 3.7 | Files and documents | Done 12 Nov 2026: uploads go straight to a quarantine bucket with a 10-minute signed link; the worker checks the real size, scans with ClamAV, checks the type by content, re-encodes images (metadata removed, 320/640/1280 sizes, SVG logos become PNG, A21), then moves files to the private or public bucket. Downloads only through a 5-minute signed link after the permission check (least access per kind); opening a personal document is audited. Limits per kind are configuration (A20). File upload and File row states incl. "Checking file…" and 505:329. Lost-email support request with Work ID (528:534, 528:664): support emailed with a review page (A23), Work ID deleted 30 days after closing (A22). The housekeeping sweep is scheduled with the clocks in step 3.8 |
| 3.8 | Background jobs and clocks | Done 12 Nov 2026: queues (gstin-check, files, clocks, notify, index, imports; payments waits for Batch 6) with retries and back-off, and a dead-letter list with the error (`core.dead_letters`); clock values as configuration and settings (A24, new deadlines only); IST working-day calendar, Monday to Saturday minus the gazetted holidays for 2026 and 2027 (M18), kept by a Super admin; deadline engine (start, warn, expire, exactly once across restarts, SLA colours amber 24 h and red 48 h); schedule runner for the deadline tick and housekeeping (files sweep, GSTIN sweep, join-request expiry, throttle and code cleanup, audit retention at 03:00 IST) |
| 3.9 | Notifications: email, WhatsApp, SMS and in-app | Done 12 Nov 2026: one service (`notify`) with email, SMS, WhatsApp and in-app channels; every message logged in `core.notification_deliveries` with the provider's answer; choices per topic and channel with the drawn defaults (577:288, 548:8), account email always on, quiet hours and unsubscribe-all; failed emails retried from a stored copy (never codes or links); registry of all 34 page-16 templates plus the undrawn ones (M21) with frames and keys; SMS and WhatsApp send only approved templates (A25); notification centre (97:2564, 100:4631, empty/loading/error) with the Email settings tab, bell panel (97:3168) with unread count and Mark all read; 90-day retention; /dev/messages sends any built template to you. Providers M5 and M6 still fakes |

## Stage 4 · Content platform · Batch 2

| Step | What it delivers | Status |
|---|---|---|
| 4.1 | Install the CMS and define the content model | Done 12 Nov 2026: Payload 3.93 inside the app (tables in the `cms` schema, migrations with `pnpm db:migrate`), editor at /cms signed in with H2 India accounts (operators with Content access; Editor-in-chief and Content editor from the operator roles), branded (A26); collections Articles (six types with labels from the type, A28; Key numbers and Key facts blocks; sources; SEO; drafts, autosave and comparable versions), Authors (staff, contributor, organisation), Topics, Tags, Media (alt text required, stored in the public bucket). Publishing needs content.publish, sources, and the legal check for sponsored, press-release and flagged pieces (A27). Draft preview for editors. Not yet in the model: company and scheme embeds (Stages 6 and 4.3), chart block, inline legal-check comments (a note field instead), glossary hover-cards (4.4) |
| 4.2 | Editorial workflow | Done 12 Nov 2026: statuses Draft, In review, Legal check, Scheduled, Published changed only by `transitionArticle()` (rules, permissions, audit log); Workflow panel in the CMS sidebar replaces Payload's Publish button; legal check for sponsored, press-release and flagged pieces passed by the Editor-in-chief (A27) and cleared by any later change; scheduled articles published by the worker's every-minute call (IST times stored in UTC); corrections add a dated note on the article and an entry in the Corrections queue; versions kept and comparable in the CMS; publishing-calendar query for Overview (626:8, built in Stage 11) |
| 4.3 | Records: schemes, tenders, grants, jobs, events | Done 12 Nov 2026: Schemes, Tenders (with their result when awarded), Grants, Jobs and Events in the CMS with fields as drawn (A31); every record has its official source, documents, owner, states, topics, a sample flag and Last verified (Mark verified, audited); status comes from the dates in IST (Open, Closing soon, Closed, Awarded, Next round expected; Live or Expired; Upcoming, Happening now, Past), so a tender closes at its deadline without an editor; Content editors publish record changes (A30); Data quality lists as queries (stale after 30 days, red after 60; Possible updates) at /api/cms/data-quality. The watcher that finds possible updates and the admin screens come in step 11.3; the footer disclaimer with the public pages in Stage 5 |
| 4.4 | Knowledge library | Done 12 Nov 2026: Hydrogen 101 chapters (numbered; previous and next from the published chapters), buyer's guides, glossary terms (expansion, aliases, short definition, related terms and standards), standards and regulations, reports (gated or free, sponsor and disclosure, key findings, contents) with PDFs in the private bucket, videos and podcast episodes (URLs until M9) in the CMS. Editorial pieces need the Editor-in-chief to publish; glossary and standards are published by editors (A30, A32). Glossary hover-card (424:7500) on the first mention of each term in an article, automatic. Gated download: the form's checks, consent recorded with the words shown, a 5-minute link to the PDF and an emailed copy whose link works 7 days; members skip the form and are never shared; leads deleted after 24 months by a daily job and readable only by staff who export content (A33). CMS uploads are virus-checked before they are stored. Key facts box is now label and value pairs as drawn (424:7495). The public pages come with Stage 5 (5.6) |
| 4.5 | Tracker data model | Done 12 Nov 2026: the India Hydrogen Tracker in the CMS: Projects, Manufacturing, Pilots, Stations, Prices, State policies, and Hubs and valleys for the map, with the fields and statuses drawn (plus Cancelled and Completed, A36). Every record has its source (name, link, type) and as-of date, who entered it, an estimate tick per figure (A34, A35), a status history that gains a row when the status changes, map coordinates, linked companies and related news, Last verified (in Data quality) and the sample flag. Publishing a record writes Recent changes (field, before, after, source, date, who). Prices are stored in paise. The Methodology text is editable, filled with the drawn wording. Editors preview a record as on 740:20. Sample content is behind FLAG_SAMPLE_CONTENT (A37): with it off, sample items in the tracker, records and knowledge are never shown and can't be published. Public tracker pages come with Stage 5 |
| 4.6 | Seed and import tools | Done 12 Nov 2026: `pnpm import:<type> <file>` for glossary, articles, schemes, tenders, events and companies (and `pnpm content:import <type>` for grants, jobs, standards and the tracker views), reading CSV or JSON. Every row goes through the CMS's own field rules inside a transaction that is rolled back, so a check (the default, A41) changes nothing and lists every problem by row; `--apply` writes only when no row has a problem. Rows are matched on slug (companies on key), so the same file twice creates nothing new. Imports land as drafts; records, glossary, standards and tracker rows may carry publish=yes, articles never (A39). Companies import as Unclaimed profiles with the basics from 481:8 (A38) and stay out of Join search. `pnpm db:seed` loads the design's sample data (companies, glossary, tracker, reports) flagged sample (A40); published only where FLAG_SAMPLE_CONTENT is on. Reports gained a published date (736:8) |

## Stage 5 · Public website and search · Batch 2

| Step | What it delivers | Status |
|---|---|---|
| 5.1 | Home page and the pre-launch page | Done 12 Nov 2026: the home page from 377:4917 (logged in 379:4688, phones 381:5845) with its 13 sections. Each data module (brands, live figures, tenders, schemes, news, SIGHT snapshot, events, hubs) runs its own query behind its loading skeleton (381:12972) and shows its designed error or empty state (381:13116) on its own; `?state=loading` and `?fail=tenders,news…` force them in development. Hero network card with the motion spec 781:7247 (focus every 2.5 s, 400 ms changes), a pause button (F6) and the still Buyers frame with reduced motion; logo strip (90 s loop, stops on hover, focus and pause), section reveals, card lift. Wording as drawn with the mission targets and their MNRE source (A42); classes, popular categories and applications defined in `@h2india/core/catalogue` without counts, Featured products and the "For you" cards in their empty states (A43). Headline figures entered by editors with source and date in the CMS (Home figures), open tenders counted live, the listings tile waits for Stage 6 (A45). Coming soon (743:6871, 743:7095) with the newsletter states (743:7293) behind FLAG_COMING_SOON, skipped by signed-in operators and a Super admin's allow-list (Pre-launch setting, A44, A48). India H₂ Weekly sign-up brought forward from 5.9: double opt-in, confirm and choose topics (448:7157), expired link (448:7392), confirmation email (676:8) with its welcome variant, and an already-subscribed email (A46). Early listing requests saved for operators (A47). Sample tenders, schemes, events, articles, hubs and figures added to `pnpm db:seed` |
| 5.2 | Search index and global search | Built 12 Nov 2026 (branch `step/5.2-search`, not merged): Meilisearch indexes for products, companies, articles, schemes, tenders, grants, jobs, events and knowledge, with searchable, filterable and sortable fields; no index holds a price (tested). Changes reach the indexes through `core.search_outbox`, written in the same transaction as the CMS save or company import; the worker applies them within seconds (every-minute sweep, daily refresh for date-driven statuses). `pnpm search:reindex` rebuilds any index. Typo tolerance on, every word must match, starter synonyms (A50). Header overlay (372:16695, 372:16870, 372:16991) for every type; /search (63:795, 71:5194) with Products and Suppliers tabs and its states (127:6804, 127:6835, 127:6870); product grid and filters come with Stage 6 (A49). Searches with no results logged to `core.search_misses` (words, scope, time only). OPEN: A50 to A54. You: send synonyms, try twenty real searches |
| 5.3 | News and Insights | Built 12 Nov 2026 (branch `step/5.3-news`, on top of 5.2, not merged): /news (428:473, 429:1287), sections, /news/latest and /news/press-releases (430:1952, 431:2334, 431:2542), articles with every header variant (434:2844, 435:3380, 437:3709 to 437:4387), the live explainer live and ended (801:7492, 801:8142, 801:8616) refreshing its live block every 30 s, topic, tag and author pages (442:4049 to 444:5946), Insights and guides (440:40, 440:596, 127:6977, 127:6995, 127:7030, 441:801, 441:1669). Pages read through a cache the CMS refreshes the moment an article, guide, topic, tag or author changes. NewsArticle structured data. Sponsored and press-release labels from the type on cards and pages. CMS: states, level, featured, key facts, why this matters, about the sponsor and the live explainer block; topics get an order; "Publish live update" (A61). OPEN: A58 to A61. You: read three articles on a phone and check the sponsored and press-release labels |
| 5.4 | Schemes, eligibility checker and state hubs | Built 12 Nov 2026 (branch `step/5.4-schemes`, on top of 5.3, not merged): schemes hub with filters, sort and the phone filter sheet (411:9, 412:814, 412:1379) and its states (421:2662, 421:3306, 421:4160); scheme detail with official source and last-verified date (416:1354, 417:1794, next round expected 421:4769); SIGHT tracker (418:2079, 420:2439) from a CMS settings page; eligibility checker (749:4946 to 750:464) matching only rules stored and checked on each scheme, in `@h2india/core/schemes`; state page, compare with CSV, and hubs and valleys with the map placeholder until 6.6 (751:7362, 751:7856, 751:8302). OPEN: M25 (no scheme has rules yet, so the checker says they are being prepared), A62 to A67. You: give the matching rules (M25), check three scheme pages against their portals |
| 5.5 | Tenders, grants and jobs | Built 12 Nov 2026 (branch `step/5.5-opportunities`, on top of 5.4, not merged): opportunities home (453:9) with closing this week, rails and recent results; tenders table and cards with filters, sort, pages and no results (455:1621, 456:2183, 456:2726, phones 456:3152); tender detail open and awarded (457:3222, 459:3621); results and awards (460:4147); grants list and detail, open and closed (462:4609, 463:5337, 463:6046); jobs list and detail, live and closed, with JobPosting data (464:6071, 465:6591, 465:7367); Post a job, preview and submitted (467:7472, 468:7854, 468:8311) saving drafts that editors publish. Statuses from dates in India time. OPEN: A69 to A73. You: check three real tenders' dates against their portals, approve a job in /cms (Jobs, "Submitted for review") |
| 5.6 | Knowledge library, media and the India Hydrogen Tracker | Built 12 Nov 2026 (branch `step/5.6-knowledge`, on top of 5.5, not merged): knowledge home (470:1391), Hydrogen 101 chapters with key terms and quiz (471:1876), buyer's guides (472:2135), glossary and term pages (735:3378, 735:3810), standards library and record (735:4138, 735:4587), reports, gated landing and "Your report is ready" with the consent version stored (736:8, 736:421, 736:833), videos, video and podcast pages through the media adapter (273:22177, 273:22703, 736:1169), tracker overview with layers and states (796:7867, 800:8303), six sub-views with filters, charts, CSV and sources (738:5437 to 739:1280), record (740:20), methodology (740:469) and recent changes (740:841). OPEN: M9, A74 to A80. You: choose the media host (M9), confirm the consent words with your lawyer, decide which tracker figures are ready to publish |
| 5.7 | Events, webinars and submission forms | Built 13 Nov 2026 (branch `step/5.7-events`, on top of 5.6, not merged): events list and calendar with filters and states (729:10714, 827:13689, 827:14280), webinars, training and past presets, expo detail and live day (729:11207, 733:493), webinar registration, full or closed, "You're registered" and the gated replay (732:521, 827:14696, 732:939, 733:22), .ics and join links; registration email and WhatsApp (676:83, 676:405) and reminders one day and one hour before through the deadline engine (676:459), sent at most once; Submit an event, a press release, Suggest a correction and Write for us with every state (501:8485 to 505:421), each with a reference in the Submissions queue and Submission received (673:352). OPEN: F7, A81 to A86. You: submit a test event and follow it to the queue; approve the WhatsApp templates (M5) |
| 5.8 | Company, trust, legal, help and grievance pages | Built 13 Nov 2026 (branch `step/5.8-trust`, on top of 5.7, not merged): About (66:4251), Mission (741:6475), Team (66:3923), Contact (66:4591), Partner with H2 India (742:8, sent 742:516), Advertise (741:5605), Media kit (741:6058), Careers (742:826, empty 742:1156), For Buyers (93:906), For Suppliers (93:1331), How verification works (95:1428), Pricing (512:148, editor-entered prices with a being-finalised state), Help centre with search and no results (96:1942, 763:40134) and articles (278:23978), versioned legal pages (66:5004, 521:305, 521:459, 521:603, 521:754, 521:898), Grievance officer with ticket and status lookup (519:8, 519:538, 519:588) and the HTML sitemap (742:1338). Grievances: core.grievances, GRV-2026-00001 references, 24-hour and 15-day clocks, acknowledgement email (676:154). Contact, partnership and advertising messages enter the Submissions queue (CON-, PE-, ADV-). Company details, the grievance officer and legal text wait for M2 and show [placeholders]. Decisions A87 to A93. |
| 5.9 | Newsletter, cookie consent, analytics and form protection | Built 13 Nov 2026 (branch `step/5.9-newsletter-consent`, on top of 5.8, not merged): newsletter archive with tabs (445:5885) and issue pages (446:6106) from a CMS collection, Check your inbox (448:7048) and Already subscribed (448:7291) after sign-up, one-click unsubscribe (List-Unsubscribe headers and a confirm page), "Also send me" kept at sign-up. Cookie banner (53:1455) with Reject optional, Accept all and Cookie preferences on the Cookie policy page; each choice recorded with its version; analytics only after consent and never for operators, with no tool loaded until M10. Every public form (submissions, contact, partnership, advertising, grievance, newsletter, early listing, webinar, gated reports) passes `checkForm()`: honeypot, a minimum time since the page loaded, 5 a minute and 30 an hour per IP, checked after the form is valid so people see their mistakes first; 50 rapid posts let 5 through. Decisions A94 to A98. |
| 5.10 | Search-engine readiness, errors, maintenance and redirects | Built 13 Nov 2026 (branch `step/5.10-seo-errors`, on top of 5.9, not merged): site-wide metadata (canonical base, Open Graph and Twitter cards, a default share image from the tokens), robots.txt and noindex behind the new searchIndexing flag (off), a sitemap index with one sitemap per content type plus a Google News sitemap, the 404 (66:5295, 73:6808) for unknown addresses and missing records, the 500 (679:443, 679:572) with a reference logged with the request ID, planned maintenance (679:620) behind FLAG_MAINTENANCE with a 503, 301 redirects from a tested table, and structured data (Organization, WebSite, Event, BreadcrumbList; Article and JobPosting already). The hy-gen redirect list waits for M14. Decisions A99 to A102. |

## Stage 6 · Marketplace catalogue and directory · Batch 3

| Step | What it delivers | Status |
|---|---|---|
| 6.1 | Catalogue structure and attribute schemas | Built 13 Nov 2026 (branch `step/6.1-catalogue`, on top of 1.7, not merged): classes, categories and sub-categories, applications and attribute schemas as data (migration 0021, launch catalogue in 0022); `schemaFor()` checks product values with clear messages; admin Catalogue at /admin/catalogue (636:596) with Add attribute (637:417), edit, order, remove, add, rename, move, duplicate and hide categories, change history and the product form preview; sample sub-categories from `pnpm db:seed`. Decisions A103 to A108. You: name the missing Systems categories (A106), confirm Ports & shipping (A105), add the electrolyser attributes (A108) |
| 6.2 | Marketplace landing, class and application pages | Built 13 Nov 2026 (branch `step/6.2-marketplace`, on top of 6.1, not merged): /marketplace (390:7501), one class template for all five (391:4379) and one application template for all (754:14685, F4 safe default) with its words in the CMS (Application pages); the home page tiles and the Marketplace menu read the live catalogue; admin Catalogue › Choose applications; no price anywhere (tested). Decisions A109 to A113. You: F4, A105, A111 |
| 6.3 | Category listings and filters | Built 13 Nov 2026 (branch `step/6.3-listings`, on top of 6.2, not merged): category and sub-category listings (392:4896, 392:5787, 392:6656; phones 395:9321, 395:9617) with grid, table and phone views, filters from filterable attributes with counts, sort, page size and pages in the address; Product card v2 without price; compare selection and bar; the products table (A115) with sample PEM electrolysers. Decisions A114 to A119 |
| 6.4 | Product detail page | Built 13 Nov 2026 (branch `step/6.4-product-page`, on top of 6.3, not merged): quote-only (393:7030) and fixed-price (393:8021) pages with the buy box, grouped spec table from the schema, installation, certificates, downloads, delivery and the supplier; price only from `canShowPrice()` with the supplier's GST rate; no buy button while transactions are off; Ask a technical question and Report this listing saved for Messages (9.7) and the Listings queue (11.2). Decisions A120 to A126 |
| 6.5 | Service pages, brands and compare | Built 13 Nov 2026 (branch `step/6.5-services-brands-compare`, on top of 6.4, not merged): service page (400:11134) with provider-not-verified (400:11597) and paused (400:11797) states; brands index (401:11734) and brand page (401:12097) with authorised dealers verified only after an operator records the letter, and the no-dealer state (401:12561); compare (91:9) with aligned rows, Show only differences, Add a product, mixed-category guidance and its states, never a price; compare limit 5 as drawn. Decisions A127 to A131; A116 updated |
| 6.6 | Directory, map, people and associations | Built 13 Nov 2026 (branch `step/6.6-directory`, on top of 6.5, not merged): company directory (477:40) with type tabs, filters with counts, list and map views reading the same companies, and its states; MapView with a provider adapter showing the list by state until M7; people (756:12213, 756:12711) only with recorded consent (M24 safe default); associations (498:8) and start-ups (497:7060) from the CMS and profiles; ecosystem map. Decisions A132 to A136. You: M7 (map vendor), M24 (people rules) |
| 6.7 | Company profiles and claim this profile | Built 13 Nov 2026 (branch `step/6.7-company-profiles`, on top of 6.6, not merged): company profile (481:8) with Overview, Products (storefront), Projects, Certifications, News, Events, Jobs and Contact tabs (contact hidden when signed out); Claim this profile (492:5614): unclaimed banner, choose a method, company-email code (domain checked), GSTIN and letter, pending, approved, rejected with reason, already claimed with a join request; every claim approved by an operator on the Verification page; flow J tested end to end. Decisions A137 to A140. You: A137 (claim methods), walk through flow J on staging |

## Stage 7 · Member workspace, follows and alerts · Batch 3

| Step | What it delivers | Status |
|---|---|---|
| 7.1 | Member onboarding | Not started |
| 7.2 | Home feed, follows and saved items | Not started |
| 7.3 | Alerts engine | Not started |
| 7.4 | Profile and preferences | Not started |
| 7.5 | Hydrogen 101 progress, event registrations and job applications | Not started |
| 7.6 | Prove flows D and E | Not started |

## Stage 8 · Supplier workspace: onboarding to live listings · Batch 4

| Step | What it delivers | Status |
|---|---|---|
| 8.1 | Supplier dashboard and onboarding checklist | Not started |
| 8.2 | Verification documents, tiers and badges | Not started |
| 8.3 | Products, product editor and listing review | Not started |
| 8.4 | Datasheet reader and review | Not started |
| 8.5 | Bulk import and quick stock and price | Not started |
| 8.6 | Payout bank account with a safety hold | Not started |
| 8.7 | Storefront, team and content submissions | Not started |
| 8.8 | Supplier analytics and proof of flow C | Not started |

## Stage 9 · RFQs, quotes and messages · Batch 4

| Step | What it delivers | Status |
|---|---|---|
| 9.1 | Buyer workspace: dashboard, onboarding, company settings and project lists | Not started |
| 9.2 | RFQ and quote records and their statuses | Not started |
| 9.3 | The RFQ wizard | Not started |
| 9.4 | Moderation and distribution | Not started |
| 9.5 | Supplier RFQ inbox and quote builder | Not started |
| 9.6 | Buyer RFQ list, detail, comparison and actions | Not started |
| 9.7 | Messages | Not started |
| 9.8 | Accept quote and hand-over to orders | Not started |
| 9.9 | Prove flow A and prepare Gate 2 | Not started |

## Stage 10 · Orders, payments, delivery and payouts · Batch 6 (on hold)

| Step | What it delivers | Status |
|---|---|---|
| 10.1 | Order records, statuses and the timeline | Not started |
| 10.2 | Cart and checkout: confirm, then pay | Not started |
| 10.3 | Approval rules and approver review | Not started |
| 10.4 | Payment-partner adapter, order accounts and webhooks | Not started |
| 10.5 | Payment methods and outcomes | Not started |
| 10.6 | The ledger and reconciliation | Not started |
| 10.7 | Supplier orders: pipeline, accept or decline | Not started |
| 10.8 | Milestone payments, due banners, payments and invoices | Not started |
| 10.9 | Dispatch and the delivery code | Not started |
| 10.10 | Acceptance, disputes, cancellations and refunds | Not started |
| 10.11 | Fees, tax deductions, payouts and statements | Not started |
| 10.12 | Prove flows B and H and prepare the pilot | Not started |

## Stage 11 · Admin back office · Batch 5 (11.5, 11.6: 6)

| Step | What it delivers | Status |
|---|---|---|
| 11.1 | Admin shell and overview | Not started |
| 11.2 | Queues and moderation | Not started |
| 11.3 | Content operations: newsletter, data quality, media, authors, search | Not started |
| 11.4 | Users, operator roles, view-as and the audit log | Not started |
| 11.5 | Orders, disputes and refunds (Launch 2) | Not started |
| 11.6 | Money: payments, payouts, ledger, tax reports, fee invoices, rate card (Launch 2) | Not started |
| 11.7 | Compliance: grievances, takedowns, corrections, data rights | Not started |
| 11.8 | Reports, analytics and system settings | Not started |

## Stage 12 · Hardening: testing, security, privacy, accessibility and performance · Batch 5

| Step | What it delivers | Status |
|---|---|---|
| 12.1 | Security review and automated scanning | Not started |
| 12.2 | Privacy and DPDP readiness | Not started |
| 12.3 | The full flow suite and regression | Not started |
| 12.4 | Accessibility audit | Not started |
| 12.5 | Speed and load | Not started |
| 12.6 | Backup, restore and failure drills | Not started |
| 12.7 | External penetration test | Not started |
| 12.8 | Acceptance testing with pilot users | Not started |

## Stage 13 · Production and live operations · Batch 5 (13.7: 6)

| Step | What it delivers | Status |
|---|---|---|
| 13.1 | Production environment | Not started |
| 13.2 | Domain, certificates and email authentication | Not started |
| 13.3 | Monitoring, alerting and logs | Not started |
| 13.4 | Launch data: migration, real content and removing samples | Not started |
| 13.5 | Runbooks, support and incident handling | Not started |
| 13.6 | Launch 1 go-live (Gate 2) | Not started |
| 13.7 | Launch 2: transactions for the pilot group (Gate 3) | Not started |
| 13.8 | After launch: release rhythm, upgrades and keeping the design in sync | Not started |
