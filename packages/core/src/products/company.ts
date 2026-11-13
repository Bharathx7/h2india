import { schema, type Executor } from "@h2india/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { inScope, type Scope } from "../authz/scope";

// A company's own products, drafts included (the supplier's Products screen arrives in step 8.3). Company-owned: the
// scope keeps one company's drafts away from every other company (authz.int.test.ts).
export async function listCompanyProducts(db: Executor, scope: Scope, organisationId: string) {
  const p = schema.products;
  return db
    .select({ id: p.id, slug: p.slug, name: p.name, status: p.status, categoryId: p.categoryId })
    .from(p)
    .where(and(inScope(scope, p.organisationId), eq(p.organisationId, organisationId), isNull(p.deletedAt)))
    .orderBy(asc(p.name));
}

/** Questions buyers asked a supplier (402:12544); the supplier's Messages arrive in step 9.7. Company-owned. */
export async function listCompanyQuestions(db: Executor, scope: Scope, organisationId: string) {
  const q = schema.productQuestions;
  return db
    .select({
      id: q.id,
      productId: q.productId,
      question: q.question,
      sharedCompany: q.sharedCompany,
      createdAt: q.createdAt,
    })
    .from(q)
    .where(and(inScope(scope, q.organisationId), eq(q.organisationId, organisationId)))
    .orderBy(asc(q.createdAt));
}
