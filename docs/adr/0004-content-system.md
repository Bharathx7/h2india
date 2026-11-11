# ADR 0004: Content system

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

H2 India publishes news (six article types), insights, schemes, tenders, grants, jobs, events, knowledge records and tracker data, with an editorial workflow (in review, legal check, scheduled, published) and seven operator roles.

## Options

1. **Payload CMS 3**, self-hosted inside the same Next.js app. Content types are defined in code. Drafts, versions and access rules are built in.
2. Hand-built editors only. Every editor screen would have to be built from scratch.
3. A hosted CMS. Per-seat cost, and content outside our database.

## Decision (proposed)

Option 1, on **Payload 3.93**. Payload 4.0 is in beta (checked 11 Nov 2026). **Stay on 3.x for the whole build** and review 4.0 only after Launch 1.

## Consequences

- Editors sign in through our sign-in. Payload access rules map to the Editor-in-chief and Content editor roles.
- The admin back office screens on Figma page 15 are our own screens. Payload's editor is used where the design shows record editors.

## How to reverse

Content lives in our PostgreSQL (schema `cms`), so it can be exported if the CMS changes.
