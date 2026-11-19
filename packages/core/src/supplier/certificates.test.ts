import { describe, expect, it } from "vitest";
import { publicCertificateRows, type CertificateRow } from "./certificates";

const now = new Date("2026-11-19T06:00:00Z");
const row = (over: Partial<CertificateRow>): CertificateRow => ({
  id: "c1",
  type: "certificate",
  name: "ISO 22734",
  scope: "Electrolyser stack E-200",
  issuedBy: "Example Certification Body",
  expiresOn: new Date("2027-06-30T18:29:59Z"),
  status: "Verified",
  checkedAt: new Date("2026-11-01T05:00:00Z"),
  replaces: null,
  deletedAt: null,
  ...over,
});

describe("publicCertificateRows (certificates on the public profile)", () => {
  it("shows a verified, current certificate with only its public fields", () => {
    const [c] = publicCertificateRows([row({})], now);
    expect(c).toEqual({
      id: "c1",
      name: "ISO 22734",
      scope: "Electrolyser stack E-200",
      issuer: "Example Certification Body",
      validUntil: new Date("2027-06-30T18:29:59Z"),
      checkedAt: new Date("2026-11-01T05:00:00Z"),
    });
    expect(c).not.toHaveProperty("number");
    expect(c).not.toHaveProperty("fileId");
  });

  it.each([
    ["not verified yet", { status: "Submitted" }],
    ["sent back", { status: "Needs re-upload" }],
    ["rejected", { status: "Rejected" }],
    ["expired by status", { status: "Expired" }],
    ["past its valid-until date", { expiresOn: new Date("2026-11-18T18:29:59Z") }],
    ["deleted", { deletedAt: new Date("2026-11-10T00:00:00Z") }],
    ["a GST certificate", { type: "gstin", name: null }],
    ["a PAN card", { type: "pan", name: null }],
    ["a factory licence", { type: "factory_licence", name: null }],
    ["without a name", { name: " " }],
  ] as [string, Partial<CertificateRow>][])("leaves out a document %s", (_, over) => {
    expect(publicCertificateRows([row(over)], now)).toEqual([]);
  });

  it("keeps a certificate with no expiry, and shows a verified renewal instead of the one it replaces", () => {
    const old = row({ id: "old", expiresOn: new Date("2026-12-31T18:29:59Z") });
    const renewal = row({ id: "new", replaces: "old", expiresOn: new Date("2029-12-31T18:29:59Z") });
    const forever = row({ id: "peso", name: "PESO approval", expiresOn: null });
    expect(publicCertificateRows([old, renewal, forever], now).map((c) => c.id)).toEqual(["peso", "new"]);
    // A renewal still being checked doesn't hide the current one.
    expect(publicCertificateRows([old, { ...renewal, status: "Submitted" }], now).map((c) => c.id)).toEqual(["old"]);
  });
});
