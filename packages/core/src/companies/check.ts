import { schema, type Executor } from "@h2india/db";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { gstinProvider, GstinProviderUnavailableError } from "./adapters/gstin";
import { isValidGstin, normaliseGstin, panOf, stateOf } from "./gstin";
import type { GstinState } from "./rules";

// One of the eight GSTIN outcomes (Figma 526:8). Duplicates are found on GSTIN and PAN, never on the name.

const { organisations: o, organisationGstins: g, memberships: m } = schema;

/** A company that already holds this GSTIN, or another GSTIN with the same PAN. */
export async function findRegistered(ex: Executor, gstin: string) {
  const rows = await ex
    .selectDistinct({ id: o.id, name: o.legalName })
    .from(o)
    .leftJoin(g, eq(g.organisationId, o.id))
    .where(and(isNull(o.deletedAt), or(eq(g.gstin, gstin), eq(o.pan, panOf(gstin)))))
    .limit(1);
  const found = rows[0];
  if (!found) return null;
  const [members] = await ex.select({ n: count() }).from(m).where(eq(m.organisationId, found.id));
  return { ...found, members: members?.n ?? 0 };
}

export async function checkGstin(ex: Executor, raw: string, options: { attempt?: number } = {}): Promise<GstinState> {
  const gstin = normaliseGstin(raw);
  if (!isValidGstin(gstin)) return { state: "invalid_format" };

  const registered = await findRegistered(ex, gstin);
  if (registered) {
    return {
      state: "already_registered",
      gstin,
      organisationId: registered.id,
      name: registered.name,
      members: registered.members,
    };
  }

  const provider = gstinProvider();
  try {
    const record = await provider.lookup(gstin, options);
    if (!record) return { state: "not_found", gstin };
    if (record.status !== "Active") {
      return { state: "inactive", gstin, status: record.status, legalName: record.legalName };
    }
    const all = (await provider.listByPan(panOf(gstin), options)).filter((r) => r.status === "Active");
    if (all.length > 1) {
      // The one typed comes first, so it is the default choice.
      const ordered = [record, ...all.filter((r) => r.gstin !== gstin)];
      return {
        state: "several",
        pan: panOf(gstin),
        legalName: record.legalName,
        gstins: ordered.map((r) => ({ gstin: r.gstin, stateName: stateOf(r.gstin), city: r.city })),
      };
    }
    return {
      state: "valid",
      gstin,
      pan: panOf(gstin),
      legalName: record.legalName,
      stateName: stateOf(gstin),
      city: record.city,
      address: record.address,
    };
  } catch (error) {
    if (error instanceof GstinProviderUnavailableError) {
      return { state: "pending", gstin, pan: panOf(gstin), stateName: stateOf(gstin) };
    }
    throw error;
  }
}
