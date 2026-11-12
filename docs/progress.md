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
| 1.7 | Walking skeleton on staging | Deferred until the move to the existing server (ADR 0006) |

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
| 5.5 | Tenders, grants and jobs | Not started |
| 5.6 | Knowledge library, media and the India Hydrogen Tracker | Not started |
| 5.7 | Events, webinars and submission forms | Not started |
| 5.8 | Company, trust, legal, help and grievance pages | Not started |
| 5.9 | Newsletter, cookie consent, analytics and form protection | Not started |
| 5.10 | Search-engine readiness, errors, maintenance and redirects | Not started |

## Stage 6 · Marketplace catalogue and directory · Batch 3

| Step | What it delivers | Status |
|---|---|---|
| 6.1 | Catalogue structure and attribute schemas | Not started |
| 6.2 | Marketplace landing, class and application pages | Not started |
| 6.3 | Category listings and filters | Not started |
| 6.4 | Product detail page | Not started |
| 6.5 | Service pages, brands and compare | Not started |
| 6.6 | Directory, map, people and associations | Not started |
| 6.7 | Company profiles and claim this profile | Not started |

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
