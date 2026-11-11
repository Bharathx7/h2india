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

| What                    | Command                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Install                 | `pnpm install`                                                                        |
| Local services (Docker) | `cp .env.example .env.local` once, then `pnpm dev:up`, `pnpm health`, `pnpm dev:down` |
| Web app                 | `pnpm dev` (http://localhost:3000)                                                    |
| Worker                  | `pnpm dev:worker`                                                                     |
| All checks              | `pnpm check` (types, lint, format)                                                    |
| Unit tests              | `pnpm test`                                                                           |
| Browser tests           | `pnpm e2e` (app running), or `E2E_START_SERVER=1 pnpm e2e` after `pnpm build`         |
| Build                   | `pnpm build`                                                                          |

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

## Data rules (playbook Section 8)

- Money is whole **paise** in `bigint`, with a currency column. No floats. One formatting helper (₹48,79,400; lakh and crore).
- Times are stored in UTC and shown in IST. Working days come from one calendar module.
- Internal IDs are UUID v7. The references people see (ORD-2026-0091, RFQ-2026-0142) are separate and never reused.
- Statuses use the exact badge words, change only through one function per record, and write history and the audit log.
- Product attributes are validated against the category's attribute schema.
- Soft-delete anything people created. Financial tables are append-only.

## Feature flags

`transactions` is **off** (Batch 6 on hold). Every cart, checkout, order, payment and payout route calls `requireFlag("transactions")` on the server; hiding a button is not enough.

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
