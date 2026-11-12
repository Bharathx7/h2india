import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/cms/trust/collections";
import { CookieChoices } from "@/consent/CookieChoices";
import { LegalDocument } from "@/trust/LegalDocument";

// Terms, Privacy, Cookies, Editorial policy and Sponsored content (Corrections has its own folder for /suggest).

export const dynamic = "force-dynamic";
const PAGES = LEGAL_PAGES.filter((p) => p.value !== "corrections");

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const page = (await params).page;
  const p = PAGES.find((x) => x.value === page);
  if (!p) return {};
  return { title: `${p.label} · H2 India`, alternates: { canonical: p.href } };
}

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const page = (await params).page;
  if (!PAGES.some((p) => p.value === page)) notFound();
  return <LegalDocument slug={page} after={page === "cookies" ? <CookieChoices /> : undefined} />;
}
