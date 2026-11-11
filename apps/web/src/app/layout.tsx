import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "H2 India",
  description: "India's hydrogen ecosystem platform",
  robots: { index: false, follow: false }, // switched on at launch (step 5.10)
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
