import config from "@payload-config";
import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";
import { ArrowLink, Breadcrumbs, cx, Icon, type IconName } from "@h2india/ui";
import Link from "next/link";
import { getPayload } from "payload";
import type { ReactNode } from "react";
import { ArticleBody, headingsOf, KeyNumbers } from "@/components/article/ArticleBody";
import { linkGlossary, type LinkableTerm } from "@/cms/knowledge/glossary-links";
import { glossaryTerms } from "@/cms/knowledge/library";
import type { Article, Author, Tag, Topic } from "@/payload-types";
import { clock, clock12, dayMonthYear, readMinutes, relatedArticles, typeLabel } from "./data";
import { LiveRefresh, ShareButton, WeeklyBox } from "./client";
import { structuredData } from "./jsonld";
import { KeyFacts, RelatedStories, wrap } from "./parts";

// The article page (434:2844; phones 435:3380) with its header variants: analysis 437:3709, explainer 437:3872,
// interview 437:4020, press release 437:4212, sponsored 437:4387, and the live explainer (801:7492 live, 801:8616
// ended). Labels come from the article type (A28): a sponsored or press-release piece can't lose its label.

const objects = <T extends object>(rel: unknown): T[] =>
  Array.isArray(rel) ? rel.filter((r): r is T => Boolean(r) && typeof r === "object") : [];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "H2";

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-pill bg-mint text-primary",
        size === "sm" ? "size-8 type-label-sm" : "size-12 type-label-lg",
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The label before the section (437:3709 and siblings). */
function TypeLabel({
  tone,
  icon,
  children,
}: {
  tone: "tint" | "neutral" | "warning" | "error";
  icon?: IconName;
  children: ReactNode;
}) {
  const tones = {
    tint: "bg-tint text-primary",
    neutral: "bg-subtle text-body",
    warning: "bg-warning text-warning",
    error: "bg-error text-error",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 type-label-sm", tones[tone])}>
      {icon ? <Icon name={icon} size={14} /> : <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" />}
      {children}
    </span>
  );
}

const sectionOf = (a: Article) => objects<Topic>(a.topics).find((t) => typeof t.order === "number") ?? null;

function crumbs(a: Article) {
  const section = sectionOf(a);
  const items: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
    { label: "News", href: "/news" },
  ];
  if (a.live?.status === "live" || a.live?.status === "ended") items.push({ label: "Live" });
  else if (a.type === "press_release") items.push({ label: "Press releases", href: "/news/press-releases" });
  else if (section) items.push({ label: section.name, href: `/news/${section.slug}` });
  return items;
}

/** "Published 10 Nov 2026, 10:30 IST · Updated 12:05 IST · 4 min read" */
function metaLine(a: Article): string {
  const published = a.publishedAt ?? a.createdAt;
  const parts: string[] = [];
  if (a.type === "press_release") {
    // Received is when the release reached the CMS; an imported release can't have been received after it went out.
    const received = a.createdAt < published ? a.createdAt : published;
    parts.push(`Received ${dayMonthYear(received)}, ${clock(received)} IST`);
    parts.push(`Published ${dayMonthYear(published)}, ${clock(published)} IST`);
    return parts.join(" · ");
  }
  const updated = new Date(a.updatedAt).getTime() - new Date(published).getTime() > 10 * 60_000;
  if (a.type === "explainer" && updated) parts.push(`Updated ${dayMonthYear(a.updatedAt)}, ${clock(a.updatedAt)} IST`);
  else {
    parts.push(`Published ${dayMonthYear(published)}, ${clock(published)} IST`);
    if (updated) {
      const sameDay = dayMonthYear(a.updatedAt) === dayMonthYear(published);
      parts.push(`Updated ${sameDay ? "" : `${dayMonthYear(a.updatedAt)}, `}${clock(a.updatedAt)} IST`);
    }
  }
  if (!a.live || a.live.status === "off") parts.push(`${String(readMinutes(a.body))} min read`);
  return parts.join(" · ");
}

