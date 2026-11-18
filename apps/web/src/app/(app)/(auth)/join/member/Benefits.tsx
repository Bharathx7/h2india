import { Icon } from "@h2india/ui";
import { MEMBER_BENEFITS, MEMBER_JOIN_STEPS } from "@/member/benefits";

// Member sign-up · what you get (founder v2, 18 Nov 2026): the full list of member benefits beside the form on
// desktop and below it on phones, in the For members page's words (MEMBER_BENEFITS), plus the three steps.

// On the sign-up page itself, step 1 is the form beside this panel, so it names the form, not the page.
const STEPS = MEMBER_JOIN_STEPS.map((s, i) => (i === 0 ? { ...s, title: "Fill in your details" } : s));

export function MemberBenefits() {
  return (
    <aside
      aria-labelledby="member-benefits-title"
      className="relative isolate flex flex-col gap-6 overflow-hidden rounded-feature bg-inverse p-6 shadow-ink-float md:p-8"
    >
      <div aria-hidden="true" className="depth-deep-glow absolute -top-40 -right-40 -z-10 size-120" />
      <div className="flex flex-col gap-2">
        <h2 id="member-benefits-title" className="type-h3 text-inverse">
          What you get as a member
        </h2>
        <p className="type-body text-neutral-0/80">
          For engineers, researchers, students and anyone following India&rsquo;s hydrogen economy. Keep what matters to
          you in one place and hear first when something changes.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {MEMBER_BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-neutral-0/8 text-fresh-300">
              <Icon name={b.icon} size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="type-label text-inverse">{b.title}</span>
              <span className="type-body-sm text-neutral-0/80">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 border-t border-neutral-0/12 pt-5">
        <p className="type-label text-inverse">Ready in about two minutes</p>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-accent type-label-sm text-primary">
                {i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="type-label-sm text-inverse">{s.title}</span>
                <span className="type-caption text-neutral-0/80">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
