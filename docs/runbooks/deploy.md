# Deploy to the server

Step 1.7 (ADR 0006, `docs/server.md`). One Docker image runs everything; the server's own nginx sits in front.

| Address              | What                                 | Container (port on 127.0.0.1) |
| -------------------- | ------------------------------------ | ----------------------------- |
| `h2economy.co`       | Website, buyer/supplier/member, APIs | `web-public` (3210)           |
| `admin.h2economy.co` | `/admin` and the CMS (`/cms`)        | `web-admin` (3211)            |

Both web containers run the same image with their own `APP_URL`. Operators sign in on the admin domain separately;
a passkey made on one domain doesn't work on the other.

Until the email provider is chosen (M6), every email (sign-in codes too) is caught by the `mailpit` container and
never delivered. Read it through an SSH tunnel (step 7).

## Before the first deploy (once)

1. **DNS.** Point `h2economy.co` (A record `@`) and `admin.h2economy.co` (A record `admin`) at the server's IP. `www` (CNAME or A) points there too and redirects to `h2economy.co`.
   If the DNS is on Cloudflare, set them to "DNS only" (grey cloud), or nginx sees Cloudflare's address instead of
   the visitor's.
2. **Server memory.** The H2 India containers need about 4 GB on top of what the server already runs (ClamAV alone
   about 1.5 GB). Check with `free -h`.
3. **Image access.** The image is private on GitHub. Create a classic token with only `read:packages`
   (GitHub, Settings, Developer settings, Personal access tokens) and on the server run
   `docker login ghcr.io -u Bharathx7` with the token as the password.

## First deploy

Run on your Mac, from the repository:

```sh
scp infra/compose.prod.yml infra/h2india.env.example infra/new-env.sh <server>:/tmp/
scp infra/nginx/h2india.conf infra/nginx/h2india-proxy.conf infra/nginx/h2india-files.conf <server>:/tmp/
```

Then on the server. `<tag>` is the 12-character tag in the summary of the latest **Image** run on GitHub (Actions).

```sh
# 1. Folder and settings (new random secrets; nothing to type)
sudo mkdir -p /srv/h2india/backups && sudo chown "$USER" /srv/h2india /srv/h2india/backups
mv /tmp/compose.prod.yml /tmp/h2india.env.example /tmp/new-env.sh /srv/h2india/
cd /srv/h2india && sh new-env.sh <tag>

# 2. A short name for the compose command (add the line to ~/.bashrc to keep it)
dc() { docker compose -f /srv/h2india/compose.prod.yml --env-file /srv/h2india/h2india.env "$@"; }

# 3. Services, buckets and database
dc pull
dc up -d postgres redis meilisearch minio clamav mailpit
dc run --rm minio-init
dc run --rm tools pnpm db:migrate

# 4. The apps
dc up -d web-public web-admin worker
dc ps                                  # all "running" or "healthy"
curl -sI http://127.0.0.1:3210 | head -1   # HTTP/1.1 200
curl -sI http://127.0.0.1:3211/sign-in | head -1

# 5. nginx and HTTPS
sudo mv /tmp/h2india-proxy.conf /tmp/h2india-files.conf /etc/nginx/snippets/
sudo mv /tmp/h2india.conf /etc/nginx/sites-available/h2india.conf
sudo ln -s /etc/nginx/sites-available/h2india.conf /etc/nginx/sites-enabled/h2india.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d h2economy.co -d www.h2economy.co -d admin.h2economy.co

# 6. Search indexes (empty until editors publish)
dc run --rm tools pnpm search:reindex

# 7. The first Super admin (works once; refuses when one exists)
dc run --rm tools pnpm admin:bootstrap you@example.com "Your Name"
```

Then sign in at `https://admin.h2economy.co/sign-in` with that email. To read the code, open a tunnel from
your Mac: `ssh -L 8025:127.0.0.1:8025 <server>`, then open http://localhost:8025.

## Every later deploy

1. Merge to `main`. The **Image** workflow builds `ghcr.io/bharathx7/h2india:<tag>` (the first 12 characters of the
   merge commit); the developer gives you the tag.
2. On the server, one command (founder QC, 17 Nov 2026):

```sh
/srv/h2india/deploy.sh <tag>
```

It checks the image exists, backs up the database (`backups/pre-deploy-<time>.dump`), runs the migrations, starts the
new web-public, web-admin and worker, then checks `/api/health` on both apps, the key public and admin pages, and that
the worker stays up. If anything fails it **puts the previous version back by itself** and says so; if the migrations
fail, the old version was never stopped.

Get the script once (and again when it changes):

```sh
curl -fsSL https://raw.githubusercontent.com/Bharathx7/h2india/main/infra/deploy.sh -o /srv/h2india/deploy.sh
chmod +x /srv/h2india/deploy.sh
```

**Roll back by hand:** `/srv/h2india/deploy.sh <previous tag>` (the script prints it after each deploy). Migrations are
not undone, so a rollback is only safe to a version that already worked with the current database; they only add, so
the previous version does.

