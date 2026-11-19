import type { Metadata } from "next";
import { fontVariables } from "./(app)/fonts";
import "./(app)/globals.css";
import { SiteChrome } from "@/components/SiteChrome";
import { NotFoundContent } from "@/errors/ErrorPage";

// Any address that matches no route (step 5.10, 66:5295). The app has several root layouts, so this page brings its
// own html, styles and fonts, and the public header and footer (as a visitor; no session is read here).

export const metadata: Metadata = {
  title: "Page not found · H2 Economy",
  robots: { index: false },
  // Outside the (app) group, so the file-based icon there does not apply here.
  icons: { icon: "/brand/h2-icon.svg", apple: "/brand/h2-apple-icon.png" },
};

export default function GlobalNotFound() {
  return (
    <html lang="en-IN" className={fontVariables}>
      <body>
        <SiteChrome user={null}>
          <NotFoundContent />
        </SiteChrome>
      </body>
    </html>
  );
}
