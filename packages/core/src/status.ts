import { and, eq, inArray } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { statusHistory, type Database, type Executor } from "@h2india/db";
import { audit, type RequestContext } from "./audit";

// Status changes (playbook Section 8). changeStatus() moves a record from one status to another, refuses the
// change if the record has already moved on, and writes the status history and the audit entry in the same
// transaction, so the three never disagree.

export class StatusConflictError extends Error {
  readonly code = "STATUS_CONFLICT";
}

export class TransitionNotAllowedError extends Error {
  readonly code = "TRANSITION_NOT_ALLOWED";
}

/** Allowed moves per current status, for example { Draft: ["Submitted"], Submitted: ["Approved", "Rejected"] }. */
export type Transitions = Record<string, readonly string[]>;

type StatusTable = PgTable & { id: PgColumn; status: PgColumn };

export interface ChangeStatus<T extends StatusTable> {
  table: T;
  entityType: string;
  id: string;
  /** The status (or statuses) the record must be in now. */
  from: string | readonly string[];
  to: string;
  actorId: string | null;
  companyId?: string | null;
  reason?: string;
  transitions?: Transitions;
  metadata?: Record<string, unknown>;
  context?: RequestContext;
  /** More writes that must happen in the same transaction, for example adding a membership on approval. */
  also?: (tx: Executor) => Promise<void>;
}

export async function changeStatus<T extends StatusTable>(db: Database, change: ChangeStatus<T>): Promise<void> {
  const from = typeof change.from === "string" ? [change.from] : [...change.from];
  if (change.transitions) {
    const ok = from.every((f) => change.transitions?.[f]?.includes(change.to));
    if (!ok)
      throw new TransitionNotAllowedError(`${change.entityType}: ${from.join("/")} -> ${change.to} is not allowed`);
  }
  // Widened to PgTable so Drizzle's generic select types resolve for any status table.
  const table: PgTable = change.table;
  await db.transaction(async (tx) => {
    const current = await tx
      .select({ status: change.table.status })
      .from(table)
      .where(and(eq(change.table.id, change.id), inArray(change.table.status, from)))
      .for("update");
    const was = current[0]?.status as string | undefined;
    if (was === undefined) {
      throw new StatusConflictError(
        `${change.entityType} ${change.id} is not in ${from.join(" or ")}; it may have changed already`,
      );
    }
    await tx
      .update(change.table)
      .set({ status: change.to } as never)
      .where(eq(change.table.id, change.id));
    await tx.insert(statusHistory).values({
      entityType: change.entityType,
      entityId: change.id,
      fromStatus: was,
      toStatus: change.to,
      actorId: change.actorId,
      reason: change.reason ?? null,
      metadata: change.metadata ?? null,
    });
    await audit(tx, {
      actorId: change.actorId,
      action: "status.change",
      resourceType: change.entityType,
      resourceId: change.id,
      companyId: change.companyId ?? null,
      before: { status: was },
      after: { status: change.to },
      reason: change.reason ?? null,
      context: change.context,
    });
    if (change.also) await change.also(tx);
  });
}
