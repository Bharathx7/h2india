import { isEnabled } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

// Developer pages: design tokens and the component gallery (playbook steps 2.1 and 2.6).
// Always available with `pnpm dev`; elsewhere only when FLAG_DEV_PAGES=true (staging, behind access protection).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development" && !isEnabled("devPages")) notFound();
  return <div className="min-h-dvh bg-page">{children}</div>;
}
