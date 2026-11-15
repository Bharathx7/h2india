import type { Metadata } from "next";
import { cx, EmptyState, Icon } from "@h2india/ui";
import { teamMembers } from "@/trust/data";
import { card, main, PageHead, wrap } from "@/trust/parts";
import { initials } from "@/trust/views";

// Management team (66:3923): people entered in Team and advisors, only those who agreed to be shown.

export const metadata: Metadata = {
  title: "Team and advisors · H2 India",
  description: "The people who run H2 India and answer for every verification decision.",
  alternates: { canonical: "/about/team" },
};
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const people = await teamMembers();
  const groups = (["Management", "Advisors"] as const)
    .map((g) => ({ g, list: people.filter((p) => p.group === g) }))
    .filter((x) => x.list.length);
  return (
    <main id="main" className={main}>
      <PageHead
        title="Management Team"
        lead="The people who run H2 India and answer for every verification decision."
      />
      <div className={cx(wrap, "flex flex-col gap-10 pt-8")}>
        {groups.length ? (
          groups.map(({ g, list }) => (
            <section key={g} aria-label={g === "Management" ? "Management team" : "Advisors"}>
              {g === "Advisors" ? <h2 className="mb-4 type-h2 text-primary">Advisors</h2> : null}
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <li key={p.id} className={cx(card, "flex flex-col gap-3 p-6")}>
                    <span
                      aria-hidden="true"
                      className="flex size-16 items-center justify-center rounded-pill bg-mint type-h4 text-primary"
                    >
                      {initials(p.name)}
                    </span>
                    <h3 className="type-h4 text-primary">{p.name}</h3>
                    <p className="type-body-sm text-secondary">{p.role}</p>
                    {p.linkedin ? (
                      <a
                        href={p.linkedin}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="inline-flex items-center gap-1 type-label-sm text-link"
                      >
                        LinkedIn <Icon name="arrow-right" size={14} />
                        <span className="sr-only">: {p.name} (opens in a new tab)</span>
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <EmptyState title="Our team page is on its way">Meanwhile, write to us from the contact page.</EmptyState>
        )}
      </div>
    </main>
  );
}
