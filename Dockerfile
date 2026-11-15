# One image for the web app, the worker and one-off commands (migrations, reindex, first Super admin). Step 1.7,
# docs/runbooks/deploy.md. Built by .github/workflows/image.yml with `--network host`, because `next build` renders
# some pages and needs the same throwaway PostgreSQL and Redis that CI uses. No real setting is ever baked in: the
# server's env file supplies them at run time.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 SKIP_SIMPLE_GIT_HOOKS=1
RUN npm install -g pnpm@12.18.0
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Canonical links, sitemaps and share cards always use the public site's address, on both domains.
ARG NEXT_PUBLIC_APP_URL=https://h2india.deecodes.io
ARG DATABASE_URL=postgresql://h2india:change-me-postgres@localhost:5432/h2india
ARG REDIS_URL=redis://localhost:6379
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL DATABASE_URL=$DATABASE_URL REDIS_URL=$REDIS_URL
# Throwaway values from .env.example, as in CI; removed again before the image is finished.
RUN cp .env.example .env.local && pnpm build && rm .env.local && rm -rf apps/web/.next/cache

FROM base AS runtime
ENV NODE_ENV=production
# npm and corepack are only needed to install pnpm. Their bundled packages (brace-expansion, undici) carry known
# vulnerabilities the image scan refuses, and nothing at run time uses them.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
# web-public and web-admin run this; the worker and one-off commands override it in infra/compose.prod.yml.
CMD ["pnpm", "--filter", "@h2india/web", "start"]
