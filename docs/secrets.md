# Settings and secrets

Playbook step 1.6. This file lists **where** each value lives. It never holds the values.

- **Local:** `.env.local` at the repository root. Copy it from `.env.example` and change every `change-me`. It is git-ignored.
- **Server:** an environment file on the existing server, readable only by the deploy user. Created when we move to the server (ADR 0006). Never committed.
- **CI:** GitHub Actions uses throwaway values from `.env.example` for builds and tests. No real secret is ever stored in GitHub, until deploys exist, and then only as encrypted repository secrets.

| Setting                      | Used for                                      | Local                 | Server                             | Who may read it       |
| ---------------------------- | --------------------------------------------- | --------------------- | ---------------------------------- | --------------------- |
| APP_URL, NEXT_PUBLIC_APP_URL | Links in emails, redirects                    | `.env.local`          | Server env file                    | Not secret            |
| AUTH_SECRET                  | Signs sessions and codes                      | `.env.local` (random) | Server env file (new random value) | Founder, server admin |
| DATABASE_URL, POSTGRES_*     | PostgreSQL                                    | `.env.local`          | Server env file                    | Founder, server admin |
| REDIS_URL, REDIS_PASSWORD    | Queues and timers                             | `.env.local`          | Server env file                    | Founder, server admin |
| MEILI_HOST, MEILI_MASTER_KEY | Search                                        | `.env.local`          | Server env file                    | Founder, server admin |
| S3_*                         | File storage                                  | `.env.local`          | Server env file                    | Founder, server admin |
| SMTP_*, EMAIL_FROM           | Email (Mailpit locally; provider decision M6) | `.env.local`          | Server env file                    | Founder, server admin |
| FLAG_*                       | Feature flags (`transactions` stays off)      | `.env.local`          | Server env file                    | Not secret            |

Later stages add provider keys (verification M4, SMS and WhatsApp M5, email M6, maps M7, datasheet reader M8). Each is added here, in `.env.example` and in `packages/config/src/env.ts` in the same pull request.

**Rules**

- Never paste a secret into chat, an issue, a pull request, a log or a screenshot.
- Claude Code's settings block it from reading `.env` files (`.claude/settings.json`).
- If a secret leaks, rotate it first and investigate second.