function Header({ a }: { a: Article }) {
  const section = sectionOf(a);
  const authors = objects<Author>(a.authors);
  const lead = authors[0];
  const live = a.live?.status === "live" || a.live?.status === "ended" ? a.live.status : null;
  const sectionLabel = section?.name ?? "News";
  let label: ReactNode = null;
  let eyebrow = sectionLabel;
  let byPrefix = "By";
  let second: string | null = lead?.title ?? null;
  let note: ReactNode = null;
  switch (a.type) {
    case "analysis":
    case "explainer":
      label = <TypeLabel tone="tint">{typeLabel(a.type)}</TypeLabel>;
      if (a.type === "analysis") byPrefix = "Analysis by";
      break;
    case "interview":
      label = <TypeLabel tone="tint">Interview</TypeLabel>;
      byPrefix = "Interview by";
      if (a.interviewee?.name) {
        second = `with ${[a.interviewee.name, a.interviewee.role, a.interviewee.organisation].filter(Boolean).join(", ")}`;
      }
      break;
    case "press_release":
      label = <TypeLabel tone="neutral">Press release</TypeLabel>;
      eyebrow = "Press releases";
      note = <>Supplied by {a.issuer} and published as received. H2 Economy has not edited or verified its claims.</>;
      break;
    case "sponsored":
      label = (
        <TypeLabel tone="warning" icon="alert-triangle">
          Sponsored
        </TypeLabel>
      );
      eyebrow = `Sponsored · ${sectionLabel}`;
      second = a.sponsor?.name ? `Sponsored by ${a.sponsor.name}` : second;
      note = (
        <>
          Paid for by {a.sponsor?.name} and produced by the H2 Economy Partner Studio, not the newsroom. Read our{" "}
          <Link href="/legal/sponsored-content" className="text-link underline">
            sponsored content policy
          </Link>
          .
        </>
      );
      break;
    default:
      break;
  }
  if (live) eyebrow = `Live · ${sectionLabel}`;
  const byline =
    a.type === "press_release" ? (a.issuer ?? "") : authors.map((x) => x.name).join(", ") || "H2 Economy newsroom";

  return (
    <header className="flex flex-col gap-4 border-b border-default pb-6">
      {live ? (
        <p className="flex flex-wrap items-center gap-3">
          {live === "live" ? (
            <TypeLabel tone="error" icon="alert-circle">
              Live
            </TypeLabel>
          ) : (
            <TypeLabel tone="neutral">Ended</TypeLabel>
          )}
          <span className="type-caption text-secondary">
            {live === "live"
              ? "Updates every few minutes · times in IST"
              : "This live explainer has ended · times in IST"}
          </span>
        </p>
      ) : null}
      <p className="flex flex-wrap items-center gap-2">
        {label}
        <span className="type-label-sm text-link">{eyebrow}</span>
      </p>
      <h1 className="type-h1 text-primary">{a.title}</h1>
      <p className="type-body-lg text-body">{a.dek}</p>
      {note ? <p className="rounded-card bg-subtle px-3 py-2.5 type-body-sm text-body">{note}</p> : null}
      <div className="flex items-center gap-3">
        <Avatar name={byline} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-label text-link">
            {a.type === "press_release" ? (
              byline
            ) : lead ? (
              <>
                {byPrefix}{" "}
                <Link href={`/authors/${lead.slug}`} className="hover:underline">
                  {byline}
                </Link>
              </>
            ) : (
              `${byPrefix} ${byline}`
            )}
          </p>
          <p className="type-caption text-secondary">{a.type === "press_release" ? "Company press release" : second}</p>
        </div>
        <ShareButton title={a.title} />
      </div>
      <p className="type-caption text-secondary">{metaLine(a)}</p>
    </header>
  );
}

function LeadImage() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-video w-full items-center justify-center rounded-card bg-mint text-icon-primary"
    >
      <Icon name="newspaper" size={48} />
    </div>
  );
}

