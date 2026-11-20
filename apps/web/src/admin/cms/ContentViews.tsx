import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon, type IconName } from "@h2india/ui";
import Link from "next/link";
import { ContentPageHead } from "./ContentFrame";
import { needsAttention, recentlyChanged, searchContent, type FoundItem } from "./home";
import { contentType } from "./records";
import { NO_CREATE_SLUGS } from "./registry";
import { CONTENT_SECTIONS, type ContentSection } from "./sections";
import type { cmsSession } from "./session";

// The content home, a section page and search results (founder, 20 Nov 2026: make the CMS easy). Plain words, one
// clear next step on every card, and nothing a person can't act on shown as a button.

type Cms = NonNullable<Awaited<ReturnType<typeof cmsSession>>>;

/** The things people make most often, in the order they make them. */
const CREATE: { label: string; slug: string; href: string; icon: IconName }[] = [
  { label: "Article", slug: "articles", href: "/admin/content/articles/new", icon: "newspaper" },
  { label: "Tender", slug: "tenders", href: "/admin/content/tenders/new", icon: "clipboard-check" },
  { label: "Scheme", slug: "schemes", href: "/admin/content/schemes/new", icon: "clipboard-check" },
  { label: "Grant", slug: "grants", href: "/admin/content/grants/new", icon: "clipboard-check" },
  { label: "Job", slug: "jobs", href: "/admin/content/jobs/new", icon: "users" },
  { label: "Event", slug: "events", href: "/admin/content/events/new", icon: "calendar" },
  {
    label: "Tracker project",
    slug: "tracker-projects",
    href: "/admin/content/tracker-projects/new",
    icon: "bar-chart",
  },
  { label: "Newsletter issue", slug: "newsletter-issues", href: "/admin/content/newsletter-issues/new", icon: "mail" },
];

function SearchBox({ q }: { q?: string }) {
  return (
    <form action="/admin/content" method="get" role="search" className="flex gap-2">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-input border border-input bg-page px-3 focus-within:border-focus">
        <Icon name="search" size={18} className="shrink-0 text-icon-secondary" />
        <span className="sr-only">Search all content</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search all content by title: articles, tenders, tracker, glossary…"
          className="h-full min-w-0 flex-1 bg-transparent type-body-sm text-primary placeholder:text-secondary focus-visible:outline-none"
        />
      </label>
      <button type="submit" className={buttonClasses({ variant: "outline" })}>
        Search
      </button>
    </form>
  );
}

