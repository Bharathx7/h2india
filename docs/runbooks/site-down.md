# Site down or slow

**Trigger.** The Uptime workflow fails or opens an `uptime` issue; the `clocks`, `queue:*` or `dead-letters` alarm;
people report errors or slowness.

**Impact.** Visitors can't read or sign in; when clocks stop, deadlines (acceptance windows, reminders, payout runs)
don't fire.

## First 15 minutes

1. Post "We're looking into it" on the status page (`/status`, or the page chosen in M26).
2. `dc ps`: every service `running` or `healthy`? Note any that restart.
3. `curl -s http://127.0.0.1:3210/api/health` and `curl -sI https://h2india.deecodes.io | head -1`.
4. If a release went out in the last hour, go to [bad-release.md](bad-release.md).

## Diagnosis

| Look at                   | Command                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which service is failing  | `dc ps`, `dc logs --since 15m web-public worker \| tail -200`                                                                                                                                                       |
| Errors by request ID      | `journalctl CONTAINER_TAG=h2india/h2india-web-public-1 --since "30 min ago" \| grep -i error`                                                                                                                       |
| Server load, memory, disk | `uptime`, `free -h`, `df -h` (Postgres and the journal stop when the disk fills)                                                                                                                                    |
| The alarms                | `curl -s -H "Authorization: Bearer $HEALTH_TOKEN" http://127.0.0.1:3210/api/health/deep \| jq '.alarms[] \| select(.ok == false)'`                                                                                  |
| Database                  | `dc exec postgres pg_isready`; slow queries: `dc exec postgres psql -U h2india -c "select pid, now() - query_start as age, left(query, 80) from pg_stat_activity where state <> 'idle' order by age desc limit 10"` |
| Redis and queues          | `dc exec redis redis-cli -a "$REDIS_PASSWORD" ping`; failed jobs: Admin › System settings                                                                                                                           |
| nginx                     | `sudo tail -100 /var/log/nginx/error.log`                                                                                                                                                                           |

## Fix

- A container stopped or keeps restarting: `dc up -d <service>`; if it fails again, read its logs before anything else.
- Out of memory: `dc restart clamav` frees about 1.5 GB for a while; then add memory (step 1.7 sizing).
- Disk full: `journalctl --vacuum-size=…` only as a last resort (logs must be kept 180 days); delete old dumps in
  `/srv/h2india/backups` beyond 14 days first; then grow the disk.
- Clocks stuck (`clocks` alarm): `dc restart worker`. The worker re-installs its schedules at start and every five
  minutes; overdue deadlines are processed on the next tick.
- Redis lost its data: nothing to restore. Deadlines live in the database; queued emails retry from
  `notification_deliveries`; restart the worker.
- One slow query: cancel it with `select pg_cancel_backend(<pid>)`; record it for step 12.5's slow-query list.
- Under attack (traffic from a few addresses): `deny <ip>;` in `infra/nginx/h2india.conf` on the server, `sudo nginx -t && sudo systemctl reload nginx`.
- Last resort while fixing: switch on maintenance (Admin › System settings › Maintenance). Public pages answer 503
  with the maintenance page; the admin stays open.

Rollback: undo each change above (start the service again, remove the `deny`, switch maintenance off).

## Confirm

The Uptime workflow passes (run it by hand: Actions › Uptime › Run workflow); `/api/health/deep` answers 200; the
`clocks` alarm is clear.

## Who to tell

Update the status page when it's fixed. If orders or payments were affected (Launch 2), tell Finance. If it lasted
over an hour, email the pilot companies.

## Follow-up

Write what happened in `docs/incidents/<date>.md` (private): timeline, cause, fix, what changes.
