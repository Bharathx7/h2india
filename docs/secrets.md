# Settings and secrets

Playbook step 1.6. This file lists **where** each value lives. It never holds the values.

- **Local:** `.env.local` at the repository root. Copy it from `.env.example` and change every `change-me`. It is git-ignored.
- **Server:** `/srv/h2india/h2india.env`, permissions 600, made with random values by `infra/new-env.sh` from `infra/h2india.env.example` (`docs/runbooks/deploy.md`). Never committed.
- **CI:** GitHub Actions uses throwaway values from `.env.example` for builds and tests. No real secret is ever stored in GitHub, until deploys exist, and then only as encrypted repository secrets.

| Setting                                | Used for                                               | Local                   | Server                                                            | Who may read it       |
| -------------------------------------- | ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------- | --------------------- |
| APP_URL, NEXT_PUBLIC_APP_URL           | Links in emails, redirects                             | `.env.local`            | Server env file                                                   | Not secret            |
| INTERNAL_WEB_URL                       | Worker's address for the web app (step 1.7)            | empty (uses APP_URL)    | Set by `infra/compose.prod.yml`                                   | Not secret            |
| AUTH_SECRET                            | Signs sessions and codes                               | `.env.local` (random)   | Server env file (new random value)                                | Founder, server admin |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google sign-in (step 3.2)                              | `.env.local` (optional) | Server env file                                                   | Founder, server admin |
| AUTH_IP_HEADER                         | Which header holds the visitor's IP                    | `.env.local`            | Server env file (the proxy's header)                              | Not secret            |
| DATABASE_URL, POSTGRES_*               | PostgreSQL                                             | `.env.local`            | Server env file                                                   | Founder, server admin |
| REDIS_URL, REDIS_PASSWORD              | Queues and timers                                      | `.env.local`            | Server env file                                                   | Founder, server admin |
| MEILI_HOST, MEILI_MASTER_KEY           | Search                                                 | `.env.local`            | Server env file                                                   | Founder, server admin |
| S3_*                                   | File storage                                           | `.env.local`            | Server env file                                                   | Founder, server admin |
| SMTP__, EMAIL_FROM_                    | Email (Mailpit locally; provider decision M6)          | `.env.local`            | Server env file                                                   | Founder, server admin |
| FLAG_*                                 | Feature flags (`transactions` stays off)               | `.env.local`            | Server env file                                                   | Not secret            |
| PAYMENT_PARTNER, PAYMENT_SIM_ALLOWED   | Payment partner (`sim` until M3, A176)                 | defaults (`sim`)        | Staging: `PAYMENT_SIM_ALLOWED=true`; live: never                  | Not secret            |
| HEALTH_TOKEN                           | `/api/health/deep` for the outside uptime check (13.3) | empty (endpoint off)    | Server env file and the GitHub secret `HEALTH_TOKEN` (same value) | Founder, on-call      |
| OPS_ALERT_EMAIL                        | Who hears when an alarm starts failing (13.3)          | empty (nobody)          | Server env file                                                   | Not secret            |
| FLAG_OPERATOR_PASSKEY                  | Back office needs a passkey sign-in (A181)             | off                     | On by default in production builds                                | Not secret            |

Later stages add provider keys (verification M4, SMS and WhatsApp M5, email M6, maps M7, datasheet reader M8). Each is added here, in `.env.example` and in `packages/config/src/env.ts` in the same pull request.

**Rules**

- Never paste a secret into chat, an issue, a pull request, a log or a screenshot.
- Claude Code's settings block it from reading `.env` files (`.claude/settings.json`).
- If a secret leaks, rotate it first and investigate second.
