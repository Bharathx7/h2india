import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";

// Company certificates on the public profile (founder, 18 Nov 2026): a supplier's uploaded certificates (ISO 22734,
// PESO approval…) reach buyers once H2 Economy has verified them and while they are current. Only the name, what it
// covers, the issuer and the valid-until date leave here: never the file, never a number, and never any other kind of
// document (GSTIN, PAN and the rest stay private to the company and H2 Economy).

const d = schema.verificationDocuments;

export interface PublicCertificate {
  id: string;
  name: string;
  scope: string | null;
  issuer: string | null;
  validUntil: Date | null;
  checkedAt: Date | null;
}

/** The rows the filter reads: the document as stored. */
export interface CertificateRow {
  id: string;
  type: string;
  name: string | null;
  scope: string | null;
  issuedBy: string | null;
  expiresOn: Date | null;
  status: string;
  checkedAt: Date | null;
  replaces: string | null;
  deletedAt: Date | null;
}

/**
 * Which documents buyers may see, and only the fields they may see. Pure: unit-tested. A certificate counts when it is
 * Verified, not deleted, not past its expiry and not replaced by a verified renewal; newest expiry first.
 */
export function publicCertificateRows(rows: CertificateRow[], now: Date): PublicCertificate[] {
  const shown = rows.filter(
    (r) =>
      r.type === "certificate" &&
      r.status === "Verified" &&
      !r.deletedAt &&
      Boolean(r.name?.trim()) &&
      (!r.expiresOn || r.expiresOn.getTime() > now.getTime()),
  );
  const renewed = new Set(shown.map((r) => r.replaces).filter((x): x is string => Boolean(x)));
  return shown
    .filter((r) => !renewed.has(r.id))
    .sort((a, b) => (b.expiresOn?.getTime() ?? Infinity) - (a.expiresOn?.getTime() ?? Infinity))
    .map((r) => ({
      id: r.id,
      name: (r.name ?? "").trim(),
      scope: r.scope?.trim() || null,
      issuer: r.issuedBy?.trim() || null,
      validUntil: r.expiresOn,
      checkedAt: r.checkedAt,
    }));
}

/** A company's verified, current certificates for its public profile. Public data: no scope needed. */
export async function publicCertificates(
  db: Executor,
  organisationId: string,
  now = new Date(),
): Promise<PublicCertificate[]> {
  const rows = await db
    .select({
      id: d.id,
      type: d.type,
      name: d.name,
      scope: d.scope,
      issuedBy: d.issuedBy,
      expiresOn: d.expiresOn,
      status: d.status,
      checkedAt: d.checkedAt,
      replaces: d.replaces,
      deletedAt: d.deletedAt,
    })
    .from(d)
    .where(
      and(
        eq(d.organisationId, organisationId),
        eq(d.type, "certificate"),
        eq(d.status, "Verified"),
        isNull(d.deletedAt),
      ),
    );
  return publicCertificateRows(rows, now);
}
