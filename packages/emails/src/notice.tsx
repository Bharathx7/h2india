import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./layout";
import { colour, type } from "./theme";

// A plain message in the frame of the sign-in code email (671:428): eyebrow, headline, text, one button.
// Used for messages page 16 does not draw yet (decision M21); their wording is listed in docs/decisions.md.

export interface NoticeProps {
  appUrl: string;
  preview: string;
  reason: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  button?: { label: string; href: string };
  note?: string;
  /** A details box (Date, Time, Where… on 676:83; Reference, Event, Status on 673:352). */
  rows?: { label: string; value: string }[];
  /** Links under the button, for example Google Calendar · Outlook · Apple (.ics). */
  links?: { label: string; href: string }[];
}

export function Notice({
  appUrl,
  preview,
  reason,
  eyebrow,
  headline,
  paragraphs,
  button,
  note,
  rows,
  links,
}: NoticeProps) {
  return (
    <EmailLayout appUrl={appUrl} preview={preview} reason={reason}>
      <Text style={{ ...type.eyebrow, color: colour.secondary, margin: "0 0 8px" }}>{eyebrow}</Text>
      <Heading as="h1" style={{ ...type.h2, color: colour.primary, margin: "0 0 8px" }}>
        {headline}
      </Heading>
      {paragraphs.map((p) => (
        <Text key={p} style={{ ...type.body, color: colour.body, margin: "0 0 16px" }}>
          {p}
        </Text>
      ))}
      {rows?.length ? (
        <Section
          style={{ backgroundColor: colour.subtle, borderRadius: "12px", padding: "8px 16px", margin: "0 0 24px" }}
        >
          {rows.map((r) => (
            <table
              key={r.label}
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ borderBottom: `1px solid ${colour.border}` }}
            >
              <tbody>
                <tr>
                  <td style={{ ...type.bodySmall, color: colour.secondary, padding: "10px 0", width: "38%" }}>
                    {r.label}
                  </td>
                  <td style={{ ...type.label, color: colour.primary, padding: "10px 0" }}>{r.value}</td>
                </tr>
              </tbody>
            </table>
          ))}
        </Section>
      ) : null}
      {button ? (
        <Button
          href={button.href}
          style={{
            ...type.label,
            backgroundColor: colour.accent,
            color: colour.primary,
            borderRadius: "999px",
            padding: "14px 28px",
            display: "inline-block",
            margin: "8px 0 24px",
          }}
        >
          {button.label}
        </Button>
      ) : null}
      {links?.length ? (
        <Text style={{ ...type.bodySmall, margin: "0 0 24px" }}>
          {links.map((l, i) => (
            <span key={l.href}>
              {i ? " · " : ""}
              <Link href={l.href} style={{ color: colour.link }}>
                {l.label}
              </Link>
            </span>
          ))}
        </Text>
      ) : null}
      {note ? <Text style={{ ...type.bodySmall, color: colour.body, margin: "0 0 24px" }}>{note}</Text> : null}
      <Text style={{ ...type.bodySmall, color: colour.body, margin: 0 }}>H2 India team</Text>
    </EmailLayout>
  );
}
