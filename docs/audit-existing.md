# Audit of the existing hy-gen code

Playbook step 0.5. Read-only review of `C:\Hy-Gen` on 11 Nov 2026. Nothing in that folder was changed.

**Method.**

- Listed the folder structure: `apps/api/src`, `apps/web/src`, `packages/shared`, `apps/api/prisma`, `deploy`.
- Read the main files: root, api, web and shared `package.json`, `schema.prisma`, the docker compose files, the deploy scripts, the payment provider interface, the money helpers, and the project's own `CLAUDE.md` (including its progress log).
- Never opened `.env` (secrets).
- The commit history was not read: the Linux shell on your computer did not start in time. The progress log in `CLAUDE.md` names the commits instead.

## Summary for the founder

hy-gen is a well-built **marketplace demo** with strong security habits. It is a different product from H2 India:

- It has no companies (one user is one role).
- It has no passkeys, CMS, news, opportunities, knowledge, directory, events, alerts or member workspace.
- It has a simpler order flow ("pay at checkout" or purchase order), and no holds, payouts or ledger.
- It is deployed on a shared server.

The live site at hydro.deecodes.io runs in **demo mode**: test payments and seeded demo accounts only.

**Recommendation:** build H2 India fresh in `C:\H2India`, as you decided. **Copy ideas and a few small, proven pieces**, not modules. No live data needs migrating if you confirm the live site holds demo data only (**M14**).

## Inventory

| Area       | What exists                                                                                                                                                                                                              | Evidence                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Shape      | pnpm monorepo: `apps/web` (Next.js 16, React 19, Tailwind 4), `apps/api` (NestJS 11), `packages/shared` (Zod schemas, money)                                                                                             | `package.json`, `pnpm-workspace.yaml`                                   |
| Database   | PostgreSQL 16 with Prisma 6. About 40 models and 13 migrations (5 to 11 Oct 2026). Product attributes in JSONB. Postgres full-text search (`tsvector`, kept by a trigger).                                               | `apps/api/prisma/schema.prisma`                                         |
| Sign-in    | Email and password (Argon2id), JWT access and rotating refresh tokens in httpOnly cookies, CSRF guard, TOTP for admins. One role per user: `BUYER`, `SUPPLIER`, `ADMIN`.                                                 | `modules/accounts/auth/*`, `schema.prisma` (enum Role)                  |
| Suppliers  | Sign-up, company profile, private documents, admin approval, suspend and reinstate                                                                                                                                       | `modules/accounts/suppliers/*`                                          |
| Catalogue  | Categories with per-category attributes and required documents. Products with an approval workflow, certificates, featured flag, public search with attribute filters. **Every product has a price** (`priceMinor`).     | `modules/catalog/*`                                                     |
| RFQ        | Request (up to 5 suppliers, 20 items, 5 attachments), quotes with revise and withdraw, private threads, accept → order                                                                                                   | `modules/rfq/*`                                                         |
| Orders     | Cart (one supplier), checkout (online or purchase order), statuses PLACED, PAID, CONFIRMED, SHIPPED, DELIVERED, CANCELLED. Test payment adapter, webhook verification, reconciliation job, invoice PDFs, refund records. | `modules/orders/*`                                                      |
| Content    | Homepage sections, banners, pages, blog with scheduling. Plain-text rich text, never HTML.                                                                                                                               | `modules/content/*`                                                     |
| Admin      | Dashboard, users, supplier and product review, orders, activity log (no update or delete), reports with CSV export, email outbox and template overrides                                                                  | `apps/web/src/app/(admin)`, `modules/reports`, `modules/platform/email` |
| Tests      | About 180 API tests (Jest) including security tests, plus one Playwright smoke test of the purchase flow                                                                                                                 | `CLAUDE.md` section 14                                                  |
| Deployment | Docker images on a shared Ubuntu 25.04 server behind host nginx and certbot. MinIO for files. Deploy and rollback scripts tagged by commit. **Demo mode:** test payments, emails written to logs, `noindex`.             | `deploy/*`, `docker-compose.prod.yml`, `CLAUDE.md` Phase 12             |

## Gap against the H2 India design and playbook

