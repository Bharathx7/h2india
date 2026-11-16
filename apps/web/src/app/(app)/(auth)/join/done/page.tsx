import { getDb } from "@h2india/core";
import { joinProfile, membershipsOf, shortCompanyName } from "@h2india/core/companies";
import { Button, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { workspaceFor } from "@/server/join";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";

// Join step 5 · Done (Figma 525:508). Buyers get the four next steps; suppliers go to their dashboard, which has
// their onboarding checklist (decision A8); members go to their home (A5).
export const metadata: Metadata = { title: "You're in · H2 India", robots: { index: false } };

const BUYER_NEXT = [
  { label: "Invite your colleagues", href: "/buyer" },
  { label: "Set an approval limit for orders", href: "/buyer" },
  { label: "Choose the categories you buy", href: "/buyer" },
  { label: "Send your first quote request", href: "/rfq/new" },
];

export default async function DonePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/join/done");
  const profile = await joinProfile(session.user.id);
  const [company] = await membershipsOf(getDb(), session.user.id);
  const first = (profile?.name ?? "").trim().split(/\s+/)[0];
  const title = first ? `You're in, ${first}` : "You're in";

  if (!company) {
    if (profile?.profileType !== "member") {
      redirect(
        profile?.profileType === "supplier"
          ? "/join/supplier"
          : profile?.profileType === "buyer"
            ? "/join/buyer"
            : "/join",
      );
    }
    return (
      <AuthCard>
        <StatusIcon name="check-circle" />
        <h1 className="type-h2 text-primary">{title}</h1>
        <p className="type-body text-body">Follow news, schemes and events from your member home.</p>
        <Button asChild size="lg" className="w-full">
          <Link href="/member">Go to your home</Link>
        </Button>
      </AuthCard>
    );
  }

  const name = shortCompanyName(company.legalName);
  const buyer = company.kind !== "supplier";
  return (
    <AuthCard>
      <StatusIcon name="check-circle" />
      <h1 className="type-h2 text-primary">{title}</h1>
      <p className="type-body text-body">
        {name} is set up as a {buyer ? "buyer" : "supplier"} company.{buyer ? " Four things to do next:" : ""}
      </p>
      {buyer ? (
        <ul className="overflow-hidden rounded-card border border-default">
          {BUYER_NEXT.map((item) => (
            <li key={item.label} className="border-b border-default last:border-b-0">
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 type-body-sm text-primary hover:bg-subtle"
              >
                <span aria-hidden="true" className="size-4.5 shrink-0 rounded-[4px] border-[1.5px] border-input" />
                <span className="flex-1">{item.label}</span>
                <Icon name="chevron-right" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild size="lg" className="w-full">
        <Link href={workspaceFor(company.kind)}>Go to your workspace</Link>
      </Button>
    </AuthCard>
  );
}
