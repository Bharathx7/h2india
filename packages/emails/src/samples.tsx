import type { RenderedEmail } from "./index";
import {
  renderNewsletterConfirm,
  renderNewsletterManage,
  renderNewsletterWelcome,
  renderJoinRequestAnswered,
  renderJoinRequestToAdmin,
  renderRecovery,
  renderReportDownload,
  renderSignInCode,
  renderVerifyEmail,
} from "./index";
import { Notice } from "./notice";
import { render } from "@react-email/components";
import { APPROVED_TEXT, type TemplateId, type TextTemplateId } from "./registry";

// Sample content for every built template (step 3.9): /dev/messages sends them to your own inbox and phone so you can
// compare each with its frame on Figma page 16 (playbook "You do"). Sample names follow the designs.

export type Sample = { kind: "email"; mail: RenderedEmail } | { kind: "text"; text: string };

export async function renderSample(id: TemplateId, appUrl: string): Promise<Sample | null> {
  const url = `${appUrl}/notifications`;
  const email = async (mail: Promise<RenderedEmail>): Promise<Sample> => ({ kind: "email", mail: await mail });
  switch (id) {
    case "email.sign_in_code":
      return email(
        renderSignInCode({ appUrl, code: "482913", name: "Ravi", expiresIn: "10 minutes", expiresAt: "8:51 AM IST" }),
      );
    case "email.recovery_code":
      return email(
        renderSignInCode({
          appUrl,
          code: "482913",
          name: "Ravi",
          purpose: "verification",
          expiresIn: "10 minutes",
          expiresAt: "8:51 AM IST",
        }),
      );
    case "email.passkey_reset_admin":
      return email(
        renderRecovery(appUrl, "passkeyReset", {
          adminName: "Meera",
          person: "Arjun Shah",
          company: "Greenfield Hydrogen",
          supportEmail: "support@h2india.in",
        }),
      );
    case "email.verify_email":
      return email(renderVerifyEmail(appUrl, { email: "ravi.k@greenfieldh2.in", url }));
    case "email.join_request_admin":
      return email(
        renderJoinRequestToAdmin(appUrl, {
          adminName: "Meera",
          requesterName: "Arjun Shah",
          requesterEmail: "arjun.shah@greenfieldh2.in",
          company: "Greenfield Hydrogen",
          url,
          reminder: false,
        }),
      );
    case "email.join_request_answered":
      return email(
        renderJoinRequestAnswered(appUrl, {
          approved: true,
          adminName: "Meera Pillai",
          company: "Greenfield Hydrogen",
          reason: null,
          url,
        }),
      );
    case "email.recovery_approval":
      return email(
        renderRecovery(appUrl, "recoveryApproval", {
          adminName: "Meera",
          person: "Arjun Shah",
          company: "Greenfield Hydrogen",
          what: "mobile",
          url,
        }),
      );
    case "email.support_request":
      return email(
        renderRecovery(appUrl, "supportRequest", {
          reference: "SUP-2026-01942",
          name: "Arjun Shah",
          company: "Greenfield Hydrogen",
          contactEmail: "arjun.shah.work@gmail.com",
          kind: "Lost email: support request with work ID",
          url,
        }),
      );
    case "email.new_email_confirm":
      return email(renderRecovery(appUrl, "newEmail", { email: "arjun.shah@greenfieldh2.in", url }));
    case "email.mobile_changed":
      return email(renderRecovery(appUrl, "mobileChanged", { mobile: "+91 98•••• 6218" }));
    case "email.newsletter_confirmation":
      return email(
        renderNewsletterConfirm({
          appUrl,
          confirmUrl: `${appUrl}/newsletter/confirm`,
          firstIssue: "Monday 16 November",
          linkUntil: "12 Nov 2026, 8:12 PM IST",
          window: "48 hours",
        }),
      );
    case "email.newsletter_welcome":
      return email(
        renderNewsletterWelcome({
          appUrl,
          manageUrl: `${appUrl}/newsletter/confirm`,
          firstIssue: "Monday 16 November",
          topics: ["Policy", "Tenders & schemes", "Projects"],
        }),
      );
    case "email.newsletter_manage":
      return email(renderNewsletterManage({ appUrl, manageUrl: `${appUrl}/newsletter/confirm`, window: "7 days" }));
    case "email.report_download":
      return email(
        renderReportDownload(appUrl, {
          name: "Ravi",
          title: "Electrolyser buying in India 2026",
          url: `${appUrl}/knowledge/reports`,
          days: 7,
        }),
      );
    case "email.test": {
      const element = (
        <Notice
          appUrl={appUrl}
          preview="A test from /dev/messages."
          reason="You're getting this because you sent a test from /dev/messages."
          eyebrow="Test message"
          headline="It works"
          paragraphs={["This test went through the notification service and its delivery log."]}
          button={{ label: "Open notifications", href: url }}
        />
      );
      return {
        kind: "email",
        mail: {
          subject: "H2 India test message",
          html: await render(element),
          text: await render(element, { plainText: true }),
        },
      };
    }
    default:
      if (id in APPROVED_TEXT) {
        return {
          kind: "text",
          text: (APPROVED_TEXT[id as TextTemplateId] as (d: Record<string, string>) => string)({ code: "482913" }),
        };
      }
      return null;
  }
}
