#!/usr/bin/env sh
# Creates h2india.env next to this script from h2india.env.example, with a new random value for every secret
# (step 1.7, docs/runbooks/deploy.md). Refuses to overwrite an existing file. Prints no secret.
#   sh new-env.sh <image tag>
set -eu
cd "$(dirname "$0")"
[ -e h2india.env ] && { echo "h2india.env already exists; not touching it."; exit 1; }
[ $# -eq 1 ] || { echo "Usage: sh new-env.sh <image tag, e.g. 1a2b3c4d5e6f>"; exit 1; }

rand() { openssl rand -hex "$1"; }
AUTH=$(rand 32); PG=$(rand 24); RD=$(rand 24); MEILI=$(rand 24); S3=$(rand 24)

umask 077
sed \
  -e "s#^IMAGE=.*#IMAGE=ghcr.io/bharathx7/h2india:$1#" \
  -e "s#^AUTH_SECRET=.*#AUTH_SECRET=$AUTH#" \
  -e "s#^POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=$PG#" \
  -e "s#^DATABASE_URL=.*#DATABASE_URL=postgresql://h2india:$PG@postgres:5432/h2india#" \
  -e "s#^REDIS_PASSWORD=.*#REDIS_PASSWORD=$RD#" \
  -e "s#^REDIS_URL=.*#REDIS_URL=redis://:$RD@redis:6379#" \
  -e "s#^MEILI_MASTER_KEY=.*#MEILI_MASTER_KEY=$MEILI#" \
  -e "s#^S3_SECRET_KEY=.*#S3_SECRET_KEY=$S3#" \
  h2india.env.example > h2india.env
chmod 600 h2india.env
grep -v '^#' h2india.env | grep -q change-me && { echo "Some change-me values are left in h2india.env; edit them."; exit 1; }
echo "h2india.env created (permissions 600)."
