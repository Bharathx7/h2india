import type { RenderedEmail } from "./index";
import {
  renderNewsletterConfirm,
  renderNewsletterManage,
  renderNewsletterWelcome,
  renderJoinRequestAnswered,
  renderJoinRequestToAdmin,
  renderRecovery,
  renderReportDownload,
  renderSubmissionReceived,
  renderGrievance,
  renderWebinarRegistered,
  renderAlertDigest,
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
    case "email.claim_code":
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
    case "email.webinar_registration":
      return email(
        renderWebinarRegistered(appUrl, {
          name: "Ravi Kulkarni",
          title: "Electrolyser buying in India: what to check before you order",
          date: "Thursday 26 Nov 2026",
          time: "4:00 to 5:00 PM IST",
          short: "26 Nov at 4 PM IST",
          joinUrl: `${appUrl}/events/electrolyser-buying/join`,
          host: "H2 India editorial team",
          calendar: { google: appUrl, outlook: appUrl, ics: `${appUrl}/events/electrolyser-buying/ics` },
        }),
      );
    case "email.grievance_acknowledgement":
      return email(
        renderGrievance(appUrl, {
          name: "Suresh Natarajan",
          reference: "GRV-2026-00318",
          about: "Listing · Type IV cylinder, 350 bar · Hydrotek Systems",
          raised: "10 Nov 2026, 9:40 PM IST",
          acknowledged: "11 Nov 2026, 10:15 AM IST",
          resolveBy: "25 Nov 2026",
          teamLine: "our listings team is checking the certificate with the supplier",
          officer:
            "[Grievance officer], Grievance Officer, H2 India · grievance@[H2 India domain] · [Registered office address]",
          signature: "[Grievance officer], Grievance Officer, H2 India",
          statusUrl: `${appUrl}/legal/grievance-officer?ticket=GRV-2026-00318`,
        }),
      );
    case "email.submission_received":
      return email(
        renderSubmissionReceived(appUrl, {
          kind: "event",
          name: "Rohan Mehta",
          reference: "EV-2026-0412",
          title: "Safe hydrogen storage workshop 2026",
          rows: [
            { label: "Event", value: "Safe hydrogen storage workshop 2026" },
            { label: "Type and date", value: "Workshop · 10 Dec 2026" },
            { label: "Place", value: "Ratnagiri, Maharashtra" },
          ],
          url: `${appUrl}/events/submit`,
        }),
      );
    case "email.tender_alert_digest":
      return email(
        renderAlertDigest("5 tenders match your alert · BPCL compressor package closes tomorrow", {
          appUrl,
          eyebrow: "Tender alert · daily digest",
          headline: "5 tenders match your alert",
          intro:
            "Equipment, electrolysers, production, EPC and refuelling tenders in all states. We check each one against the issuer's portal before we send it.",
          items: [
            {
              over: "BPCL · Madhya Pradesh",
              title: "Hydrogen compressor package, Bina refinery",
              reference: "BPCL/BINA/2026/118",
              due: "Bid due 12 Nov 2026 · 1 day left",
              soon: true,
              href: `${appUrl}/opportunities/tenders`,
            },
            {
              over: "IOCL · Haryana",
              title: "Supply of a 10 MW PEM electrolyser, Panipat refinery",
              reference: "IOCL/PR/GH2/2026-27/09",
              due: "Bid due 21 Nov 2026 · 10 days left",
              href: `${appUrl}/opportunities/tenders`,
            },
          ],
          viewLabel: "View tender",
          all: { label: "See all open tenders", href: `${appUrl}/opportunities/tenders` },
          manageHref: `${appUrl}/member/alerts`,
          offHref: `${appUrl}/alerts/off`,
          reason: "You're getting this because you set up a daily tender alert.",
          preview: "SECI green ammonia, IOCL 10 MW electrolyser and 2 more.",
        }),
      );
    case "whatsapp.tender_alert_instant":
      return {
        kind: "text",
        text: APPROVED_TEXT["whatsapp.tender_alert_instant"]({
          issuer: "IOCL",
          change: "extended the bid due date",
          title: "Supply of a 10 MW PEM electrolyser, Panipat refinery",
          reference: "IOCL/PR/GH2/2026-27/09",
          due: "21 Nov 2026",
          alert: "electrolysers in all states",
        }),
      };
    case "whatsapp.scheme_alert":
      return {
        kind: "text",
        text: APPROVED_TEXT["whatsapp.scheme_alert"]({
          scheme: "SIGHT programme Component II",
          what: "Mode 2A Tranche II bids",
          due: "15 Nov 2026",
          where: "the SECI e-tender portal",
          left: "5 days",
          alert: "production incentives",
        }),
      };
    case "whatsapp.webinar_registration":
      return {
        kind: "text",
        text: APPROVED_TEXT["whatsapp.webinar_registration"]({
          name: "Ravi",
          title: "Electrolyser buying in India: what to check before you order",
          date: "Thursday 26 Nov 2026",
          time: "4:00 to 5:00 PM",
        }),
      };
    case "whatsapp.webinar_reminder":
      return {
        kind: "text",
        text: APPROVED_TEXT["whatsapp.webinar_reminder"]({
          name: "Ravi",
          title: "Electrolyser buying in India: what to check before you order",
          time: "4:00 PM",
        }),
      };
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
