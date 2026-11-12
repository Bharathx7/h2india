import config from "@payload-config";
import { getPayload } from "payload";
import { publicWhere } from "@/cms/sample";
import type { NewsletterIssue } from "@/payload-types";

// Past issues for the archive (445:5885) and the issue page (446:6106): published only, samples only where shown.

export async function issues(list: string): Promise<NewsletterIssue[]> {
  const res = await (
    await getPayload({ config })
  ).find({
    collection: "newsletter-issues",
    where: { and: [publicWhere(), { list: { equals: list } }] },
    sort: "-sentOn",
    limit: 200,
    depth: 0,
    pagination: false,
  });
  return res.docs;
}

export async function issue(slug: string): Promise<NewsletterIssue | null> {
  const res = await (
    await getPayload({ config })
  ).find({
    collection: "newsletter-issues",
    where: { and: [publicWhere(), { slug: { equals: slug } }] },
    limit: 1,
    depth: 0,
  });
  return res.docs[0] ?? null;
}

/** "MON 9 NOV 2026" */
export function issueDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
    .format(new Date(date))
    .replace(",", "")
    .toUpperCase();
}
