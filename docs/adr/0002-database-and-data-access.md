# ADR 0002: Database and data access

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

Money, orders and the ledger need reliable transactions. Product specifications differ by category. Content needs drafts and versions.

## Options

1. **PostgreSQL**, with Drizzle ORM and reviewed SQL migrations for the platform and commerce tables (schema `core`), and Payload's Postgres adapter for content (schema `cms`), in the same database.
2. PostgreSQL with Prisma (the hy-gen choice).
3. A document database. It is weaker for a double-entry ledger.

## Decision (proposed)

Option 1. Product attributes are stored in JSONB and validated against the category's attribute schema. Money is stored as whole paise in `bigint`. The conventions are in playbook Section 8.

## Consequences

- Payload 3.93's Postgres adapter is built on the same Drizzle line (0.45), so one database toolkit serves both.
- Migrations are forward-only SQL, reviewed in each pull request. CI blocks destructive changes unless they are marked.
- The PostgreSQL major version is chosen in step 1.3. It must match what AWS RDS offers in ap-south-1.

## How to reverse

Drizzle schemas are plain TypeScript, so moving to another ORM later is a mechanical port of the schema and queries.
