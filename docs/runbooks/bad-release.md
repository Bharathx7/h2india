# A release broke something

**Trigger.** Errors, a broken page or a failing flow right after a deploy (the Uptime workflow, the nightly suite,
people's reports).

**Impact.** Depends on what broke; anything after the deploy is suspect.

## First 15 minutes

1. Note the tag now running: `grep ^IMAGE= h2india.env`, and the previous one (the Image runs on GitHub, or your
   deploy notes).
2. Decide quickly: **if the release had no migration, roll back now**, then investigate.

## Diagnosis

- Did the release include a migration? Look at the pull request, or `ls packages/db/migrations` between the two tags.
- `dc logs --since 30m web-public | grep -i error` for the failing page; match the request ID shown on the error
  page (`(site)/error.tsx` shows the digest).

## Fix

**Roll back (no migration in the release):**

```sh
cd /srv/h2india
sed -i "s#^IMAGE=.*#IMAGE=ghcr.io/bharathx7/h2india:<previous tag>#" h2india.env
dc up -d web-public web-admin worker
```

**The release had a migration:** never undo an applied migration. Rolling back is only safe if the previous version
still works with the new schema (an added table or column usually is; a renamed or dropped one isn't). If unsure,
fix forward: a new commit, the Image workflow, and deploy it the normal way. Switch on maintenance while you do.

**Data damaged:** restore only the affected rows from the latest dump into a scratch database and copy them back;
a full restore loses everything since the dump (see `docs/drills/` for timings).

Rollback of the rollback: set the newer tag again and `dc up -d web-public web-admin worker`.

## Confirm

The broken page or flow works; the Uptime workflow passes; run the nightly suite by hand (Actions › CI › Run
workflow) if the change was large.

## Who to tell

The team; the status page if people were affected.

## Follow-up

Add a test that would have caught it, in the same pull request as the fix.
