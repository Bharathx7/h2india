# Server plan: VPS with two domains

Status: **Draft, not started** (13 Nov 2026). Nothing in the code has been changed for this yet.

- **Domain A**: website, workspaces (buyer, supplier, member) and backend (APIs).
- **Domain B**: admin (`/admin` and the CMS).

## What the code does today

- **One app serves everything.** The website, the buyer, supplier and member workspaces, `/admin`, the CMS at `/cms` and every API live in one Next.js app (`apps/web`). The worker (`apps/worker`) is a second process. There is no separate "backend" server.
- **Sign-in works for one address only.** `APP_URL` is the base for Better Auth, for Payload's `serverURL`, and for the passkey ID (`rpID = hostname of APP_URL`, `packages/core/src/sign-in/auth.ts`). Sign-in cookies belong to a single host.
- **The worker calls the web app through `APP_URL`** (`packages/core/src/internal.ts`), so those calls go out through the public internet.
- **Nothing for production exists yet.** There is no Dockerfile, no production compose file and no `infra/`. `docker-compose.yml` is for local development only and includes Mailpit.
- Uploaded files must not be served from the app's own domain. Browsers upload straight to storage, so storage needs its own public address.
- ADR 0006 already says to use the existing server with Docker Compose, upgrade it to Ubuntu 24.04 LTS, keep logs 180 days in India, have backups with a tested restore, a firewall, and deploy only through the pipeline. The domain decision (M1) is still **Open**.

## Target layout

```
                 Internet
                    │
     ┌──────────────┴───────────────┐
     │  Reverse proxy (Caddy/nginx) │  HTTPS for every host, real client IP header
     └──┬────────────┬───────────┬──┘
        │            │           │
  A (www/apex)   files.A       B (admin)
        │            │           │
   web-public     MinIO      web-admin      ← same Docker image, different settings
        │                        │
        └──────┬─────────────────┘
               │  internal Docker network only
  Postgres · Redis · Meilisearch · ClamAV · worker
```

**Main recommendation:** run the same app image twice.

|           | web-public (domain A)                              | web-admin (domain B)                                               |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `APP_URL` | `https://A`                                        | `https://B`                                                        |
| Serves    | site, workspaces, `/api/*`, sign-in                | `/admin`, `/cms`, `/api/cms`, `/cms-preview`, sign-in, `/api/auth` |
| Blocks    | `/admin`, `/cms`, `/api/cms`, `/cms-preview` (404) | everything else (301 to domain A); `/` goes to `/admin`            |
| Flags     | maintenance and indexing as needed                 | search indexing always off, plus an `X-Robots-Tag: noindex` header |

**Why two instances rather than one app answering both domains:**

- Each instance gets its own correct `APP_URL`, passkey ID and Payload URL without rewriting the sign-in code.
- Admin sessions can never be used on the public site, and the reverse is also true.
- You can lock domain B down separately with an IP allow-list or VPN.

**What this costs:**

- Operators sign in separately on domain B.
- Passkeys made on domain A don't work on domain B, so operators set up a new passkey there.
- Google sign-in needs both callback URLs.

## Phases

1. **Prepare the server.** Upgrade to Ubuntu 24.04 LTS. Allow only ports 22, 80 and 443 through the firewall. Use SSH keys only, enable fail2ban and automatic security updates, and install Docker with the Compose plugin.
2. **Set up DNS.** Point `A`, `www.A`, `files.A` and `B` (and later `staging.A` and `staging.B`) at the server's IP. If email goes out from domain A, also add SPF, DKIM and DMARC records for the mail provider (M6).
3. **Build the images.** Write Dockerfiles for web (Next standalone output) and worker. CI builds them and pushes them to GitHub Container Registry. Nothing is built on the server.
4. **Write a production compose file** (`infra/compose.prod.yml`):
   - Postgres, Redis, Meilisearch, MinIO, ClamAV, worker, web-public and web-admin.
   - No database or service ports open to the internet.
   - Mailpit removed and a real SMTP provider used instead.
   - Persistent volumes for the data.
5. **Set up the reverse proxy.** Caddy is suggested for automatic certificates, unless the server already runs nginx.
   - Apply the path allow and block rules from the table above.
   - Set the real client IP header and point `AUTH_IP_HEADER` at it.
   - Block `/api/internal/*` from outside.
   - Add HSTS.
6. **Set up file storage.** Serve MinIO at `files.A`, with CORS allowing uploads from both domains. Set `S3_PUBLIC_URL=https://files.A`. Create the buckets once with the same rules as `minio-init`.
7. **Set up secrets.** Each instance gets its own `.env.production` on the server only (permissions 600). Never commit them. Both instances share the same `AUTH_SECRET`, database and so on, and differ only in `APP_URL` and the flags.
8. **First start.**
   - Run `pnpm db:migrate` as a one-off container.
   - Don't seed sample data; `FLAG_SAMPLE_CONTENT` stays off.
   - Run `pnpm search:reindex`.
   - Create the first Super admin.
9. **Backups and logs.** Run a nightly `pg_dump` and copy MinIO to storage away from this server. Do a tested restore before go-live. Keep Docker logs for 180 days and check the server is in India, which CERT-In requires.
10. **Deploys.** A GitHub Action, after the founder's approval, connects to the server, pulls the new image tag, runs the migrations and restarts web, then the worker. Rollback means going back to the previous tag.
11. **Staging first** (`staging.A` and `staging.B`). This is playbook step 1.7, which was waiting for this server. Production (steps 13.1 to 13.3) comes after it.

## Code changes needed later

These are small, and each goes in its own pull request after approval:

- Turn on `output: "standalone"` in `apps/web/next.config.ts`, and add the Dockerfiles and `infra/`.
- Add an `INTERNAL_WEB_URL` setting so the worker calls `http://web-public:3000` inside Docker instead of the public domain. Email links from the worker must keep using domain A.
- Add `/admin` to `MAINTENANCE_OPEN` in `apps/web/src/proxy.ts`, so turning on maintenance doesn't lock admins out.
- Possibly a setting so CMS "view on site" links point to domain A. The 301 covers this until then.
- Update ADR 0006 and `docs/decisions.md`: answer M1 and record the two-domain decision.

## Open questions

1. What are the two domains, and what happens to `hydro.deecodes.io` (M1)?
2. Is the VPS located in India? How much memory does it have? ClamAV, Meilisearch and two web instances need at least 8 GB, and 16 GB is comfortable.
3. Does the server already run nginx or another reverse proxy, or can Caddy be used?
4. Should domain B be locked to office or VPN IPs, or open to anyone with an operator account?
5. Which email provider and sending domain should be used (M6)? Mailpit can't be used in production.
6. Staging on this same server, or production only?
