# Launch 1 go-live checklist (Gate 2)

Step 13.6. The ecosystem product goes live: everything except ordering (`transactions` stays off). Work down the list
on the day; each line has who confirms it.

## A week before

- [ ] Gate 2 signed (`docs/approvals/gate-2.md`), with the Stage 12 results filled in. _Founder_
- [ ] All Launch 1 flows passed three nights running in the nightly suite. _Engineer_
- [ ] Penetration test: no open High or Medium (M22), or the founder's written acceptance. _Founder_
- [ ] Legal pages published and the company details entered (M2). _Founder_
- [ ] Launch content loaded and approved (M20); sample content replaced (F8, F9, C4). _Content_
- [ ] Email domain authenticated (`docs/launch/email-domain.md`, M6). _Engineer_
- [ ] On-call named, `OPS_ALERT_EMAIL` and the Uptime workflow set (A182); status page chosen (M26). _Founder_
- [ ] Support inbox and hours named; help articles published. _Founder_
- [ ] A restore from last night's dump done on staging and timed. _Engineer_

## On the day

- [ ] Take a database dump: `dc exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > backups/pre-launch.dump`. _Engineer_
- [ ] Deploy the launch tag (`deploy.md`); `dc run --rm tools pnpm db:migrate`. _Engineer_
- [ ] `dc run --rm tools pnpm launch:check` passes. _Engineer_
- [ ] Switches: `searchIndexing` on, `comingSoon` off, `transactions` off, `sampleContent` and `devPages` off. _Founder (System settings)_
- [ ] `dc run --rm tools pnpm search:reindex`. _Engineer_
- [ ] Walk flow A by hand on the live site at 1440 and on a phone. _Founder_
- [ ] Uptime workflow green; `/api/health/deep` 200. _Engineer_
- [ ] Old hy-gen addresses redirect (A100, `seo/redirects.json`). _Engineer_
- [ ] Announce. _Founder_

## The way back

Problems in the first hours: maintenance on (System settings), then roll back to the previous tag
(`docs/runbooks/bad-release.md`). Turning `searchIndexing` off again stops indexing new pages but doesn't remove
what was indexed.

## The first week

Read the alarms daily, answer support within the agreed time, and hold a short review at the end of the week.
