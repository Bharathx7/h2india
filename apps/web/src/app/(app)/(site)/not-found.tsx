import type { Metadata } from "next";
import { NotFoundContent } from "@/errors/ErrorPage";

// 404 inside the public site (a record that doesn't exist): the site header and footer stay.
export const metadata: Metadata = { title: "Page not found · H2 Economy", robots: { index: false } };

export default function NotFound() {
  return <NotFoundContent />;
}
