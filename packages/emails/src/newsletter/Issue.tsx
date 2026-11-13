import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../layout";
import { colour, type } from "../theme";

// An India H₂ Weekly issue as subscribers get it (composer preview 648:312, step 11.3): the editor's note, then the
// sections, each a list of linked items, and the footer with Manage preferences and Unsubscribe. No prices.

export interface IssueSection {
  heading: string;
  items: { title: string; href: string; meta: string }[];
}

export interface NewsletterIssueProps {
  appUrl: string;
  title: string;
  /** "India H₂ Weekly · #5 · Fri 13 Nov 2026" */
  masthead: string;
  preview: string;
  editorNote: string;
  sections: IssueSection[];
  manageUrl: string;
  unsubscribeUrl: string;
}

export function NewsletterIssue(p: NewsletterIssueProps) {
  return (
    <EmailLayout
      appUrl={p.appUrl}
      preview={p.preview}
      reason="You get this because you subscribed to India H₂ Weekly."
      preferencesHref={p.manageUrl}
      footerLinks={[{ label: "Unsubscribe", href: p.unsubscribeUrl }]}
    >
      <Text style={{ ...type.caption, color: colour.body, margin: "0 0 16px" }}>{p.masthead}</Text>
      {p.editorNote ? (
        <Section
          style={{
            border: `1px dashed ${colour.border}`,
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "0 0 24px",
          }}
        >
          <Text style={{ ...type.body, color: colour.primary, margin: 0 }}>{p.editorNote}</Text>
        </Section>
      ) : null}
      {p.sections
        .filter((s) => s.items.length)
        .map((s) => (
          <Section key={s.heading} style={{ margin: "0 0 24px" }}>
            <Heading
              as="h2"
              style={{
                ...type.caption,
                color: colour.body,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 8px",
              }}
            >
              {s.heading}
            </Heading>
            {s.items.map((i) => (
              <Section key={i.href} style={{ borderTop: `1px solid ${colour.border}`, padding: "10px 0" }}>
                <Link href={i.href} style={{ ...type.label, color: colour.link }}>
                  {i.title}
                </Link>
                <Text style={{ ...type.caption, color: colour.body, margin: "2px 0 0" }}>{i.meta}</Text>
              </Section>
            ))}
          </Section>
        ))}
    </EmailLayout>
  );
}
