import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../layout";
import { colour, type } from "../theme";

// Tender alert digest (665:307), used for every alert type: eyebrow, "5 tenders match your alert", what the alert
// watches, one row per item (who · where, title, reference, due line, View link), See all, Manage alerts. The footer
// adds "Turn off this alert", which turns off this alert only.

export interface AlertDigestItem {
  /** "BPCL · Madhya Pradesh" */
  over: string;
  title: string;
  /** Tender reference, in mono. */
  reference?: string;
  /** "Bid due 12 Nov 2026 · 1 day left" */
  due?: string;
  /** Due within 7 days: drawn in the warning colour. */
  soon?: boolean;
  href: string;
}

export interface AlertDigestProps {
  appUrl: string;
  /** "Tender alert · daily digest" */
  eyebrow: string;
  /** "5 tenders match your alert" */
  headline: string;
  /** What the alert watches. */
  intro: string;
  items: AlertDigestItem[];
  /** "View tender" */
  viewLabel: string;
  /** "and 3 more" when the message was capped. */
  more?: string;
  all: { label: string; href: string };
  manageHref: string;
  offHref: string;
  /** "You're getting this because you set up a daily tender alert." */
  reason: string;
  preview: string;
}

export function AlertDigest(p: AlertDigestProps) {
  return (
    <EmailLayout
      appUrl={p.appUrl}
      preview={p.preview}
      reason={p.reason}
      preferencesHref={`${p.appUrl}/member/preferences`}
      footerLinks={[{ label: "Turn off this alert", href: p.offHref }]}
    >
      <Text style={{ ...type.eyebrow, color: colour.secondary, margin: "0 0 8px" }}>{p.eyebrow}</Text>
      <Heading as="h1" style={{ ...type.h2, color: colour.primary, margin: "0 0 8px" }}>
        {p.headline}
      </Heading>
      <Text style={{ ...type.body, color: colour.body, margin: "0 0 24px" }}>{p.intro}</Text>
      {p.items.map((i) => (
        <Section key={i.href} style={{ borderTop: `1px solid ${colour.border}`, padding: "16px 0" }}>
          <Text style={{ ...type.caption, color: colour.secondary, margin: "0 0 4px" }}>{i.over}</Text>
          <Text style={{ ...type.label, color: colour.primary, margin: "0 0 4px" }}>{i.title}</Text>
          {i.reference ? (
            <Text style={{ ...type.eyebrow, textTransform: "none", color: colour.body, margin: "0 0 4px" }}>
              {i.reference}
            </Text>
          ) : null}
          <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
            <tbody>
              <tr>
                <td style={{ ...type.bodySmall, color: i.soon ? colour.warning : colour.body }}>{i.due ?? ""}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={i.href} style={{ ...type.label, color: colour.link }}>
                    {p.viewLabel}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      ))}
      {p.more ? <Text style={{ ...type.bodySmall, color: colour.body, margin: "0 0 8px" }}>{p.more}</Text> : null}
      <Button
        href={p.all.href}
        style={{
          ...type.label,
          backgroundColor: colour.accent,
          color: colour.primary,
          borderRadius: "999px",
          padding: "14px 28px",
          display: "inline-block",
          margin: "16px 0",
        }}
      >
        {p.all.label}
      </Button>
      <Text style={{ ...type.label, margin: "0 0 16px" }}>
        <Link href={p.manageHref} style={{ color: colour.link }}>
          Manage alerts
        </Link>
      </Text>
      <Text style={{ ...type.bodySmall, color: colour.body, margin: 0 }}>H2 India team</Text>
    </EmailLayout>
  );
}