| H2 India needs (playbook)                                                                                                   | In hy-gen                                                                | Gap                               |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| Passkey, email code and Google sign-in; recovery with two factors (steps 3.2, 3.5)                                          | Password and admin TOTP                                                  | Replace                           |
| Companies with GSTIN check, members, roles and order limits; join requests (3.3, 3.4, 9.1)                                  | One user is one role. No organisation model.                             | Replace                           |
| Seven operator roles with permissions as data (3.4, 11.4)                                                                   | One `ADMIN` role                                                         | Replace                           |
| Content platform: six article types, schemes, tenders, grants, jobs, events, knowledge, tracker, newsletter (Stage 4 and 5) | Pages, banners and a blog only                                           | Replace (Payload CMS)             |
| Five classes, applications, attribute schemas, compare, brands, services (Stage 6)                                          | Categories and attributes (a good base idea)                             | Rebuild using the same JSONB idea |
| Price only on product pages of fixed-price items                                                                            | Every product has a price                                                | Change the rule                   |
| Directory, map, people, claim this profile (6.6, 6.7)                                                                       | Supplier page only                                                       | New                               |
| Member workspace and alerts (Stage 7)                                                                                       | Wishlist only                                                            | New                               |
| Datasheet reader, bulk import, storefront, payout account with hold (Stage 8)                                               | Product form and certificates                                            | New                               |
| RFQ moderation, quote versions with payment schedules, comparison highlights (Stage 9)                                      | RFQ with quotes (a good reference)                                       | Rebuild to the design             |
| Confirm then pay, approvals, holds, delivery code, acceptance, disputes, ledger, payouts, TCS and TDS (Stage 10, on hold)   | Pay at checkout or purchase order. No payouts (listed as "never build"). | Replace when Batch 6 resumes      |
| Search with typo tolerance across five content types (5.2)                                                                  | Postgres full-text on products                                           | Replace (Meilisearch)             |
| Email, SMS and WhatsApp templates (3.9)                                                                                     | Email outbox and plain-text templates (good pattern)                     | Port the pattern                  |
| AWS Mumbai with Terraform, CI deploys, 180-day logs (1.7, 13.1)                                                             | Shared server, manual deploy scripts                                     | Replace                           |

## Verdict per module

| Module                                                                                                                                                                                                                                  | Verdict                                                                            | Why                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Overall application (Next.js web plus separate NestJS API plus Prisma)                                                                                                                                                                  | **Replace** with one Next.js app plus Payload plus Drizzle (Doc 2 shape, ADR 0001) | The H2 India scope (CMS, workspaces, companies) fits one app far better. You chose a new folder.                                                |
| `packages/shared/src/money.ts` and the BigInt totals with half-up rounding                                                                                                                                                              | **Port the idea**                                                                  | Paise integers, string parsing without floats, Indian formatting, crore helper. Rewrite in `packages/core` with the playbook's rules and tests. |
| Security patterns: Zod strict validation, generic errors, log redaction, CSRF and Origin checks, magic-byte file checks, 5-minute signed links, webhook verification with timestamp tolerance and idempotency, append-only activity log | **Port the patterns**                                                              | Proven and tested in this codebase. They match playbook Section 10.                                                                             |
| State machines as explicit transition maps (`order-status.ts`, `rfq-status.ts`)                                                                                                                                                         | **Port the pattern**                                                               | The same approach as playbook steps 9.2 and 10.1, with the H2 India statuses                                                                    |
| CSV export (`reports/csv.ts`: BOM, CRLF, quoting, formula-injection guard)                                                                                                                                                              | **Port as is**                                                                     | Small and correct                                                                                                                               |
| Fonts (`InterVariable`, `ManropeVariable`, `IBMPlexMono` woff2, subset with ₹)                                                                                                                                                          | **Reuse the files** after checking they contain ₹ and subscript 2 (step 2.2)       | Already prepared                                                                                                                                |
| Playwright settings for a slow machine (reduced motion, no background throttling)                                                                                                                                                       | **Reuse the settings**                                                             | Learned the hard way, see notes below                                                                                                           |
| Everything else (auth, catalogue, RFQ, orders, content, admin screens, deployment)                                                                                                                                                      | **Replace**                                                                        | Different model or different design                                                                                                             |

## Live data

The live site is a public demo with seeded accounts (admin, demo buyer, demo supplier) and test payments (`CLAUDE.md` Phase 12). **Proposed answer to M14:** no migration. Keep hydro.deecodes.io running as it is until H2 India Launch 1, then redirect it (step 5.10). Please confirm.

## Security notes

No problems were found in the files read. Two points to carry over:

- The production server runs **Ubuntu 25.04, which is out of support** and is shared with other sites. H2 India moves to AWS (step 1.7), so this only matters while the demo stays live.
- Never copy the hy-gen `.env` into H2 India. Every secret is new.

## Notes that affect how we build

- **Your computer is short on memory for this kind of work.** The old notes say a first page compile can take 10 to 25 minutes with both dev servers running, and background test runs got killed. For H2 India:
  - the heavy checks (full tests, builds, browser tests) run in GitHub Actions
  - Docker services run only when needed
  - one app runs instead of two
- On Windows, never rewrite UTF-8 files with PowerShell 5.1 `Get-Content` or `Set-Content`; it damages characters such as `—`, `·` and `₹`.
