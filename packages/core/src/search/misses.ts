import { schema, type Executor } from "@h2india/db";
import { cleanQuery } from "./query";

// Searches that found nothing (step 5.2), for Search management (707:281, step 11.3). The words, the scope and where it
// was typed; never who typed it. Partial words typed into the overlay are not logged: only finished searches are
// (Enter, "See all results", or the /search page). How long they are kept is not decided yet: no prune job until it is.

export type MissSource = "header" | "page";

export async function logSearchMiss(
  db: Executor,
  input: { query: string; scope: string; source: MissSource },
): Promise<void> {
  const query = cleanQuery(input.query).toLowerCase();
  if (query.length < 2) return;
  await db.insert(schema.searchMisses).values({ query, scope: input.scope.slice(0, 20), source: input.source });
}
