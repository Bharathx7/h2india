# Database conventions and migrations

Playbook step 3.1 (Section 8). PostgreSQL, Drizzle ORM, schema `core` for the application and `cms` for the
content system. Only `packages/core` imports `packages/db` (enforced by ESLint).

## Conventions

| Rule              | How                                                                                                                                                 | Where                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| IDs               | UUID v7, made by the app (time-ordered)                                                                                                             | `id()` in `packages/db/src/columns.ts`                    |
| Time              | `timestamptz`, stored and read as UTC; screens show IST                                                                                             | `utc()`, connections `SET TIME ZONE 'UTC'`                |
| Money             | `bigint` paise plus a 3-letter currency column, never a float                                                                                       | `money("price")`, `Money` in `packages/core/src/money.ts` |
| Rounding          | Percentages in basis points, rounded half away from zero to the paisa                                                                               | `Money.percent()`, tests in `money.test.ts`               |
| Display           | Indian grouping: `₹48,79,400`, paise only when present (`₹1,234.50`)                                                                                | `Money.format()`                                          |
| Reference numbers | `TYPE-YEAR-0001` per type and calendar year in India time; never repeats, gaps possible after a rollback                                            | `nextReference()`                                         |
| Status changes    | `changeStatus()` checks the current status (and the allowed moves), then writes the change, `status_history` and the audit entry in one transaction | `packages/core/src/status.ts`                             |
| Audit             | Append-only `core.audit_log`; the database refuses UPDATE, DELETE and TRUNCATE; secrets masked, bank and ID numbers kept to the last four           | `audit()`, migration 0001                                 |
| Soft delete       | `deleted_at` on records people can remove                                                                                                           | `softDelete` columns                                      |
| Authorship        | `created_by`, `updated_by`                                                                                                                          | `authorship` columns                                      |

Reference types: ORD (order), RFQ (quote request), Q (quote), R (return), PO (purchase order),
GRV (grievance), DRR (delivery receipt), EV (event).

## Sign-in tables (step 3.2)

Better Auth (ADR 0003) reads and writes these through its Drizzle adapter, so their property names are Better
Auth's; the columns follow our conventions. Never write to them except through `packages/core/src/sign-in`.

| Table              | Holds                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `users`            | One row per person (email, name). Companies and roles come in steps 3.3 and 3.4                            |
| `sessions`         | Signed-in browsers: token, expiry (7 days, extended daily while used), IP and browser                      |
| `accounts`         | Google links and Better Auth's email-code marker                                                           |
| `passkeys`         | Public keys only; the private key never leaves the person's device                                         |
| `verifications`    | Sign-in codes (hashed, 10 minutes) and Google sign-in state                                                |
| `rate_limits`      | Better Auth's per-IP counters                                                                              |
| `sign_in_throttle` | Our per-email counters: codes sent, wrong codes, pauses (decision A2). Runbook: `docs/runbooks/sign-in.md` |

## Company tables (step 3.3)

| Table                 | Holds                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `organisations`       | A buyer or supplier company: legal name, PAN (one company per PAN), state, address, verification (Verified, Unverified, Pending) |
| `organisation_gstins` | Each GSTIN of a company (unique) and its status on the GST portal (Active, Inactive, Cancelled, Pending)                         |
| `memberships`         | Who belongs to which company and their role (owner, admin, member; refined in step 3.4)                                          |
| `join_requests`       | Pending, Approved, Rejected, Expired (14 days) or Cancelled; one pending request per person and company                          |
| `invitations`         | Invitations by email (token stored hashed); their screens come with company settings                                             |
| `join_drafts`         | What a person typed in Join before their email is confirmed; keyed by a hashed cookie token, 7 days                              |

People (`users`) also hold the Join details: mobile and when it was verified, job role, path (buyer, supplier,
member) and when they accepted the terms.

## Audit and settings (step 3.6)

| Table       | Holds                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `audit_log` | Who did what to which record, when, from where (IP, user agent, request ID) and why, with masked before and after values |
| `settings`  | Platform settings changed by operators (key, JSON value, who and when); each setting is declared in code with a schema   |

The audit log is append-only in the database: UPDATE and TRUNCATE are always refused, and DELETE only for entries
older than 8 years (decision A18) inside the retention job `pruneAuditLog()`, which records how many it removed.

## Files (step 3.7)

| Table   | Holds                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files` | One row per upload: kind, status (Uploading, Checking, Available, Rejected, Abandoned, Deleted), uploader or a hashed key for a signed-out uploader, owning company, the record it is attached to, declared and detected type and size, SHA-256, storage bucket and keys, image sizes, why it was refused (size, type, virus, unreadable, missing) and when retention removes it |

The bytes are in object storage: `quarantine` (unchecked browser uploads), `private` (documents, opened only by a
signed link) and `public` (checked logos and product images). Support requests (`recovery_requests`, kind
`support`) point at their Work ID with `document_file_id`.

## Migrations

| Command            | What it does                                                                        |
| ------------------ | ----------------------------------------------------------------------------------- |
| `pnpm db:generate` | Writes a SQL migration from schema changes into `packages/db/migrations` for review |
| `pnpm db:migrate`  | Applies pending migrations, forward only (also run by CI and on every deploy)       |
| `pnpm db:seed`     | Loads development and staging data; safe to run twice                               |
| `pnpm db:reset`    | Drops and rebuilds the local database (refuses anything not on this machine)        |

- Every migration is SQL that a person reads in the pull request. Hand-written SQL (triggers, data moves) uses
  `pnpm --filter @h2india/db exec drizzle-kit generate --custom --name <what>`.
- Destructive statements (DROP, ALTER ... DROP, column type changes, TRUNCATE, DELETE, RENAME) fail CI
  (`scripts/check-migrations.mjs`) unless the line before says `-- destructive-ok: <why, who approved>`.
  Prefer expand and contract: add the new column, copy, switch the code, and drop the old one in a later release.

## Tests

Integration tests are named `*.int.test.ts` and run against `TEST_DATABASE_URL` (a database ending in `_test`,
rebuilt from the migrations on every run). CI starts PostgreSQL 17 and Redis for them. Without the variable
they are skipped locally.
