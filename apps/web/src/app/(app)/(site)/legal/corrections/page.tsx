import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@h2india/ui";
import { LegalDocument } from "@/trust/LegalDocument";

// Corrections policy (521:754), with the way in to Suggest a correction (504:455).

export const metadata: Metadata = {
  title: "Corrections policy · H2 India",
  alternates: { canonical: "/legal/corrections" },
};
export const dynamic = "force-dynamic";

export default function CorrectionsPolicyPage() {
  return (
    <LegalDocument
      slug="corrections"
      after={
        <p>
          <Link href="/legal/corrections/suggest" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Suggest a correction
          </Link>
        </p>
      }
    />
  );
}
