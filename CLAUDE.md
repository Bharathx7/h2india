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

- Upload only through `startUpload` → browser PUT to the signed quarantine link → `completeUpload` → worker `processFile`. Never accept file bytes in a page or API route, and never serve a file from the app's own domain.
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
