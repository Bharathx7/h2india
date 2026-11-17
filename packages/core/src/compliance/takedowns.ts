import { schema, type Database } from "@h2india/db";
import { eq } from "drizzle-orm";
import type { RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { notify } from "../notify/notify";
import { supplierCatalogueTeam } from "../products/editor";
import { PRODUCT_TRANSITIONS } from "../products/rules";
import { queueIndexChange } from "../search/outbox";
import { changeStatus } from "../status";

// Takedown decisions (founder QC, 17 Nov 2026): a "Report this listing" report could be read on Compliance but never
// answered, so it stayed open for ever. An operator with compliance.edit now resolves it (the report was right; the
// listing can be paused at the same time) or rejects it (nothing wrong). Statuses change through changeStatus(), so
// the history and the audit log record who decided and why. Notices are in the app only until the email wording is
// approved (M21). Time limits still wait on M2.

export const TAKEDOWN_TRANSITIONS = {
  Received: ["Resolved", "Rejected"],
} as const;

export class TakedownError extends Error {}

const lr = schema.listingReports;
const p = schema.products;

export async function decideTakedown(
  db: Database,
  actor: Actor,
  input: {
    reportId: string;
    outcome: "Resolved" | "Rejected";
    /** Pause the live listing while the supplier fixes it (Resolved only). */
    pauseListing?: boolean;
    note: string;
    context?: RequestContext;
  },
) {
  assertCan(actor, "compliance.edit");
  const note = input.note.trim();
  if (!note) throw new TakedownError("Say what you found, for the record");
  const [row] = await db
    .select({ report: lr, product: p })
    .from(lr)
    .innerJoin(p, eq(p.id, lr.productId))
    .where(eq(lr.id, input.reportId));
  if (!row) throw new TakedownError("No such report");
  const pause = input.outcome === "Resolved" && input.pauseListing === true && row.product.status === "Live";
  await changeStatus(db, {
    table: lr,
    entityType: "listing_report",
    id: row.report.id,
    from: "Received",
    to: input.outcome,
    actorId: actor.userId,
    companyId: row.product.organisationId,
    reason: note,
    metadata: { pausedListing: pause },
    transitions: TAKEDOWN_TRANSITIONS,
    context: input.context,
  });
  if (pause) {
    await changeStatus(db, {
      table: p,
      entityType: "product",
      id: row.product.id,
      from: "Live",
      to: "Paused",
      actorId: actor.userId,
      companyId: row.product.organisationId,
      reason: `Paused after a listing report: ${note}`,
      transitions: PRODUCT_TRANSITIONS,
      context: input.context,
      also: async (tx) => {
        await queueIndexChange(tx, "products", [row.product.id]);
      },
    });
  }
  const tell = async (work: () => Promise<unknown>) => {
    try {
      await work();
    } catch (error) {
      console.error("takedown notice failed", error);
    }
  };
  if (pause)
    for (const person of await supplierCatalogueTeam(db, row.product.organisationId))
      await tell(() =>
        notify({
          event: "listing.paused_after_report",
          topic: "company.verification",
          userId: person.id,
          scope: row.product.organisationId,
          inApp: {
            category: "account",
            icon: "pause",
            title: `${row.product.name} is paused after a report`,
            body: note,
            href: `/supplier/products/${row.product.id}`,
          },
        }),
      );
  const reporter = row.report.reporterId;
  if (reporter)
    await tell(() =>
      notify({
        event: input.outcome === "Resolved" ? "listing_report.resolved" : "listing_report.rejected",
        topic: "account.security",
        userId: reporter,
        inApp: {
          category: "account",
          icon: input.outcome === "Resolved" ? "check-circle" : "info",
          title:
            input.outcome === "Resolved"
              ? `Thanks: we acted on your report about ${row.product.name}`
              : `We checked your report about ${row.product.name} and found nothing to change`,
        },
      }),
    );
}