## Logs, time and monitoring (step 13.3, before Launch 1)

1. **Logs, 180 days or more** (CERT-In Directions, 28 April 2022). Containers log to the journal
   (`infra/compose.prod.yml`); keep it:

   ```sh
   sudo mkdir -p /etc/systemd/journald.conf.d
   sudo cp infra/logging/journald.conf /etc/systemd/journald.conf.d/h2india.conf && sudo systemctl restart systemd-journald
   sudo cp infra/logging/logrotate-nginx /etc/logrotate.d/nginx
   journalctl --disk-usage          # check monthly; raise SystemMaxUse before it fills
   journalctl CONTAINER_TAG=h2india/h2india-web-public-1 --since today   # one service's logs
   ```

   CERT-In also expects the logs to be kept in India: confirm the server (and any backup copy) is hosted in India.

2. **Time**: CERT-In asks for clocks synchronised to NTP (NIC or NPL servers, or ones traceable to them).
   `timedatectl` must say `System clock synchronized: yes`; if not, `sudo apt install chrony` and add
   `server time.nplindia.org iburst` and `server samay1.nic.in iburst` to `/etc/chrony/chrony.conf`.

3. **Outside checks**: in GitHub, set the repository variable `PROD_URL` (`https://h2economy.co`) and the secret
   `HEALTH_TOKEN` (32 random characters; the same value as `HEALTH_TOKEN` in `h2india.env`). The Uptime workflow then
   checks the site every 15 minutes and opens an `uptime` issue on failure. Make sure whoever answers alerts watches
   the repository (Settings → Notifications) so failed runs reach their email and phone.

4. **Alarms**: `curl -H "Authorization: Bearer $HEALTH_TOKEN" https://h2economy.co/api/health/deep | jq`
   lists every alarm with its runbook. Limits for the non-money alarms are the `ops.alarms` setting.

5. **Forced error test** (Done when): break the deep health on purpose (for example stop the worker for 15 minutes so
   deadlines go overdue) and time how long the alert takes to reach the person on call. It must be under five
   minutes from the next check; with checks every 15 minutes, a failure is seen within 15. If that is too slow, add an
   uptime service (M26) pointed at `/api/health/deep` every minute.

## Backups (set up before real content)

Nightly database dump into `/srv/h2india/backups`, kept 14 days (`crontab -e`):

```
30 21 * * * docker compose -f /srv/h2india/compose.prod.yml --env-file /srv/h2india/h2india.env exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > /backups/h2india-$(date +\%F).dump' && find /srv/h2india/backups -name '*.dump' -mtime +14 -delete
```

Copy `/srv/h2india/backups` and the `h2india_miniodata` volume off the server too, and try a restore before go-live
(ADR 0006). Restore: `dc exec -T postgres pg_restore -U h2india -d h2india --clean < backups/<file>.dump`.

## Test accounts (founder, 18 Nov 2026)

Shared buyer, supplier and member accounts for testers in other places. Sign-in codes are caught by Mailpit until
the email provider is chosen (M6), so these three sign in with one password at `/sign-in/test` on the public site.

```sh
dc run --rm tools pnpm testers:create buyer@example.com supplier@example.com member@example.com
```

- It creates (or reuses) the three accounts, a buyer company and a supplier company (test GSTINs from
  `docs/runbooks/test-gstins.md`), sets one new random password for all three, and prints it **once**. Running it
  again replaces the password (do that if it leaks).
- Turn sign-in on: admin **System settings → Test account sign-in** (or `FLAG_TESTER_SIGN_IN=true` in
  `h2india.env`, then `dc up -d web-public`). Turn it off after testing; the accounts stay but can't use a password.
- Test accounts never reach the back office: their sessions are not staff sessions.
- Use addresses made for testing, not a customer's email; the list is kept in the `sign-in.testers` setting.

## Sample product photos (founder, 20 Nov 2026)

The sample products have no supplier people who could upload a photo, so their photos ship with the code
(`packages/core/scripts/sample-photos`, one JPEG per product, named by its slug). After the deploy that adds them:

```sh
dc run --rm tools pnpm samples:photos
```

- Each photo goes through the same checks as a supplier's upload (virus scan, type check, re-encoded into the public
  bucket) and is then attached. It prints one line per product: `attached`, `has a photo` or `rejected: <reason>`.
- It changes sample products only, and only ones without a photo, so running it again changes nothing. ClamAV must
  be up (`dc ps clamav`).

## Useful

- Logs: `dc logs -f --tail 100 web-public` (also `web-admin`, `worker`).
- Maintenance page: set `FLAG_MAINTENANCE=true` in `h2india.env`, then `dc up -d web-public`. Admin stays open.
- Sample content stays off in production (`FLAG_SAMPLE_CONTENT=false`). Search engines stay blocked until Launch 1
  (`FLAG_SEARCH_INDEXING=false`).
- Never expose ports 3210 to 3212 or 8025 in the firewall; only 22, 80 and 443 are open.