/** The live block (801:8067 summary, 801:8073 updates): newest first. Ended explainers add "What it means". */
function Live({ a }: { a: Article }) {
  const live = a.live;
  if (!live || live.status === "off" || !live.status) return null;
  const updates = [...(live.updates ?? [])].sort((x, y) => y.at.localeCompare(x.at));
  return (
    <div className="flex flex-col gap-6">
      {live.status === "ended" && (live.meaning ?? []).length ? (
        <section
          aria-label="What it means"
          className="flex flex-col gap-2.5 rounded-card bg-inverse px-6 py-5 text-inverse"
        >
          <p className="type-label-sm">What it means</p>
          <ul className="flex flex-col gap-2.5 type-body">
            {(live.meaning ?? []).map((m) => (
              <li key={m.id ?? m.point}>• {m.point}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {(live.summary ?? []).length ? (
        <section aria-label="Summary" className="flex flex-col gap-2.5 rounded-card bg-mint px-6 py-5">
          <p className="type-label-sm text-secondary">
            Summary{live.summaryAt ? ` · updated ${clock12(live.summaryAt)} IST` : ""}
          </p>
          <ul className="flex flex-col gap-2.5 type-body text-primary">
            {(live.summary ?? []).map((s) => (
              <li key={s.id ?? s.point}>• {s.point}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {(live.keyNumbers ?? []).length ? (
        <KeyNumbers
          block={{
            blockType: "keyNumbers",
            heading: "Pinned · key numbers",
            items: (live.keyNumbers ?? []).map((k) => ({ value: k.value, label: k.label })),
            source: live.keyNumbersSource ?? null,
          }}
        />
      ) : null}
      {updates.length ? (
        <section aria-labelledby="updates" className="flex flex-col">
          <h2 id="updates" className="pb-6 type-h2 text-primary">
            {live.status === "ended" ? "How the day unfolded" : "Updates"}
          </h2>
          <ol className="flex flex-col">
            {updates.map((u) => (
              <li key={u.id ?? u.at} className="flex flex-col gap-2 border-t border-default py-5 md:flex-row md:gap-6">
                <time dateTime={u.at} className="w-24 shrink-0 type-spec text-link">
                  {clock12(u.at)} IST
                </time>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="type-h4 text-primary">{u.title}</h3>
                  {u.text ? <p className="type-body text-body">{u.text}</p> : null}
                  {u.document?.title ? (
                    <div className="flex items-center gap-3 rounded-control bg-subtle px-4 py-3">
                      <Icon name="file-text" size={24} className="text-icon-primary" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="type-label text-primary">{u.document.title}</p>
                        {u.document.note ? <p className="type-caption text-secondary">{u.document.note}</p> : null}
                      </div>
                      {u.document.url ? (
                        <a
                          href={u.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${u.document.title} (opens in a new tab)`}
                          className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-control text-icon-primary hover:border-focus"
                        >
                          <Icon name="external-link" size={14} />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function SourcesAndTags({ a }: { a: Article }) {
  const sources = (a.sources ?? []).filter((s) => !s.internal);
  const tags = objects<Tag>(a.tags);
  const corrections = a.corrections ?? [];
  return (
    <>
      <section aria-labelledby="sources" className="flex flex-col gap-2 border-t border-default pt-6">
        <h2 id="sources" className="type-h4 text-primary">
          Sources
        </h2>
        <ol className="flex flex-col gap-2">
          {sources.map((s, i) => (
            <li key={s.id ?? s.title} className="type-body-sm text-link">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {String(i + 1)}. {s.title} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                `${String(i + 1)}. ${s.title}`
              )}
            </li>
          ))}
        </ol>
        {corrections.length ? (
          <ul className="flex flex-col gap-1 type-caption text-secondary">
            {corrections.map((c) => (
              <li key={c.id ?? c.date}>
                Correction, {dayMonthYear(c.date)}: {c.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-caption text-secondary">
            Corrections: none. Spotted an error?{" "}
            <Link href="/legal/corrections" className="text-link hover:underline">
              Tell the editors
            </Link>
            .
          </p>
        )}
      </section>
      {tags.length ? (
        <ul aria-label="Tags" className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tags/${t.slug}`}
                className="inline-flex h-8.5 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="type-caption text-secondary">Comments are off for news stories.</p>
    </>
  );
}

/** Glossary terms the body links (first mention each), for "Terms in this explainer". */
function termsIn(data: unknown, glossary: LinkableTerm[]): { term: string; slug: string }[] {
  const out = new Map<string, string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; term?: string; slug?: string; children?: unknown[]; root?: unknown };
    if (n.type === "glossaryTerm" && n.term && n.slug) out.set(n.slug, n.term);
    if (n.root) walk(n.root);
    for (const c of n.children ?? []) walk(c);
  };
  walk(linkGlossary(data as DefaultTypedEditorState, glossary));
  return [...out.entries()].map(([slug, term]) => ({ slug, term }));
}

function SideBox({
  title,
  tone = "tint",
  children,
}: {
  title: string;
  tone?: "tint" | "outline";
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cx(
        "flex flex-col gap-2 rounded-card p-5",
        tone === "tint" ? "bg-subtle" : "border border-default bg-page",
      )}
    >
      <h2 className="type-h4 text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Aside({ a, glossary }: { a: Article; glossary: LinkableTerm[] }) {
  const facts = (a.keyFacts ?? []).map((f) => ({ label: f.label, value: f.value }));
  const boxes: ReactNode[] = [];
  if (a.type === "analysis" && a.whyItMatters) {
    boxes.push(
      <SideBox key="why" title="Why this matters">
        <p className="type-body-sm text-body">{a.whyItMatters}</p>
      </SideBox>,
    );
  }
  if (a.type === "explainer") {
    const headings = headingsOf(a.body);
    if (headings.length) {
      boxes.push(
        <SideBox key="toc" title="In this explainer" tone="outline">
          <ol className="flex flex-col gap-2">
            {headings.map((h) => (
              <li key={h.id} className="border-l-2 border-default pl-2.5 type-body-sm text-body">
                <a href={`#${h.id}`} className="hover:text-link-hover hover:underline">
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </SideBox>,
      );
    }
    const terms = termsIn(a.body, glossary);
    if (terms.length) {
      boxes.push(
        <SideBox key="terms" title="Terms in this explainer">
          <p className="type-body-sm text-link">
            {terms.map((t, i) => (
              <span key={t.slug}>
                {i ? " · " : ""}
                <Link href={`/knowledge/glossary/${t.slug}`} className="hover:underline">
                  {t.term}
                </Link>
              </span>
            ))}
          </p>
        </SideBox>,
      );
    }
  }
  if (a.type === "interview" && a.interviewee?.name) {
    boxes.push(
      <section
        key="interviewee"
        aria-label="Interviewee"
        className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
      >
        <div className="flex items-center gap-3">
          <Avatar name={a.interviewee.name} size="md" />
          <div className="flex flex-col gap-0.5">
            <p className="type-label text-primary">{a.interviewee.name}</p>
            <p className="type-caption text-secondary">
              {[a.interviewee.role, a.interviewee.organisation].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <p className="type-caption text-secondary">Edited for length and clarity.</p>
      </section>,
    );
  }
  if (a.type === "press_release") {
    boxes.push(
      <SideBox key="about-pr" title="About press releases">
        <p className="type-body-sm text-body">
          Verified companies can submit releases. Our editors check format and labelling, not claims.
        </p>
        <ArrowLink asChild>
          <Link href="/news/submit">Submit a press release</Link>
        </ArrowLink>
      </SideBox>,
    );
  }
  if (a.type === "sponsored" && a.sponsor?.name) {
    boxes.push(
      <section
        key="sponsor"
        aria-label="About the sponsor"
        className="flex flex-col gap-2 rounded-card border border-default bg-page p-5"
      >
        <span className="self-start">
          <TypeLabel tone="warning" icon="alert-triangle">
            Sponsored
          </TypeLabel>
        </span>
        <h2 className="type-h4 text-primary">About the sponsor</h2>
        {a.sponsor.about ? <p className="type-body-sm text-body">{a.sponsor.about}</p> : null}
      </section>,
    );
  }
  if (facts.length) boxes.push(<KeyFacts key="facts" facts={facts} />);
  boxes.push(<WeeklyBox key="weekly" />);
  return <aside className="flex flex-col gap-6 lg:w-96 lg:shrink-0">{boxes}</aside>;
}

export async function ArticlePage({ a, appUrl }: { a: Article; appUrl: string }) {
  const payload = await getPayload({ config });
  const glossary = await glossaryTerms(payload);
  const topicIds = objects<Topic>(a.topics).map((t) => t.id);
  const related = await relatedArticles(a.id, topicIds);
  const live = a.live?.status === "live";
  const url = new URL(`/news/${a.slug}`, appUrl).toString();
  const json = JSON.stringify(structuredData(a, url)).replace(/</g, "\\u003c");
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <div className={cx(wrap, "pt-6")}>
        <Breadcrumbs
          items={crumbs(a)}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
      </div>
      <div className={cx(wrap, "flex flex-col gap-8 py-6 lg:flex-row lg:items-start lg:gap-24")}>
        <article className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <Header a={a} />
          <LiveRefresh live={live}>
            <Live a={a} />
          </LiveRefresh>
          {a.live?.status === "live" || a.live?.status === "ended" ? null : <LeadImage />}
          <ArticleBody data={a.body} glossary={glossary} />
          <SourcesAndTags a={a} />
        </article>
        <Aside a={a} glossary={glossary} />
      </div>
      <RelatedStories items={related} />
    </main>
  );
}
