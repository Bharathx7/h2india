import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../layout";
import { colour, type } from "../theme";

// Figma 671:428 "Messages / Email / Sign-in code". The envelope block of the frame gives the subject and preview.

export interface SignInCodeProps {
  appUrl: string;
  code: string;
  /** First name, when we know it. */
  name?: string;
  /** "10 minutes" */
  expiresIn: string;
  /** "8:51 AM IST" */
  expiresAt: string;
  /** 671:428 says the same layout serves verification codes, "with the purpose in the subject and headline". */
  /** "confirm": Confirm it's you before a bank change or an order approval (17 Nov 2026, passkeys removed). */
  purpose?: "sign-in" | "verification" | "confirm";
}

export function SignInCode({ appUrl, code, name, expiresIn, expiresAt, purpose = "sign-in" }: SignInCodeProps) {
  const verification = purpose === "verification";
  const confirm = purpose === "confirm";
  const spaced = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  return (
    <EmailLayout
      appUrl={appUrl}
      preview={`It expires in ${expiresIn}. Never share it.`}
      reason={
        confirm
          ? "You're getting this because someone signed in to your H2 Economy account asked to confirm a change."
          : verification
            ? "You're getting this because someone asked to recover the H2 Economy account for this email address."
            : "You're getting this because someone asked to sign in to H2 Economy with this email address."
      }
    >
      <Text style={{ ...type.eyebrow, color: colour.secondary, margin: "0 0 8px" }}>
        {confirm ? "Confirmation code" : verification ? "Verification code" : "Sign-in code"}
      </Text>
      <Heading as="h1" style={{ ...type.h2, color: colour.primary, margin: "0 0 8px" }}>
        {confirm ? "Your confirmation code" : verification ? "Your verification code" : "Your sign-in code"}
      </Heading>
      <Text style={{ ...type.body, color: colour.body, margin: "0 0 24px" }}>
        {name ? `Hi ${name}, enter` : "Enter"} this code on H2 Economy to{" "}
        {confirm
          ? "confirm it's you"
          : verification
            ? "confirm it's you and get back into your account"
            : "finish signing in"}
        .
      </Text>
      <Section style={{ backgroundColor: colour.subtle, borderRadius: "12px", padding: "20px", textAlign: "center" }}>
        <Text style={{ ...type.h2, color: colour.primary, margin: "0 0 4px" }}>{spaced}</Text>
        <Text style={{ ...type.caption, color: colour.secondary, margin: 0 }}>
          Expires in {expiresIn}, at {expiresAt}
        </Text>
      </Section>
      <Text style={{ ...type.bodySmall, color: colour.body, margin: "24px 0" }}>
        Never share this code with anyone, including H2 Economy staff. We&apos;ll never call or message you to ask for
        it.
      </Text>
      <Text style={{ ...type.label, margin: "0 0 24px" }}>
        <Link href={`${appUrl}/forgot-access`} style={{ color: colour.link }}>
          {confirm ? "Didn't ask for this? Secure your account" : "Didn't try to sign in? Secure your account"}
        </Link>
      </Text>
      <Text style={{ ...type.bodySmall, color: colour.body, margin: 0 }}>H2 Economy team</Text>
    </EmailLayout>
  );
}

export function signInCodeSubject(code: string, purpose: SignInCodeProps["purpose"] = "sign-in"): string {
  const word = purpose === "verification" ? "verification" : purpose === "confirm" ? "confirmation" : "sign-in";
  return `${code} is your H2 Economy ${word} code`;
}
