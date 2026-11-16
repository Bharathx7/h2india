import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, isNull } from "drizzle-orm";

// "Brands listed on H2 Economy" (home trust strip 379:4415, step 5.1): company profiles in the directory, pre-seeded ones
// included (A38). Sample profiles (F9) only where sample content is switched on.

const { organisations: o, companyProfiles: p } = schema;

export interface ListedBrand {
  name: string;
  slug: string;
}

export async function listedBrands(
  db: Executor,
  opts: { includeSample: boolean; limit?: number },
): Promise<ListedBrand[]> {
  const rows = await db
    .select({ name: p.tradeName, slug: p.slug })
    .from(p)
    .innerJoin(o, eq(o.id, p.organisationId))
    .where(and(isNull(o.deletedAt), opts.includeSample ? undefined : eq(p.sample, false)))
    .orderBy(asc(p.createdAt), asc(p.tradeName))
    .limit(opts.limit ?? 24);
  return rows;
}
