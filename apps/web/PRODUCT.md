# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary (public site priority, founder, 19 Nov 2026): buyers.** Procurement teams and project engineers at Indian industrial companies (refineries, fertiliser, steel, mobility, project developers) sourcing hydrogen equipment, components and services: electrolysers, fuel cells, compressors, tanks, valves, sensors, testing and certification. Job: find verified suppliers, compare like-for-like by specification and lead time, and send one request for quotes to up to 5 suppliers.
- **Suppliers:** Indian and global equipment and service companies. Job: list free, get verified, receive and answer quote requests.
- **Members and readers:** policy teams, developers, investors, researchers, engineers, students. Job: follow Indian hydrogen news, schemes, tenders, grants, jobs, events and the India Hydrogen Tracker; members also use the Directory.
- **Staff:** H2 Economy operators in the back office (admin domain, separate surface).

## Product Purpose

H2 Economy (renamed from H2 India on 16 Nov 2026) is India's hydrogen ecosystem platform: a marketplace (request for quotes; prices only on fixed-price product pages), a company directory (members only), news and insights, schemes, tenders, grants, jobs, knowledge, the India Hydrogen Tracker and events, with buyer, supplier, member and admin workspaces. Success for the public site right now: a buyer lands, trusts what they see, and sends a request for quotes.

## Positioning

The one India-specific hydrogen platform: source-checked news, schemes, tenders and tracker data, plus a verified-supplier quote marketplace, so you can follow the market and act on it in the same place. (Confirmed by founder, 19 Nov 2026.)

## Operating Context

- Buyers work from a specification and a delivery site and date; they compare suppliers on spec fit and lead time, not on list price.
- Every request is checked by H2 Economy within 1 working day before it goes out; suppliers answer in one quote format.
- Scheme, tender and tracker items carry an official source and an "as of" or "last verified" date. Times are IST.
- Visitors use desktop at work and phones (tested at 1440 and 390 px).

## Capabilities and Constraints

- Ordering and payments (`transactions` flag) are **off** in production until Launch 2. Nothing may promise escrow, "pay after delivery" or GST invoices while it is off (decision A169).
- No price on cards, search, filters, compare or listing tables; prices only on fixed-price product pages.
- The Directory is for members and staff; single company profiles are open to signed-in people.
- Search indexing is off until decision A99.
- Never invent a price, threshold, date, tax figure, statistic or legal wording. Open items live in `docs/decisions.md`.
- Visual system: colours, type, radius, shadows and motion come only from the Figma file **hydrogen** via tokens in `packages/ui` (`docs/design-tokens.md`). The founder chose to upgrade the design **within the existing tokens** (19 Nov 2026); token values are not changed in code.

## Brand Commitments

- Name: **H2 Economy** (wordmark "H₂ Economy"). Code, database and server names keep `h2india`.
- Voice: plain, specific, Indian English; checked against the source; no hype.
- Green fills take ink text, never white.

## Evidence on Hand

- Real: tracker figures with official sources (SECI, MNRE), scheme and tender records with sources, the site's own content in the CMS.
- Product photos: suppliers can upload real product images through the CMS media library; few exist yet, so designs must work well without them.
- **Absent, must not be fabricated:** licensed photography, partner or customer logos, testimonials, case studies, usage numbers. Test and sample records in production are not evidence.

## Product Principles

1. Buyers first: every public page should make the path to a request for quotes obvious.
2. Show the source: data, deadlines and claims carry where they came from and when.
3. Never promise what is switched off.
4. Real or nothing: no stock photos, fake logos or invented figures; illustration and real data instead.

## Accessibility & Inclusion

WCAG 2.1 AA (see `docs/accessibility/`). Keyboard focus visible everywhere, reduced motion respected, works at 390 px.
