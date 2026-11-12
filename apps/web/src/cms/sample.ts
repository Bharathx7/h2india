import { isEnabled } from "@h2india/config";
import { APIError, type Access, type CollectionBeforeChangeHook, type Where } from "payload";
import { has } from "./roles";

// Sample content (F9, A37). Seed data is flagged `sample`. With FLAG_SAMPLE_CONTENT off (production) it is never shown
// to readers and can't be published; local and staging switch the flag on to see the design's data.

export const showSample = (env?: Record<string, string | undefined>) => isEnabled("sampleContent", env);

/** What readers may see of a collection with drafts and a sample flag. */
export function publicWhere(env?: Record<string, string | undefined>): Where {
  const published: Where = { _status: { equals: "published" } };
  if (showSample(env)) return published;
  return { and: [published, { or: [{ sample: { equals: false } }, { sample: { exists: false } }] }] };
}

/** Read access: editors see everything; readers see published, non-sample items (sample ones too when allowed). */
export const publicOrEditor: Access = ({ req }) => (has(req, "content.view") ? true : publicWhere());

/** Sample content can't go live where samples are hidden, so it can't reach production by accident. */
export const refuseSamplePublish: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const d = data as { _status?: string; sample?: boolean | null };
  const sample = d.sample ?? (originalDoc as { sample?: boolean | null } | undefined)?.sample ?? false;
  if (d._status === "published" && sample && !showSample()) {
    throw new APIError(
      "Sample content can't be published here. Replace it with real content and untick Sample (F9).",
      400,
      null,
      true,
    );
  }
  return data;
};
