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
