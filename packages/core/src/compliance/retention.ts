import type { Database } from "@h2india/db";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { defineSetting, getSetting } from "../settings";

// Retention (step 12.2): personal data past its period is deleted or anonymised. Periods are decided by the founder
// and the lawyer (docs/privacy/inventory.md); until then every period is null and nothing is removed. The nightly
// job always reports what it would remove, so the decision can be made on real numbers; it acts only when `enforce`
// is on and only for rules with a period. Periods already fixed elsewhere (notifications, audit log, sign-in codes,
// report leads) keep their own jobs.

export const RETENTION_RULES = [
  "sessions-expired",
  "join-drafts-expired",
  "invitations-ended",
  "recovery-requests-closed",
  "cookie-consents",
  "newsletter-unsubscribed",
  "webinar-registrations",
  "notification-deliveries",
  "grievances-resolved",
  "data-rights-closed",
  "listing-reports",
  "dead-letters-resolved",
] as const;
export type RetentionRule = (typeof RETENTION_RULES)[number];

const days = z.number().int().min(1).max(36_500).nullable();

export const RETENTION = defineSetting<{ enforce: boolean; days: Partial<Record<RetentionRule, number | null>> }>({
  key: "privacy.retention",
  description: "Retention periods in days per kind of personal data (null: not decided), and whether the job acts",
  schema: z.object({ enforce: z.boolean(), days: z.partialRecord(z.enum(RETENTION_RULES), days) }),
  fallback: { enforce: false, days: {} },
});

interface Rule {
  key: RetentionRule;
  table: string;
  what: string;
  action: "delete" | "anonymise";
  /** Rows whose period has run: `end` is the moment the period counts from. */
  end: SQL;
  /** Only rows in this state count (finished ones). */
  only?: SQL;
  /** For anonymise: the columns to clear. */
  set?: SQL;
  /** Rows already anonymised don't count again. */
  done?: SQL;
}

const ERASED_EMAIL = sql`'erased-' || left(id::text, 8) || '@erased.invalid'`;

const RULES: Rule[] = [
  {
    key: "sessions-expired",
    table: "core.sessions",
    what: "Signed-in sessions after they expire (IP address, browser)",
    action: "delete",
    end: sql`expires_at`,
  },
  {
    key: "join-drafts-expired",
    table: "core.join_drafts",
    what: "Join answers never confirmed",
    action: "delete",
    end: sql`expires_at`,
  },
  {
    key: "invitations-ended",
    table: "core.invitations",
    what: "Team invitations accepted, withdrawn or expired",
    action: "delete",
    end: sql`coalesce(accepted_at, revoked_at, expires_at)`,
  },
  {
    key: "recovery-requests-closed",
    table: "core.recovery_requests",
    what: "Account recovery contact details after the request ends",
    action: "anonymise",
    end: sql`coalesce(decided_at, expires_at)`,
    set: sql`new_mobile = null, new_email = null, contact_name = null, contact_company = null, contact_email = null`,
    done: sql`contact_email is null and new_email is null and new_mobile is null and contact_name is null`,
  },
  {
    key: "cookie-consents",
    table: "core.cookie_consents",
    what: "Records of cookie choices",
    action: "delete",
    end: sql`created_at`,
  },
  {
    key: "newsletter-unsubscribed",
    table: "core.newsletter_subscribers",
    what: "Email addresses that unsubscribed from the newsletter",
    action: "anonymise",
    end: sql`unsubscribed_at`,
    only: sql`status = 'unsubscribed'`,
    set: sql`email = ${ERASED_EMAIL}`,
    done: sql`email like 'erased-%@erased.invalid'`,
  },
  {
    key: "webinar-registrations",
    table: "core.webinar_registrations",
    what: "Webinar registrants' name, email, mobile and company",
    action: "anonymise",
    end: sql`created_at`,
    set: sql`name = 'Erased person', email = ${ERASED_EMAIL}, mobile = null, organisation = null, role = null`,
    done: sql`email like 'erased-%@erased.invalid'`,
  },
  {
    key: "notification-deliveries",
    table: "core.notification_deliveries",
    what: "Addresses and contents of sent messages",
    action: "anonymise",
    end: sql`created_at`,
    set: sql`recipient = 'erased', payload = null`,
    done: sql`recipient = 'erased'`,
  },
  {
    key: "grievances-resolved",
    table: "core.grievances",
    what: "Contact details on resolved grievances",
    action: "anonymise",
    end: sql`resolved_at`,
    set: sql`name = 'Erased person', email = ${ERASED_EMAIL}, mobile = null`,
    done: sql`email like 'erased-%@erased.invalid'`,
  },
  {
    key: "data-rights-closed",
    table: "core.data_rights_requests",
    what: "Requester's email and details after the request is completed",
    action: "anonymise",
    end: sql`completed_at`,
    set: sql`email = ${ERASED_EMAIL}, details = null`,
    done: sql`email like 'erased-%@erased.invalid'`,
  },
  {
    key: "listing-reports",
    table: "core.listing_reports",
    what: "Reporter's email and details on listing reports",
    action: "anonymise",
    end: sql`created_at`,
    set: sql`email = null, details = ''`,
    done: sql`email is null and details = ''`,
  },
  {
    key: "dead-letters-resolved",
    table: "core.dead_letters",
    what: "Failed background jobs after they're resolved",
    action: "delete",
    end: sql`resolved_at`,
  },
];

