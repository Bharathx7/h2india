import { getDb } from "@h2india/core";
import { alertContacts } from "@h2india/core/alerts";
import { MEMBER_TOPICS, memberPreferences } from "@h2india/core/members";
import { TOPICS } from "@h2india/core/notify";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { MemberShell, requireMember } from "@/member/shell";
import { PreferencesForm, type PreferenceRow } from "@/member/PreferencesForm";

// Newsletters and notifications (548:8; phones 549:15), step 7.4. These are the choices notify() reads before every
// send, so a channel turned off here stops with the next message.
export const metadata: Metadata = { title: "Preferences · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const userId = await requireMember("/member/preferences");
  const db = getDb();
  const [prefs, reach] = await Promise.all([memberPreferences(db, userId), alertContacts(db, userId)]);
  const rows: PreferenceRow[] = MEMBER_TOPICS.map((t) => {
    const topic = TOPICS[t];
    return {
      topic: t,
      label: topic.label,
      hint: "hint" in topic ? topic.hint : "",
      locked: "locked" in topic ? [...topic.locked] : [],
    };
  });
  return (
    <MemberShell userId={userId} current="/member/preferences">
      <div>
        <h1 className="type-h2">Newsletters and notifications</h1>
        <p className="type-body-sm text-secondary">Choose what we send you and where it goes.</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PreferencesForm start={prefs} rows={rows} whatsappReady={Boolean(reach.mobile)} />
        <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Where we reach you</h2>
          <div>
            <p className="type-label">Email</p>
            <p className="type-body-sm text-body">{reach.email}</p>
          </div>
          <div>
            <p className="type-label">WhatsApp</p>
            <p className="type-body-sm text-body">{reach.mobile ?? "No confirmed mobile number yet"}</p>
          </div>
          <Link href="/member/security" className="inline-flex items-center gap-1.5 type-label text-link">
            Change in Sign-in and security
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      </div>
    </MemberShell>
  );
}
