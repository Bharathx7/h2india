# Decisions register

The only place decisions are recorded. Claude Code reads this file before every step. If an item a step depends on is **Open**, it builds the safe default behind a setting, writes `OPEN: <ID>` in the pull request and moves on. It never invents a price, threshold, date or legal wording.

Statuses: **Open** (needs your answer) · **Answered** · **Answered by design** (the Figma already says it) · **Decided, wording pending** · **Parked** (waiting on Batch 6, which is on hold) · **Deferred**.

Source: playbook v1.0 Section 6 (11 Nov 2026), plus items found since. Last updated: 11 Nov 2026.

## Blocking Batches 1 and 2 (answer these first)

| ID | What | Needed for |
|---|---|---|
| M1 | Final domain, and what happens to hydro.deecodes.io | **Deferred** by the founder (11 Nov 2026): work locally first. Passkeys made on localhost will not carry over to the real domain. |
| M13 | Expected traffic, uptime target, backup targets | Server sizing and backups. The existing server is used (ADR 0006 amended). |
| M14 | Whether any live hy-gen data must be migrated | Data model choices (step 3.1) |
| M15 | Confirm English only (Hindi out of scope) | Design system and text handling (Stage 2) |
| M17 | Tablet behaviour between 390 and 1440 (default: breakpoints at 768 and 1024) | Shells and layouts (step 2.4) |
| M4, M5, M6, M18, C6 | Verification provider, SMS/WhatsApp, email, working-day calendar, role of the mobile number | Platform core (Stage 3). Fakes are used until answered |
| F5 | Delete the unused Wide hero variants? (default: do not build them) | Stage 2 |


## Open decisions on the Figma cover (page 00)

| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| F1 | Admin Organisations: a list and detail screen, or keep it as a tab inside Users? | You | Stage 11 (Batch 5) | Tab, as designed today | Open |  |
| F2 | Two old supplier modals (Add a product video 299:5163, Sent for review 272:4480): update or archive? | You | Stage 8 (Batch 4) | Do not build them | Open |  |
| F3 | Member sidebar: add a Job applications item? | You | Stage 7 (Batch 3) | No item; page reachable from Home feed | Open |  |
| F4 | Application landing: only Refuelling and mobility is designed. Design all 7 or reuse one template? | You | Stage 6 (Batch 3) | One template driven by data | Open |  |
| F5 | Delete the unused Wide hero variants? | You | Stage 2 (Batch 1) | Do not build them | Open |  |
| F6 | Home hero animation: add a visible pause button (WCAG 2.2.2)? | You | Stage 5 (Batch 2) | Build the pause button; the motion spec already assumes one | Open |  |
| F7 | Featured-event price and the organiser's payment step (Flow G) | You | Stage 5 (Batch 2) | Submission goes straight to review, no payment | Open |  |
| F8 | EV-2026-0412: who organises it? | You | Stage 13 (Batch 5) | Sample data only; fixed when sample data is replaced | Open |  |
| F9 | Sample data to replace: tracker prices and projects, state policies, report titles, careers, fee and payout figures | You and content team | Stage 13 (Batch 5) | Seed data marked as sample, hidden in production | Open |  |

## Flow gaps recorded in Doc 4

| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| G1 | No "Awaiting approval" order state (High) | You | Stage 10 (Batch 6, on hold) | Add the internal state; reuse the Approver review screens; buyer badge wording needs your approval | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G2 | No payment-overdue and auto-cancel rule (High) | You | Stage 10 (Batch 6, on hold) | Overdue banner only; no automatic cancellation until you set the rule | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G3 | Tier C and D inspection, dispatch clearance and commissioning screens missing (High) | You | Stage 10 (Batch 6, on hold) | Tier C and D orders handled by Operations manually; not self-serve at Launch 2 | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G4 | Quote validity lapsing during approval | You | Stage 10 (Batch 6, on hold) | Block payment on an expired quote and ask the supplier to extend | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G5 | Delivery code fallback when the SMS does not arrive | You | Stage 10 (Batch 6, on hold) | Operator can resend or confirm receipt with a reason, audit-logged | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G6 | Multi-shipment orders | You | Stage 10 (Batch 6, on hold) | One shipment per order | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G7 | Replace a document after dispatch | You | Stage 10 (Batch 6, on hold) | Operator-only action | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G8 | Supplier changes the dispatch date | You | Stage 10 (Batch 6, on hold) | Use the designed Change dispatch date modal; buyer is notified; no penalty logic | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G9 | Money after cancellation or overpayment | You | Stage 10 (Batch 6, on hold) | Refund through the designed refund flow; overpayment flagged for Finance | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| G10 | Suspended-supplier screen and appeal | You | Stage 11 (Batch 5) | Suspension hides listings; appeal by email | Open |  |
| G11 | Mediation handoff screen | You | Stage 11 (Batch 5) | Not built | Open |  |
| G12 | Post-delivery rating (P2) | You | Later (Later) | Not built | Open |  |
| G13 | What happens when a buyer neither accepts nor reports a problem within 5 working days (found in this review: admin frame 713:932 shows "acceptance overdue", but no rule is written) | You | Stage 10 (Batch 6, on hold) | Acceptance reminders, then the order shows as acceptance overdue for Operations; no automatic acceptance | Answered by design | Correction to playbook v1.0: the design does define this. If the buyer does nothing, the whole order is accepted automatically when the window ends (697:8 "What happens next"; Acceptance reminder email 671:756 and its auto-accept variant). Admin 713:932 is about a supplier who has not accepted, not this case. |

