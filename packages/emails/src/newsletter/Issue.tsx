import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../layout";
import { colour, type } from "../theme";

// An India H₂ Weekly issue as subscribers get it (composer preview 648:312, step 11.3): the editor's note, then the
// sections, each a list of linked items, and the footer with Manage preferences and Unsubscribe. No prices.

export interface IssueSection {
  heading: string;
  /** Drawn after the chart and the sponsor slot (New listings, 648:312). */
  late?: boolean;
  items: { title: string; href: string; meta: string }[];
}

export interface IssueChart {
  title: string;
  unit: string;
  bars: { label: string; value: number }[];
  /** "H2 India · India Hydrogen Tracker, as of 10 Nov 2026" */
  source: string;
}

export interface NewsletterIssueProps {
  appUrl: string;
  title: string;
  /** "India H₂ Weekly · #5 · Fri 13 Nov 2026" */
  masthead: string;
  preview: string;
  editorNote: string;
  sections: IssueSection[];
  chart?: IssueChart | null;
  sponsor?: { name: string; headline: string; text: string; url: string } | null;
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
        .filter((s) => s.items.length && !s.late)
        .map((s) => (
          <IssueList key={s.heading} section={s} />
        ))}
      {p.chart?.bars.length ? <Chart chart={p.chart} /> : null}
      {p.sponsor ? <Sponsor sponsor={p.sponsor} /> : null}
      {p.sections
        .filter((s) => s.items.length && s.late)
        .map((s) => (
          <IssueList key={s.heading} section={s} />
        ))}
    </EmailLayout>
  );
}

/** Bars as table cells, so every mail app draws them. */
function Chart({ chart }: { chart: IssueChart }) {
  const max = Math.max(...chart.bars.map((b) => b.value), 1);
  return (
    <Section style={{ margin: "0 0 24px" }}>
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
        Chart of the week
      </Heading>
      <Text style={{ ...type.label, color: colour.primary, margin: "0 0 8px" }}>{chart.title}</Text>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          {chart.bars.map((b) => (
            <tr key={b.label}>
              <td style={{ ...type.caption, color: colour.body, width: "30%", padding: "3px 8px 3px 0" }}>{b.label}</td>
              <td style={{ padding: "3px 0" }}>
                <div
                  style={{
                    backgroundColor: colour.accent,
                    height: "10px",
                    borderRadius: "5px",
                    width: `${String(Math.max(2, Math.round((b.value / max) * 100)))}%`,
                  }}
                />
              </td>
              <td
                style={{
                  ...type.caption,
                  color: colour.body,
                  width: "56px",
                  textAlign: "right",
                  padding: "3px 0 3px 8px",
                }}
              >
                {b.value.toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Text style={{ ...type.caption, color: colour.secondary, margin: "8px 0 0" }}>{chart.source}</Text>
    </Section>
  );
}

function IssueList({ section: s }: { section: IssueSection }) {
  return (
    <Section style={{ margin: "0 0 24px" }}>
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
  );
}

function Sponsor({ sponsor }: { sponsor: NonNullable<NewsletterIssueProps["sponsor"]> }) {
  return (
    <Section style={{ backgroundColor: colour.subtle, borderRadius: "8px", padding: "12px 16px", margin: "0 0 24px" }}>
      <Text
        style={{ ...type.caption, color: colour.body, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}
      >
        Sponsored
      </Text>
      <Link href={sponsor.url} style={{ ...type.label, color: colour.primary }}>
        {sponsor.name} · {sponsor.headline}
      </Link>
      {sponsor.text ? (
        <Text style={{ ...type.caption, color: colour.body, margin: "4px 0 0" }}>{sponsor.text}</Text>
      ) : null}
    </Section>
  );
}
