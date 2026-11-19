import type { MetadataRoute } from "next";
import { absolute, indexable } from "@/seo/site";

// robots.txt (step 5.10). Until the searchIndexing flag is on (Launch 1), nothing may be crawled. Afterwards the CMS,
// APIs, workspaces, sign-in pages and form results stay out.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cms",
          "/api/",
          "/dev",
          "/buyer",
          "/supplier",
          "/member",
          "/admin",
          "/notifications",
          "/sign-in",
          "/sign-out",
          "/join",
          "/forgot-access",
          "/forgot-password",
          "/reset-password",
          "/set-password",
          "/newsletter/confirm",
          "/newsletter/unsubscribe",
          "/newsletter/check-inbox",
          "/newsletter/already",
          "/*?view=",
        ],
      },
    ],
    sitemap: absolute("/sitemap.xml"),
  };
}
