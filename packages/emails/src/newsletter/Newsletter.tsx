import { Button, Column, Heading, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "../layout";
import { colour, type } from "../theme";

// H2 Economy Weekly emails (step 5.1, A46). "Confirm your subscription" is drawn (676:8); its envelope describes the
// welcome variant sent after confirming. "Already subscribed" is not drawn (M21) and uses the same frame.

/** What each issue covers, in the words of 676:8. */
export const ISSUE_CONTENTS =
  "Top stories, tenders closing this week, number of the week, an explainer, new on the marketplace, jobs and events";
export const ISSUE_SCHEDULE = "Every Monday at 08:00 IST";

interface Fact {
  label: string;
  value: string;
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <Section
      style={{ backgroundColor: colour.subtle, borderRadius: "12px", padding: "8px 20px", margin: "8px 0 24px" }}
    >
      {facts.map((f, i) => (
        <Row key={f.label} style={{ borderTop: i === 0 ? "none" : `1px solid ${colour.border}`, padding: "10px 0" }}>
          <Column style={{ width: "160px", verticalAlign: "top" }}>
            <Text style={{ ...type.caption, color: colour.body, margin: "2px 0" }}>{f.label}</Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ ...type.label, color: colour.primary, margin: 0 }}>{f.value}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

const buttonStyle = {
  ...type.label,
  backgroundColor: colour.accent,
  color: colour.primary,
  borderRadius: "999px",
  padding: "14px 28px",
  display: "inline-block",
  margin: "0 0 20px",
};

function Frame(props: {
  appUrl: string;
  preview: string;
  reason: string;
  preferencesHref?: string;
  headline: string;
  intro: string;
  facts: Fact[];
  button: { label: string; href: string };
  after?: string;
}) {
  return (
    <EmailLayout
      appUrl={props.appUrl}
      preview={props.preview}
      reason={props.reason}
      preferencesHref={props.preferencesHref}
    >
      <Text style={{ ...type.eyebrow, color: colour.secondary, margin: "0 0 8px" }}>H2 Economy Weekly</Text>
      <Heading as="h1" style={{ ...type.h2, color: colour.primary, margin: "0 0 8px" }}>
        {props.headline}
      </Heading>
      <Text style={{ ...type.body, color: colour.body, margin: "0 0 16px" }}>{props.intro}</Text>
      <Facts facts={props.facts} />
      <Button href={props.button.href} style={buttonStyle}>
        {props.button.label}
      </Button>
      {props.after ? (
        <Text style={{ ...type.label, color: colour.link, margin: "0 0 24px" }}>{props.after}</Text>
      ) : null}
      <Text style={{ ...type.bodySmall, color: colour.body, margin: 0 }}>The H2 Economy Weekly team</Text>
    </EmailLayout>
  );
}

export interface NewsletterConfirmProps {
  appUrl: string;
  confirmUrl: string;
  /** "Monday 16 November" */
  firstIssue: string;
  /** "12 Nov 2026, 8:12 PM IST" */
  linkUntil: string;
  /** "48 hours" */
  window: string;
}

export const newsletterConfirmSubject = "Confirm your H2 Economy Weekly subscription";

/** 676:8 Confirm your subscription. */
export function NewsletterConfirm(p: NewsletterConfirmProps) {
  return (
    <Frame
      appUrl={p.appUrl}
      preview={`One click and your first issue arrives on ${p.firstIssue.replace(/ (\w{3})\w*$/, " $1")}.`}
      reason="You're getting this because someone entered this address on H2 Economy."
      preferencesHref={`${p.appUrl}/newsletter`}
      headline="Confirm your subscription"
      intro={`Hi, you asked for H2 Economy Weekly at this address. Confirm within ${p.window} and your first issue arrives on ${p.firstIssue}.`}
      facts={[
        { label: "Arrives", value: ISSUE_SCHEDULE },
        { label: "Inside", value: ISSUE_CONTENTS },
        { label: "Price", value: "Free. Unsubscribe in one click." },
        { label: "Link works until", value: p.linkUntil },
      ]}
      button={{ label: "Confirm subscription", href: p.confirmUrl }}
      after="Didn't sign up? Ignore this email and we won't write again"
    />
  );
}

export interface NewsletterWelcomeProps {
  appUrl: string;
  manageUrl: string;
  firstIssue: string;
  topics: string[];
}

export const newsletterWelcomeSubject = "Welcome to H2 Economy Weekly";

/** The welcome variant of 676:8, sent after confirming: what each issue covers, the topics chosen, the first issue. */
export function NewsletterWelcome(p: NewsletterWelcomeProps) {
  return (
    <Frame
      appUrl={p.appUrl}
      preview={`Your first issue arrives on ${p.firstIssue}.`}
      reason="You're getting this because you confirmed your H2 Economy Weekly subscription."
      preferencesHref={p.manageUrl}
      headline="Welcome to H2 Economy Weekly"
      intro={`You're subscribed. Your first issue arrives on ${p.firstIssue}.`}
      facts={[
        { label: "Arrives", value: ISSUE_SCHEDULE },
        { label: "Inside", value: ISSUE_CONTENTS },
        { label: "Your topics", value: p.topics.length ? p.topics.join(", ") : "All topics" },
        { label: "First issue", value: p.firstIssue },
      ]}
      button={{ label: "Change your topics", href: p.manageUrl }}
    />
  );
}

export interface NewsletterManageProps {
  appUrl: string;
  manageUrl: string;
  /** "7 days" */
  window: string;
}

export const newsletterManageSubject = "Change your H2 Economy Weekly topics";

/** Not drawn (M21): the "You're already subscribed" state of the sign-up form (743:7293) sends this. */
export function NewsletterManage(p: NewsletterManageProps) {
  return (
    <Frame
      appUrl={p.appUrl}
      preview="This address already gets H2 Economy Weekly."
      reason="You're getting this because someone entered this address on H2 Economy."
      preferencesHref={p.manageUrl}
      headline="You're already subscribed"
      intro="This email already gets H2 Economy Weekly. Use the button to change your topics or the extra emails."
      facts={[
        { label: "Arrives", value: ISSUE_SCHEDULE },
        { label: "Link works for", value: p.window },
      ]}
      button={{ label: "Change your topics", href: p.manageUrl }}
      after="Didn't ask for this? Ignore this email; nothing changes."
    />
  );
}
