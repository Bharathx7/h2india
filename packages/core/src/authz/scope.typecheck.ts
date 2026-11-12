// Compile-time proof for step 3.4: a company query without a scope does not compile. Checked by `pnpm typecheck`.
import type { Executor } from "@h2india/db";
import { getOrganisation, listMembers } from "../companies/repo";

export function proofs(ex: Executor) {
  // @ts-expect-error: the scope argument is required
  void getOrganisation(ex, "00000000-0000-0000-0000-000000000000");
  // @ts-expect-error: a plain object is not a Scope; only scopeFor() makes one
  void listMembers(ex, { actorId: null, everyCompany: true, organisationIds: [] }, "id");
}
