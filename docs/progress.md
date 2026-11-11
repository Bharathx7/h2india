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
| 3.3 | Join flow, companies and the GSTIN check | Not started |
| 3.4 | Roles, permissions and company scoping | Not started |
| 3.5 | Account recovery | Not started |
| 3.6 | Audit log | Not started |
| 3.7 | Files and documents | Not started |
| 3.8 | Background jobs and clocks | Not started |
| 3.9 | Notifications: email, WhatsApp, SMS and in-app | Not started |

## Stage 4 · Content platform · Batch 2

| Step | What it delivers | Status |
|---|---|---|
| 4.1 | Install the CMS and define the content model | Not started |
| 4.2 | Editorial workflow | Not started |
| 4.3 | Records: schemes, tenders, grants, jobs, events | Not started |
| 4.4 | Knowledge library | Not started |
| 4.5 | Tracker data model | Not started |
| 4.6 | Seed and import tools | Not started |

## Stage 5 · Public website and search · Batch 2

| Step | What it delivers | Status |
|---|---|---|
| 5.1 | Home page and the pre-launch page | Not started |
| 5.2 | Search index and global search | Not started |
| 5.3 | News and Insights | Not started |
| 5.4 | Schemes, eligibility checker and state hubs | Not started |
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
