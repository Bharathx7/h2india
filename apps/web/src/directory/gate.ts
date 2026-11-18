import type { Metadata } from "next";

/** A profile's title and description stay hidden from signed-out visitors too (public QC, 16 Nov 2026). */
export const GATED_METADATA: Metadata = { title: "Company profile · H2 Economy" };
