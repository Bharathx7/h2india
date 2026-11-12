import "./cms/load-env";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { parseServerEnv } from "@h2india/config";
import { createHmac } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Articles } from "./cms/collections/Articles";
import { Authors } from "./cms/collections/Authors";
import { Corrections } from "./cms/collections/Corrections";
import { Editors } from "./cms/collections/Editors";
import { EarlyListings, HomeFigures, Prelaunch } from "./cms/home/collections";
import { Media } from "./cms/collections/Media";
import { Tags, Topics } from "./cms/collections/Taxonomy";
import {
  Chapters,
  Glossary,
  Guides,
  Podcasts,
  ReportFiles,
  ReportLeads,
  Reports,
  Standards,
  Videos,
} from "./cms/knowledge/collections";
import { REPORTS_PREFIX } from "./cms/knowledge/library";
import { Events, Grants, Jobs, Schemes, SourceChanges, Tenders } from "./cms/records/collections";
import { possibleUpdates, staleRecords } from "./cms/records/quality";
import { TrackerChanges } from "./cms/tracker/changes";
import {
  TrackerFactories,
  TrackerHubs,
  TrackerMethodology,
  TrackerOverview,
  TrackerPilots,
  TrackerPolicies,
  TrackerPrices,
  TrackerProjects,
  TrackerStations,
} from "./cms/tracker/collections";
import { has } from "./cms/roles";
import { SightTracker } from "./cms/records/sight";
import { Submissions } from "./cms/submissions";
import { AudienceFaqs, HelpArticles, LegalPages, Pricing, TeamMembers, TrustSettings } from "./cms/trust/collections";

// The content system (step 4.1, ADR 0004, A26): Payload 3 inside the app, tables in the cms schema of the same
// database, editors signed in with their H2 India account, the editor at /cms.

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = parseServerEnv();

export default buildConfig({
  serverURL: env.APP_URL,
  routes: { admin: "/cms", api: "/api/cms" },
  secret: createHmac("sha256", env.AUTH_SECRET).update("payload").digest("hex"),
  admin: {
    user: Editors.slug,
    meta: { titleSuffix: " · H2 India CMS" },
    // No Gravatar look-ups: initials only.
    avatar: "default",
    routes: { login: "/login", logout: "/logout" },
    importMap: { baseDir: dirname, importMapFile: path.resolve(dirname, "app/(payload)/cms/importMap.js") },
    components: {
      graphics: { Logo: "@/cms/admin/Brand#Logo", Icon: "@/cms/admin/Brand#Icon" },
    },
  },
  collections: [
    Articles,
    Corrections,
    Schemes,
    Tenders,
    Grants,
    Jobs,
    Events,
    SourceChanges,
    Submissions,
    Chapters,
    Guides,
    Glossary,
    Standards,
    Reports,
    ReportFiles,
    ReportLeads,
    Videos,
    Podcasts,
    TrackerProjects,
    TrackerFactories,
    TrackerPilots,
    TrackerStations,
    TrackerPrices,
    TrackerPolicies,
    TrackerHubs,
    TrackerChanges,
    EarlyListings,
    LegalPages,
    HelpArticles,
    TeamMembers,
    Authors,
    Topics,
    Tags,
    Media,
    Editors,
  ],
  globals: [
    TrackerMethodology,
    TrackerOverview,
    HomeFigures,
    Prelaunch,
    SightTracker,
    TrustSettings,
    Pricing,
    AudienceFaqs,
  ],
  editor: lexicalEditor(),
  endpoints: [
    {
      // GET /api/cms/data-quality: stale records and possible updates (646:9, 646:733) for editors.
      path: "/data-quality",
      method: "get",
      handler: async (req) => {
        if (!has(req, "content.view")) return Response.json({ errors: [{ message: "Editors only" }] }, { status: 403 });
        const [stale, updates] = await Promise.all([staleRecords(req.payload), possibleUpdates(req.payload)]);
        return Response.json({ stale, updates });
      },
    },
  ],
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    schemaName: "cms",
    migrationDir: path.resolve(dirname, "migrations"),
    push: false,
  }),
  sharp,
  graphQL: { disable: true },
  telemetry: false,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  plugins: [
    // Report PDFs (step 4.4): private bucket; editors open them through the CMS, readers only through the gate.
    s3Storage({
      collections: { "report-files": { prefix: REPORTS_PREFIX } },
      bucket: env.S3_BUCKET_PRIVATE,
      config: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
        forcePathStyle: !env.S3_ENDPOINT.includes("amazonaws.com"),
      },
    }),
    s3Storage({
      collections: {
        media: {
          prefix: "cms",
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) =>
            `${(env.S3_PUBLIC_URL ?? `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET_PUBLIC}`).replace(/\/$/, "")}/${prefix ? `${prefix}/` : ""}${filename}`,
        },
      },
      bucket: env.S3_BUCKET_PUBLIC,
      config: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
        forcePathStyle: !env.S3_ENDPOINT.includes("amazonaws.com"),
      },
    }),
  ],
});