## Conflicts found in the design

| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| C1 | Launch-offer end date: the Pricing page says 30 June 2027; the supplier Fees screens, How fees work and the rate card say 31 Jul 2027 | You | Stage 10 (Batch 6, on hold) | One setting in the rate card; value blank until confirmed | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| C2 | Launch-offer start date: How fees work says 1 Aug 2026; the rate card says 1 Jun 2026 | You | Stage 10 (Batch 6, on hold) | Same setting as C1 | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| C3 | Rate card version: Pricing says version 1.0 effective 1 December 2026; admin shows v1 retired, v2 live since 1 Jun 2026 and v3 in draft | You | Stage 10 (Batch 6, on hold) | Versioned rate card as in admin; public page reads the live version | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| C4 | Payout date samples differ between screens (13 Nov on the Fees overview, 14 Nov on the payout account and admin screens) | You | Stage 13 (Batch 5) | Sample data only; the bank-holiday rule behind it (the notes mention a second Saturday) needs M18 | Open |  |
| C5 | Bank-change cooling-off: the operator roles screen says 48 to 72 hours; the payout screen shows 72 hours | You | Stage 8 (Batch 4) | A setting; 72 hours until confirmed | Open |  |
| C6 | Mobile number: the design has a Sign-in OTP SMS and mobile confirmation at Tier 0, but the sign-in screen offers passkey, email code and Google only. Is mobile a sign-in method or only for verification and recovery? | You | Stage 3 (Batch 1) | Verification and recovery only, as the sign-in screen shows | Open |  |
| C7 | Alerts timing: the project notes place alerts in build phase 3, but flow D (tender alert) is P0 | You | Stage 7 (Batch 3) | Build alerts before Launch 1, as the flow priority says | Open |  |
| C8 | Accepting a quote creates an order the supplier must accept within 48 hours (quote states 619:8), but Launch 1 has no orders or payments. What should Accept quote do at Launch 1: hide it, record the choice only, or create the order and let the parties settle off-platform? | You | Stage 9 (Batch 4) | Build the full accept-quote confirmation; the final Confirm is disabled while the transactions flag is off and the buyer is pointed to Message | Answered | Founder, 11 Nov 2026: Launch 1 has no ordering. Accept quote opens a screen saying ordering is available in Launch 2. The screen is not in Figma yet; designing it needs approval (Figma change rule). |
| C9 | Comments: the admin has a Comments queue and comment moderation (630:968, 633:1534), but no public screen shows where comments are written or who may comment | You | Stage 11 (Batch 5) | Build the queue and moderation; no public comment form until it is designed | Open |  |

## Inputs the design does not contain

| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| M1 | Final domain for H2 India, and what happens to hydro.deecodes.io (redirects, existing accounts and data) | You | Stage 0 (Batch 0) | — | Open |  |
| M2 | Legal entity, GSTIN, registered address, grievance officer's name and contact, and final legal texts (terms, privacy, cookies, editorial, corrections, sponsored content) | You and lawyer | Stage 5 (Batch 2) | — | Open |  |
| M3 | Payment partner (Razorpay or Cashfree are named in the notes), whether bank-transfer funds can be held per order, the payee name buyers will see, and whether the word "escrow" may be used | You and partner | Stage 0 for Stage 10 (Batch 0) | — | Parked | Batch 6 on hold (founder, 11 Nov 2026). |
| M4 | Provider for GSTIN, PAN, CIN and bank-account (test deposit) checks | You | Stage 3 (Batch 1) | — | Open |  |
| M5 | SMS provider with DLT registration (headers and templates) and WhatsApp Business provider | You | Stage 3 (Batch 1) | — | Open |  |
| M6 | Sending domain and provider for email | You | Stage 3 (Batch 1) | — | Open |  |
| M7 | Map tiles vendor that shows India's boundaries correctly, for the directory map, ecosystem map and hubs and valleys | You | Stage 6 (Batch 3) | — | Open |  |
| M8 | Engine for reading datasheets (which AI service), where the files may be processed, and the confidence thresholds for High, Medium and Low | You | Stage 8 (Batch 4) | — | Open |  |
| M9 | Hosting for videos and podcast audio | You | Stage 5 (Batch 2) | — | Open |  |
| M10 | Analytics tool and the cookie categories beyond "Necessary" | You | Stage 5 (Batch 2) | — | Open |  |
| M11 | Chartered Accountant sign-off on TCS, TDS, the fee invoice format, e-invoicing (IRN) applicability and the tax wording on screens | You and CA | Stage 10 (Batch 6, on hold) | — | Parked | Batch 6 on hold. |
| M12 | Order tiers A to D: the value thresholds and what each tier changes. The screens name Tier D (letter of credit, two-person payout) but not the thresholds | You | Stage 10 (Batch 6, on hold) | — | Parked | Batch 6 on hold. |
| M13 | Non-functional targets: expected visitors and orders, uptime target, acceptable data-loss and recovery time, monthly hosting budget | You | Stage 0 (Batch 0) | — | Open |  |
| M14 | Access to the existing repository and its hosting; whether live data must be migrated | You | Stage 0 (Batch 0) | — | Open |  |
| M15 | Languages: English only is designed; the language selector is a placeholder. Confirm Hindi stays out of scope | You | Stage 2 (Batch 1) | — | Open |  |
| M16 | Supplier plan purchase: the Pricing page has "Start Growth" but no plan checkout, renewal, upgrade or cancellation screens exist | You | Stage 8 (Batch 4) | — | Open |  |
| M17 | Tablet behaviour: frames exist at 1440 and 390 only. The breakpoints and what happens between them need a rule | You | Stage 2 (Batch 1) | — | Open |  |
| M18 | Working-day calendar: which holidays count, and who maintains the list (clocks and payout dates depend on it) | You | Stage 3 (Batch 1) | — | Open |  |
| M19 | Credit partner for pay later, and who operates the letter-of-credit process | You | After Launch 2 (Batch 6, on hold) | — | Parked | Batch 6 on hold. |
| M20 | Launch content: who writes and approves it; the source of the pre-seeded company profiles | You and content team | Stage 13 (Batch 5) | — | Open |  |
| M21 | Notifications not drawn on page 16 (for example refund processed, payout failed, join request approved): wording and channel for each | You | Stage 3 onwards (Batch 1) | — | Open |  |
| M22 | Penetration-test vendor and date | You | Stage 12 (Batch 5) | — | Open |  |
| M23 | The full catalogue tree: the categories and sub-categories inside the five classes, and the attributes (name, unit, range, filterable, comparable) for each. The frames show examples only (Electrolysers › PEM, Compressors › Diaphragm) | You and content team | Stage 6 (Batch 3) | — | Answered | Founder, 11 Nov 2026: follow the Figma design. Launch with the categories the design names (Systems: 14; plus Tanks & cylinders, Valves & regulators, Sensors & detectors, Catalysts, Testing & certification). Counts shown in Figma (137 categories, product numbers) are sample data. Attribute schema exists only for Systems › Hydrogen compression systems › Diaphragm; other categories start with the common fields until attributes are added in admin Taxonomy. |
| M24 | People directory: who may appear (editor-created profiles, members who opt in, or both), what consent is recorded, and how a person asks to be removed | You and lawyer | Stage 6 (Batch 3) | — | Open |  |
| M25 | Eligibility checker rules: which answers make a scheme a "strong" or "possible" match (the results frame shows the outcome, not the rules) | You and content team | Stage 5 (Batch 2) | — | Open |  |
| M26 | Status page: the maintenance page links to "Live status updates" (679:637), but no status page or provider is chosen | You | Stage 13 (Batch 5) | — | Open |  |

