# Search (step 5.2)

One search box finds products, companies, news, schemes, tenders, events and knowledge. It forgives typos
("electrolyzer", "compresor") and never shows a price. The engine is Meilisearch (ADR 0005); its indexes are a copy and
the database is the truth.

## How a change reaches search

1. An editor saves, publishes, unpublishes or deletes a record in the CMS, or the company importer writes a profile.
2. In the same database transaction a row is added to `core.search_outbox` ("this record changed").
3. The worker is nudged a few seconds later, and also sweeps every minute. It asks the web app
   (`/api/internal/search-sync`) to read each changed record again: if readers may see it (published, not sample
   where samples are hidden) it is written to its index, otherwise it is removed.
4. Once a day (00:05 IST) every scheme, tender, grant, job and event is refreshed, because their status follows the date.

So an unpublished article leaves search within a minute, even if Redis or the worker was briefly down. Applied outbox rows
are kept for 7 days; a row that keeps failing stays with its error in `last_error` after 10 attempts.

Drafts, private listings, RFQs and anything a company keeps private never go into these indexes. Workspace search uses
separate, scoped database queries.

## Commands

| What                                  | Command                                        |
| ------------------------------------- | ---------------------------------------------- |
| Rebuild every index from the database | `pnpm search:reindex`                          |
| Rebuild some indexes                  | `pnpm search:reindex articles companies`       |
| Locally, include the sample content   | `FLAG_SAMPLE_CONTENT=true pnpm search:reindex` |

A rebuild fills a new copy beside the live one and swaps them, so searches keep working while it runs.

## Where things are

| What                                    | Where                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Index fields, synonyms, scopes          | `packages/core/src/search/indexes.ts`                                                      |
| The no-price rule for product documents | `packages/core/src/search/documents.ts`                                                    |
| Outbox and sync                         | `packages/core/src/search/outbox.ts`, `apps/web/src/app/api/internal/search-sync/route.ts` |
| Documents built from CMS records        | `apps/web/src/search/documents.ts`                                                         |
| Header overlay                          | `packages/ui/src/components/SearchOverlay.tsx`, `apps/web/src/components/HeaderSearch.tsx` |
| Search page                             | `apps/web/src/app/(app)/(site)/search/page.tsx`                                            |
| Searches with no results                | `core.search_misses` (the words, scope and time; never who searched)                       |

## Adding synonyms

Add a group to `SYNONYM_GROUPS` in `indexes.ts` (every word in a group means the others), then run
`pnpm search:reindex` or wait for the next sync, which applies the settings. Decision A50 holds the list.

## If search shows "We couldn't load search results"

The web app can't reach Meilisearch. Check `pnpm health` (or `docker compose ps meilisearch`), then rebuild with
`pnpm search:reindex` if the engine lost its data.
