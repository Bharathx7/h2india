# ADR 0001: Application shape

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

H2 India has a public website (about 20 kinds of public pages), four workspaces (buyer, supplier, member, admin), a content editor, an API for webhooks, and background work (messages, clocks, imports, search indexing). Doc 2 recommends a modular monolith. The old hy-gen code uses two apps (Next.js web plus a NestJS API). The founder chose a new folder, `C:\H2India`, on 11 Nov 2026.

## Options

1. **One Next.js app plus one worker process, in a pnpm monorepo** (Doc 2). Business rules live in `packages/core`. Screens, API routes and the CMS share them.
2. Separate front end and API (the hy-gen shape). Two deployables and a network hop for every screen. Rules are split across apps.
3. Microservices. Too much to run for a small team.

## Decision (proposed)

Option 1. The layout is in playbook Section 7: `apps/web`, `apps/worker`, `packages/{ui,core,db,emails,config}`, `infra`, `tests/e2e`.

## Consequences

- One build and one deploy unit (plus the worker). It is easier for Claude Code and a small team.
- Module boundaries are enforced by lint rules (pages may not import `packages/db`) instead of network boundaries.
- If one part later needs to scale on its own (for example search or the worker), it is already a separate process.

## How to reverse

Business rules are in `packages/core`, not in pages, so an API app could be split out later without rewriting the rules.