## Found since playbook v1.0 (11 Nov 2026)

| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| C10 | The word "escrow" appears on 24 screens (pages 04, 13, 14, 15) plus 4 prototype copies, including the bank-transfer payee name "H2 India Escrow". Under the RBI payment aggregator directions (Sept 2025) the money sits in the payment partner's escrow account, not an H2 India account. | You | Stage 10 (Batch 6, on hold) | Copy goes through copy keys so it can be changed in one place | Decided, wording pending | Founder, 11 Nov 2026: hide the word for now. Replacement wording was proposed in chat on 11 Nov and is not yet approved. Only affects Launch 2 screens. |
| C11 | Applications: the Marketplace mega menu (372:15548) shows 6 (Production, Storage & transport, Refuelling & mobility, Fuel cells & power, Industrial use, Safety & testing); the marketplace landing (390:7668) shows 7 (Green hydrogen production, Storage & transport, Refuelling & mobility, Fuel cells for power, Industrial decarbonisation, Ports & shipping, Safety & testing). Which list is right? | You | Stage 6 (Batch 3) | Use the landing page's 7 (they match Doc 1) and read both menus from the same data | Open |  |
| C12 | Category name: "Compression systems" (mega menu, class page, popular categories) vs "Hydrogen compression systems" (Add product 612:8, admin Taxonomy 636:596) | You | Stage 6 (Batch 3) | One record with one name; until decided use "Hydrogen compression systems" as the full name and "Compression systems" as the short label | Open |  |
| C13 | When the supplier receives milestone money: buyer screens and the acceptance email say all money is held until the buyer accepts the delivery; the supplier's Awaiting payment screen (811:12584) says "each part 2 working days after the buyer pays it" | You | Stage 10 (Batch 6, on hold) | Hold everything until acceptance (matches the buyer screens, ledger and playbook Section 4) | Parked | Batch 6 on hold. |
| C14 | Cancellation rules by moment: the Doc 4 table could not be located in the project, Drive or searchable chats. The Figma screens define part of the flow (330:27379, 700:519, 715:8, 807:14435, 697:8) | You | Stage 10 (Batch 6, on hold) | Build only what the screens show; anything else goes to Operations | Parked | Founder, 11 Nov 2026: parked. Attach the Doc 4 PDF when Batch 6 starts. |

## Design-system notes (Stage 2)

Small calls made while building the design system. None changes a Figma value; each is reversible.

| ID | Note | Owner | Status | Detail |
|---|---|---|---|---|
| D-UI1 | Text selection colour is not in Figma. Code uses bg/marker (fresh/300 #A8EBBC) with text/primary. | Designer | Default in use | Change in `packages/ui/src/styles/base.css` if the designer picks another token. |
| D-UI2 | Google Fonts' own subsets leave out ₹ (latin subset) and ₂ and → (every Manrope subset), so "H₂" in a Manrope heading would fall back to another font. The fonts are subset from the complete upstream files instead (`scripts/fonts/build_fonts.py`). | Claude | Done | All five required glyphs present in all three fonts; checked by `design-tokens.spec.ts`. |
| D-UI3 | Figma background blur "Glass 16/20" becomes CSS `backdrop-filter: blur(8px/10px)`: CSS takes half of Figma's blur radius, as Figma's own CSS export does. | Designer | To confirm visually | Compare a glass panel side by side when the first one is built (header after scroll). |
| D-UI4 | Semantic colours are classes named after the Figma token: text/primary is `text-primary`, bg/accent is `bg-accent`, border/focus is `border-focus`, icon/link is `text-icon-link`. Primitives keep Figma's code-syntax names (`bg-fresh-50`, `text-ink-500`). | Claude | Done | See `docs/design-tokens.md`. |

## Change log

- 11 Nov 2026: register created from playbook v1.0 Section 6 (57 items). Founder decisions recorded for C8, M23 and C10. G13 corrected (answered by design). Added C10 to C14. Batch 6 (orders and payments) put on hold by the founder; dependent items marked Parked.
- 11 Nov 2026: **Gate 0 approved** by the founder. ADRs 0001 to 0005 and 0007 Accepted; ADR 0006 amended (existing server, not AWS). Domain (M1) deferred: build and test locally first. GitHub repository: `Bharathx7/h2india`.
- 11 Nov 2026: Stage 2 started. Added design-system notes D-UI1 to D-UI4.
