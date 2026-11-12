import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { loadActor } from "./actor";

// Who someone is, for the workspace shell (194:1190, 194:1191): name, contact details, their first company and which
// workspace they see (operators admin, company people their company's, everyone else member).

export type WorkspaceKind = "admin" | "supplier" | "buyer" | "member";

export async function identityOf(ex: Executor, userId: string) {
  const actor = await loadActor(ex, userId);
  const [person] = await ex
    .select({ name: schema.users.name, email: schema.users.email, mobile: schema.users.mobile })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  const seat = [...actor.companies.entries()][0];
  const [org] = seat
    ? await ex
        .select({ name: schema.organisations.legalName })
        .from(schema.organisations)
        .where(eq(schema.organisations.id, seat[0]))
    : [];
  const area: WorkspaceKind = actor.platform.has("operator")
    ? "admin"
    : seat?.[1].kind === "supplier"
      ? "supplier"
      : seat
        ? "buyer"
        : "member";
  return {
    area,
    name: person?.name.trim() ?? "",
    email: person?.email ?? "",
    mobile: person?.mobile ?? null,
    organisationId: seat?.[0] ?? null,
    company: org?.name ?? null,
  };
}