function FoundList({ items, label }: { items: FoundItem[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
      {items.map((i) => (
        <li key={`${i.slug}-${String(i.id)}`}>
          <Link
            href={i.href}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-subtle"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate type-label text-primary">{i.title}</span>
              <span className="type-caption text-secondary">
                {i.kind} · {i.section}
              </span>
            </span>
            <span className="type-caption text-secondary">Changed {formatIstDateTime(new Date(i.updatedAt))}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function ContentHome({ cms }: { cms: Cms }) {
  const [needs, recent] = await Promise.all([needsAttention(cms), recentlyChanged(cms)]);
  const waiting = needs.filter((n) => n.count > 0);
  const canEdit = cms.can("content.edit");
  return (
    <>
      <ContentPageHead
        title="Content"
        intro="Write, update and publish everything readers see. Start with what needs you, make something new, or pick a section on the left."
      />
      <SearchBox />

      <section aria-labelledby="needs" className="flex flex-col gap-3">
        <h2 id="needs" className="type-h4">
          Needs attention
        </h2>
        {waiting.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {waiting.map((n) => (
              <li key={n.key}>
                <Link
                  href={n.href}
                  className="flex h-full flex-col gap-1 rounded-card border border-default bg-page p-4 hover:border-focus"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="type-label text-primary">{n.label}</span>
                    <span className="rounded-pill bg-tint px-2.5 py-0.5 type-label-sm text-primary">
                      {n.count.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span className="type-caption text-secondary">{n.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="Nothing is waiting">
              Reviews, corrections, submissions and records to re-check show here when they need someone.
            </EmptyState>
          </div>
        )}
      </section>

      {canEdit ? (
        <section aria-labelledby="create" className="flex flex-col gap-3">
          <h2 id="create" className="type-h4">
            Create something new
          </h2>
          <ul className="flex flex-wrap gap-2">
            {CREATE.filter((c) => cms.mayChange(c.slug)).map((c) => (
              <li key={c.href}>
                <Link href={c.href} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  <Icon name={c.icon} size={16} />
                  {c.label}
                </Link>
              </li>
            ))}
            {cms.mayChange("media") ? (
              <li>
                <Link href="/admin/content/media" className={buttonClasses({ variant: "outline", size: "sm" })}>
                  <Icon name="upload" size={16} />
                  Upload an image
                </Link>
              </li>
            ) : null}
          </ul>
          <p className="type-caption text-secondary">Anything else: open its section on the left and choose New.</p>
        </section>
      ) : null}

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <h2 id="recent" className="type-h4">
          Recently changed
        </h2>
        {recent.length ? (
          <FoundList items={recent} label="Recently changed" />
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="Nothing yet">Articles and records show here as people change them.</EmptyState>
          </div>
        )}
      </section>
    </>
  );
}

export async function SearchResults({ cms, q }: { cms: Cms; q: string }) {
  const found = await searchContent(cms, q);
  return (
    <>
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title={`Results for “${q}”`}
        intro={`${found.length.toLocaleString("en-IN")} found. Search looks at titles; up to five of each kind show.`}
      />
      <SearchBox q={q} />
      {found.length ? (
        <FoundList items={found} label="Search results" />
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No content matches">Try a shorter word, or open a section on the left.</EmptyState>
        </div>
      )}
    </>
  );
}

async function countOf(cms: Cms, slug: string): Promise<number> {
  return (await cms.payload.count({ collection: slug as "schemes", overrideAccess: true })).totalDocs;
}

function TypeCard({
  slug,
  label,
  description,
  count,
  canCreate,
}: {
  slug: string;
  label: string;
  description: string;
  count: number;
  canCreate: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-default bg-page p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-label-lg text-primary">{label}</h3>
        <span className="type-mono text-secondary">{count.toLocaleString("en-IN")}</span>
      </div>
      <p className="type-body-sm text-body">{description}</p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={`/admin/content/${slug}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
          Open<span className="sr-only"> {label}</span>
        </Link>
        {canCreate ? (
          <Link href={`/admin/content/${slug}/new`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <Icon name="plus" size={14} />
            New<span className="sr-only"> {label}</span>
          </Link>
        ) : null}
      </div>
    </li>
  );
}

interface TypeRow {
  slug: string;
  label: string;
  description: string;
  count: number;
  canCreate: boolean;
}

function TypeGrid({ items, withSettings }: { items: TypeRow[]; withSettings: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((r) => (
        <TypeCard
          key={r.slug}
          slug={r.slug}
          label={r.label}
          description={r.description}
          count={r.count}
          canCreate={r.canCreate}
        />
      ))}
      {withSettings ? (
        <li className="flex flex-col gap-3 rounded-card border border-default bg-page p-4">
          <h3 className="type-label-lg text-primary">Site settings</h3>
          <p className="type-body-sm text-body">
            Home page figures, company details, pricing, tracker pages, maintenance notice and the pre-launch list.
          </p>
          <div className="mt-auto">
            <Link href="/admin/content/settings" className={buttonClasses({ variant: "outline", size: "sm" })}>
              Open<span className="sr-only"> Site settings</span>
            </Link>
          </div>
        </li>
      ) : null}
    </ul>
  );
}

async function SectionBlock({ cms, section, heading }: { cms: Cms; section: ContentSection; heading: boolean }) {
  const canEdit = cms.can("content.edit");
  const rows = await Promise.all(
    section.types.map(async (t) => {
      const type = contentType(cms.payload, t.slug);
      return type
        ? {
            ...t,
            label: type.plural,
            count: await countOf(cms, t.slug),
            canCreate: canEdit && cms.mayChange(t.slug) && !type.upload && !NO_CREATE_SLUGS.includes(t.slug),
          }
        : null;
    }),
  );
  const shown = rows.filter((r) => r !== null);
  const main = shown.filter((r) => !r.history);
  const history = shown.filter((r) => r.history);
  return (
    <section aria-labelledby={`section-${section.id}`} className="flex flex-col gap-3">
      <h2 id={`section-${section.id}`} className={heading ? "type-h4" : "sr-only"}>
        {section.label}
      </h2>
      {heading ? <p className="-mt-2 type-body-sm text-secondary">{section.description}</p> : null}
      <TypeGrid items={main} withSettings={section.id === "site"} />
      {history.length ? (
        <details className="group flex flex-col gap-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 type-label text-secondary">
            <Icon name="chevron-right" size={16} className="transition-transform group-open:rotate-90" />
            History kept by the system ({history.length})
          </summary>
          <div className="pt-3">
            <TypeGrid items={history} withSettings={false} />
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function SectionView({ cms, section }: { cms: Cms; section: ContentSection }) {
  return (
    <>
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title={section.label}
        intro={section.description}
      />
      <SectionBlock cms={cms} section={section} heading={false} />
    </>
  );
}

/** Every section on one page (the old ?tab=records address). */
export function AllContent({ cms }: { cms: Cms }) {
  return (
    <>
      <ContentPageHead
        back={{ href: "/admin/content", label: "Content home" }}
        title="All content"
        intro="Every kind of content, by section."
      />
      {CONTENT_SECTIONS.filter((s) => s.types.length && s.id !== "newsletter").map((s) => (
        <SectionBlock key={s.id} cms={cms} section={s} heading />
      ))}
    </>
  );
}
