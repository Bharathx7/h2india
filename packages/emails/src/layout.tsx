import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { colour, type } from "./theme";

// Shared email frame from Figma page 16: Email header (logo), body, Email footer.
// The registered office line of the footer waits for decision M2 and is left out until then (OPEN: M2).

export interface EmailLayoutProps {
  appUrl: string;
  preview: string;
  /** Why the person is getting this email (footer "Reason" line). */
  reason: string;
  children: ReactNode;
}

export function EmailLayout({ appUrl, preview, reason, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colour.subtle, margin: 0, padding: "24px 0" }}>
        <Container
          width={600}
          style={{ backgroundColor: colour.page, border: `1px solid ${colour.border}`, maxWidth: "600px" }}
        >
          <Section style={{ padding: "24px 32px", borderBottom: `1px solid ${colour.border}` }}>
            <Img src={`${appUrl}/brand/h2india-logo-email.png`} width={132} height={36} alt="H2 India" />
          </Section>
          <Section style={{ padding: "32px" }}>{children}</Section>
          <Section style={{ padding: "24px 32px", backgroundColor: colour.subtle }}>
            <Text style={{ ...type.caption, color: colour.body, margin: "0 0 8px" }}>{reason}</Text>
            <Text style={{ ...type.caption, margin: 0 }}>
              <Link href={`${appUrl}/account/notifications`} style={{ color: colour.link }}>
                Email preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
