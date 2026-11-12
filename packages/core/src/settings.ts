import { settings, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { audit, type RequestContext } from "./audit";
import type { Actor } from "./authz/actor";
import { assertCan } from "./authz/can";

// Platform settings kept in the database and changed by operators (step 3.6). Each setting is declared once with a
// schema and a fallback; later steps declare their own (clocks in 3.8, System settings in 11.8). Feature flags stay
// in packages/config. Every change needs settings.edit and writes an audit entry with the values before and after.

export interface SettingDef<T> {
  key: string;
  description: string;
  schema: z.ZodType<T>;
  /** Used until an operator saves a value. */
  fallback: T;
}

const declared = new Map<string, SettingDef<unknown>>();

export function defineSetting<T>(def: SettingDef<T>): SettingDef<T> {
  const existing = declared.get(def.key);
  if (existing && existing !== def) throw new Error(`Setting "${def.key}" is declared twice`);
  declared.set(def.key, def);
  return def;
}

export function declaredSettings(): SettingDef<unknown>[] {
  return [...declared.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export async function getSetting<T>(ex: Executor, def: SettingDef<T>): Promise<T> {
  const [row] = await ex.select({ value: settings.value }).from(settings).where(eq(settings.key, def.key));
  if (!row) return def.fallback;
  const parsed = def.schema.safeParse(row.value);
  // A stored value that no longer fits the schema falls back rather than breaking the page; the next save fixes it.
  return parsed.success ? parsed.data : def.fallback;
}

export async function setSetting<T>(
  ex: Executor,
  actor: Actor,
  def: SettingDef<T>,
  value: T,
  opts: { reason?: string; context?: RequestContext } = {},
): Promise<void> {
  assertCan(actor, "settings.edit");
  const next = def.schema.parse(value);
  await ex.transaction(async (tx) => {
    const [row] = await tx
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, def.key))
      .for("update");
    const before = row ? row.value : def.fallback;
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    await tx
      .insert(settings)
      .values({ key: def.key, value: next, updatedBy: actor.userId })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: next, updatedBy: actor.userId, updatedAt: new Date() },
      });
    await audit(tx, {
      actorId: actor.userId,
      action: "setting.change",
      resourceType: "setting",
      resourceId: def.key,
      before: { value: before, saved: Boolean(row) },
      after: { value: next },
      reason: opts.reason ?? null,
      context: opts.context,
    });
  });
}
