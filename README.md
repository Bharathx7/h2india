# H2 India

India's hydrogen ecosystem platform: marketplace, directory, news and insights, schemes, tenders, grants, jobs, knowledge, the India Hydrogen Tracker and events, with buyer, supplier, member and admin workspaces.

The design source is the Figma file **hydrogen** (key `swxSe4zWyngLYdZ2Qe9CWJ`). The build follows `docs/playbook.pdf` (Development Execution Playbook v1.0), one step at a time.

## Status

Gate 0 was approved on 11 Nov 2026. **Batch 1 (foundations)** is in progress: Stage 1 (steps 1.1 to 1.6) is done, and step 1.7 waits for the move to the server. See `docs/progress.md`.

## Quick start

```bash
pnpm install
cp .env.example .env.local      # then change the change-me values
pnpm dev:up && pnpm health      # local database, Redis, search, file storage, mail catcher (needs Docker)
pnpm dev                        # http://localhost:3000
pnpm check && pnpm test         # types, lint, format, unit tests
```

## Where things are

| File                     | What it is                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `docs/playbook.pdf`      | The build playbook: every step, prompt and check                                                  |
| `docs/decisions.md`      | Every open question, its default and your answers. **The only place decisions are recorded.**     |
| `docs/progress.md`       | Status of all 111 steps                                                                           |
| `docs/figma-index.md`    | Every Figma screen with its node ID and the step that builds it                                   |
| `docs/approvals/`        | Gate approvals                                                                                    |
| `docs/adr/`              | Architecture decisions                                                                            |
| `docs/versions.md`       | Package versions checked on 11 Nov 2026                                                           |
| `docs/audit-existing.md` | What we reuse from the old hy-gen code                                                            |
| `docs/vendors.md`        | Outside accounts to open, and the questions to ask vendors                                        |
| `docs/setup.md`          | Tools for this computer and how to connect Claude Code to Figma                                   |
| `scripts/check-env.mjs`  | Checks the tools are installed: `node scripts/check-env.mjs`                                      |
| `.mcp.json`              | Connects Claude Code to the Figma file. Not created yet: run the command in `docs/setup.md` once. |
