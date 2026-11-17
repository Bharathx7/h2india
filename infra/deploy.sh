#!/usr/bin/env bash
# Safe deploy (founder QC, 17 Nov 2026): one command, and the live site never stays broken.
#
#   /srv/h2india/deploy.sh <tag>        for example: /srv/h2india/deploy.sh aea7a59c04fb
#
# 1. Checks the image exists (nothing changes if it doesn't).
# 2. Backs up the database to backups/pre-deploy-<time>.dump.
# 3. Runs the migrations with the new image. If they fail, the old version keeps running.
# 4. Starts the new web-public, web-admin and worker.
# 5. Checks health and the key pages on both domains, and that the worker stays up.
# 6. If any check fails, puts the previous image back and starts it again.
#
# Migrations are not undone by a rollback (they only add, by the project's rules), so the previous version keeps
# working with the database. The backup from step 2 is there if a restore is ever needed (docs/runbooks/deploy.md).
set -euo pipefail

DIR=/srv/h2india
ENV_FILE="$DIR/h2india.env"
REPO=ghcr.io/bharathx7/h2india
cd "$DIR"

dc() { docker compose -f "$DIR/compose.prod.yml" --env-file "$ENV_FILE" "$@"; }
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; }

TAG="${1:-}"
if ! [[ "$TAG" =~ ^[0-9a-f]{12}$ ]]; then
  fail "Give the 12-character image tag, for example: $0 aea7a59c04fb"
  exit 2
fi
NEW="$REPO:$TAG"
PREV="$(grep '^IMAGE=' "$ENV_FILE" | cut -d= -f2-)"
if [ "$PREV" = "$NEW" ]; then
  say "Already on $NEW. Nothing to do."
  exit 0
fi
PUBLIC_PORT="$(grep '^PUBLIC_PORT=' "$ENV_FILE" | cut -d= -f2- || true)"
ADMIN_PORT="$(grep '^ADMIN_PORT=' "$ENV_FILE" | cut -d= -f2- || true)"
PUBLIC_PORT="${PUBLIC_PORT:-3210}"
ADMIN_PORT="${ADMIN_PORT:-3211}"

set_image() { sed -i "s#^IMAGE=.*#IMAGE=$1#" "$ENV_FILE"; }

# The site answers on both apps, the key pages load without a server error, and the worker isn't restarting.
healthy() {
  local i
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:$PUBLIC_PORT/api/health" >/dev/null 2>&1 &&
      curl -fsS "http://127.0.0.1:$ADMIN_PORT/api/health" >/dev/null 2>&1; then
      break
    fi
    [ "$i" = 60 ] && { fail "The apps didn't answer /api/health within 3 minutes."; return 1; }
    sleep 3
  done
  local page code
  for page in / /marketplace /news /sign-in /buyer/sign-in /supplier/sign-in /member/sign-in; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PUBLIC_PORT$page" || true)"
    if [ "$code" -ge 500 ] || [ "$code" = 000 ]; then
      fail "Public page $page answered $code."
      return 1
    fi
  done
  for page in /sign-in /sign-in/staff; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$ADMIN_PORT$page" || true)"
    if [ "$code" -ge 500 ] || [ "$code" = 000 ]; then
      fail "Admin page $page answered $code."
      return 1
    fi
  done
  sleep 20
  local worker
  worker="$(dc ps -q worker || true)"
  if [ -z "$worker" ] || [ "$(docker inspect -f '{{.State.Running}} {{.RestartCount}}' "$worker" || true)" != "true 0" ]; then
    fail "The worker isn't running steadily."
    return 1
  fi
  return 0
}

say "1/6 Checking the image $NEW"
if ! docker pull "$NEW" >/dev/null; then
  fail "No such image (is the build finished?). Nothing was changed; the site still runs $PREV."
  exit 1
fi

say "2/6 Backing up the database"
mkdir -p "$DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
dc exec -T postgres sh -c "pg_dump -U \"\$POSTGRES_USER\" -Fc \"\$POSTGRES_DB\" > /backups/pre-deploy-$STAMP.dump"
if [ ! -s "$DIR/backups/pre-deploy-$STAMP.dump" ]; then
  fail "The backup is empty. Nothing was changed; the site still runs $PREV."
  exit 1
fi
echo "backups/pre-deploy-$STAMP.dump"

say "3/6 Running migrations with the new version"
cp "$ENV_FILE" "$ENV_FILE.before-$STAMP"
set_image "$NEW"
if ! dc run --rm tools pnpm db:migrate; then
  set_image "$PREV"
  fail "Migrations failed. The site still runs $PREV (not restarted). Send the output above to the developer."
  exit 1
fi

say "4/6 Starting the new version"
dc up -d web-public web-admin worker

say "5/6 Checking the site"
if healthy; then
  say "6/6 Done: the site runs $NEW."
  echo "Previous version: $PREV (roll back with: $0 ${PREV##*:})"
  exit 0
fi

say "6/6 Rolling back to $PREV"
set_image "$PREV"
dc up -d web-public web-admin worker
if healthy; then
  fail "The new version failed its checks, so the site is back on $PREV and working. Send the output above to the developer."
else
  fail "The new version failed and the previous one isn't healthy either. Check: dc ps; dc logs --tail 100 web-public"
fi
exit 1
