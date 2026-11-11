import { Button, Heading, Text } from "@react-email/components";
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
}

export function Notice({ appUrl, preview, reason, eyebrow, headline, paragraphs, button, note }: NoticeProps) {
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
      {note ? <Text style={{ ...type.bodySmall, color: colour.body, margin: "0 0 24px" }}>{note}</Text> : null}
      <Text style={{ ...type.bodySmall, color: colour.body, margin: 0 }}>H2 India team</Text>
    </EmailLayout>
  );
}