export interface RetentionLine {
  rule: RetentionRule;
  table: string;
  what: string;
  action: Rule["action"];
  /** null: no period decided. */
  days: number | null;
  /** Rows past the end of their record (any period). */
  ended: number;
  /** Rows past the period, that the job would remove or anonymise. null when no period. */
  due: number | null;
  /** Rows actually changed this run. */
  changed: number;
}

function eligible(rule: Rule, period: number): SQL {
  return sql.join(
    [
      sql`${rule.end} is not null and ${rule.end} < now() - make_interval(days => ${period})`,
      rule.only,
      rule.done ? sql`not (${rule.done})` : undefined,
    ].filter((x): x is SQL => x !== undefined),
    sql` and `,
  );
}

async function count(db: Database, rule: Rule, where: SQL): Promise<number> {
  const r = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.raw(rule.table)} where ${where}`);
  return r.rows[0]?.n ?? 0;
}

/**
 * The retention run. Without `apply` (or with `enforce` off) it changes nothing and reports what it would do;
 * `periods` overrides the setting for a what-if report (pnpm privacy:retention --days rule=365).
 */
export async function runRetention(
  db: Database,
  options: { apply?: boolean; periods?: Partial<Record<RetentionRule, number>> } = {},
): Promise<{ applied: boolean; lines: RetentionLine[] }> {
  const setting = await getSetting(db, RETENTION);
  const applied = options.apply === true && setting.enforce && !options.periods;
  const lines: RetentionLine[] = [];
  for (const rule of RULES) {
    const period = options.periods?.[rule.key] ?? setting.days[rule.key] ?? null;
    const ended = await count(db, rule, eligible(rule, 0));
    const due = period === null ? null : await count(db, rule, eligible(rule, period));
    let changed = 0;
    if (applied && period !== null && due) {
      const where = eligible(rule, period);
      const r =
        rule.action === "delete"
          ? await db.execute(sql`delete from ${sql.raw(rule.table)} where ${where}`)
          : await db.execute(sql`update ${sql.raw(rule.table)} set ${rule.set ?? sql``} where ${where}`);
      changed = r.rowCount ?? 0;
    }
    lines.push({
      rule: rule.key,
      table: rule.table,
      what: rule.what,
      action: rule.action,
      days: period,
      ended,
      due,
      changed,
    });
  }
  if (applied && lines.some((l) => l.changed)) {
    await audit(db, {
      actorId: null,
      action: "privacy.retention",
      resourceType: "retention",
      after: Object.fromEntries(lines.filter((l) => l.changed).map((l) => [l.rule, l.changed])),
    });
  }
  return { applied, lines };
}
