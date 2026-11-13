// Email, WhatsApp and SMS templates from Figma page 16 (step 3.9). Server only.
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { joinRequestAnsweredMessage, joinRequestToAdminMessage, verifyEmailMessage } from "./join/messages";
import {
  submissionReceivedMessage,
  webinarRegisteredMessage,
  webinarReminderMessage,
  webinarReplayMessage,
  type WebinarDetails,
} from "./events/messages";
import { reportDownloadMessage } from "./knowledge/messages";
import { grievanceMessage, type GrievanceDetails } from "./trust/messages";
import {
  NewsletterConfirm,
  newsletterConfirmSubject,
  NewsletterManage,
  newsletterManageSubject,
  NewsletterWelcome,
  newsletterWelcomeSubject,
  type NewsletterConfirmProps,
  type NewsletterManageProps,
  type NewsletterWelcomeProps,
} from "./newsletter/Newsletter";
import { Notice } from "./notice";
import {
  mobileChangedMessage,
  newEmailMessage,
  passkeyResetMessage,
  recoveryApprovalMessage,
  supportReceivedMessage,
  supportRequestMessage,
} from "./recovery/messages";
import { SignInCode, signInCodeSubject, type SignInCodeProps } from "./sign-in/SignInCode";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderSignInCode(props: SignInCodeProps): Promise<RenderedEmail> {
  const element = <SignInCode {...props} />;
  return {
    subject: signInCodeSubject(props.code, props.purpose),
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

export type { SignInCodeProps };

type NoticeMessage = ReturnType<typeof verifyEmailMessage>;

async function renderNotice(appUrl: string, message: NoticeMessage): Promise<RenderedEmail> {
  const element = <Notice appUrl={appUrl} {...message} />;
  return { subject: message.subject, html: await render(element), text: await render(element, { plainText: true }) };
}

export function renderVerifyEmail(appUrl: string, input: Parameters<typeof verifyEmailMessage>[0]) {
  return renderNotice(appUrl, verifyEmailMessage(input));
}

export function renderJoinRequestToAdmin(appUrl: string, input: Parameters<typeof joinRequestToAdminMessage>[0]) {
  return renderNotice(appUrl, joinRequestToAdminMessage(input));
}

export function renderJoinRequestAnswered(appUrl: string, input: Parameters<typeof joinRequestAnsweredMessage>[0]) {
  return renderNotice(appUrl, joinRequestAnsweredMessage(input));
}

async function renderElement(subject: string, element: ReactElement): Promise<RenderedEmail> {
  return { subject, html: await render(element), text: await render(element, { plainText: true }) };
}

/** India H₂ Weekly: confirm (676:8), welcome (its variant) and already subscribed (step 5.1, A46). */
export function renderNewsletterConfirm(props: NewsletterConfirmProps) {
  return renderElement(newsletterConfirmSubject, <NewsletterConfirm {...props} />);
}

export function renderNewsletterWelcome(props: NewsletterWelcomeProps) {
  return renderElement(newsletterWelcomeSubject, <NewsletterWelcome {...props} />);
}

export function renderNewsletterManage(props: NewsletterManageProps) {
  return renderElement(newsletterManageSubject, <NewsletterManage {...props} />);
}

export { ISSUE_CONTENTS, ISSUE_SCHEDULE } from "./newsletter/Newsletter";

/** The emailed copy of a gated report (step 4.4). */
export function renderWebinarRegistered(appUrl: string, input: Parameters<typeof webinarRegisteredMessage>[0]) {
  return renderNotice(appUrl, webinarRegisteredMessage(input));
}
export function renderWebinarReminder(appUrl: string, input: WebinarDetails, which: "day" | "hour") {
  return renderNotice(appUrl, webinarReminderMessage(input, which));
}
export function renderWebinarReplay(appUrl: string, input: Parameters<typeof webinarReplayMessage>[0]) {
  return renderNotice(appUrl, webinarReplayMessage(input));
}
export function renderSubmissionReceived(appUrl: string, input: Parameters<typeof submissionReceivedMessage>[0]) {
  return renderNotice(appUrl, submissionReceivedMessage(input));
}
export type { SubmissionKind, WebinarDetails } from "./events/messages";

/** Grievance acknowledgement (676:154, step 5.8). */
export function renderGrievance(appUrl: string, input: GrievanceDetails) {
  return renderNotice(appUrl, grievanceMessage(input));
}
export type { GrievanceDetails } from "./trust/messages";

export function renderReportDownload(appUrl: string, input: Parameters<typeof reportDownloadMessage>[0]) {
  return renderNotice(appUrl, reportDownloadMessage(input));
}

type Builder = (input: never) => NoticeMessage;
const builders = {
  passkeyReset: passkeyResetMessage,
  recoveryApproval: recoveryApprovalMessage,
  supportRequest: supportRequestMessage,
  supportReceived: supportReceivedMessage,
  newEmail: newEmailMessage,
  mobileChanged: mobileChangedMessage,
} satisfies Record<string, Builder>;

/** Renders one of the recovery messages (step 3.5). */
export function renderRecovery<K extends keyof typeof builders>(
  appUrl: string,
  kind: K,
  input: Parameters<(typeof builders)[K]>[0],
): Promise<RenderedEmail> {
  const build = builders[kind] as (i: typeof input) => NoticeMessage;
  return renderNotice(appUrl, build(input));
}

export { APPROVED_TEXT, TEMPLATES } from "./registry";
export type { Channel, TemplateEntry, TemplateId, TextTemplateId } from "./registry";
export { renderSample } from "./samples";
export type { Sample } from "./samples";

// Alerts (step 7.3): Tender alert digest 665:307, for every alert type.
import { AlertDigest, type AlertDigestProps } from "./alerts/AlertDigest";
export type { AlertDigestItem, AlertDigestProps } from "./alerts/AlertDigest";

export async function renderAlertDigest(subject: string, props: AlertDigestProps): Promise<RenderedEmail> {
  return renderElement(subject, <AlertDigest {...props} />);
}

// Supplier verification (step 8.2): Verification status 673:221 and its variants.
import {
  bankChangedMessage,
  documentExpiringMessage,
  invitationMessage,
  listingApprovedMessage,
  listingNeedsChangesMessage,
  needsChangesMessage,
  verifiedMessage,
} from "./supplier/messages";
export type { ExpiringDocument, ListingDetails } from "./supplier/messages";

export function renderDocumentExpiring(appUrl: string, input: Parameters<typeof documentExpiringMessage>[0]) {
  return renderNotice(appUrl, documentExpiringMessage(input));
}
export function renderVerified(appUrl: string, input: Parameters<typeof verifiedMessage>[0]) {
  return renderNotice(appUrl, verifiedMessage(input));
}
export function renderVerificationChanges(appUrl: string, input: Parameters<typeof needsChangesMessage>[0]) {
  return renderNotice(appUrl, needsChangesMessage(input));
}
export function renderListingNeedsChanges(appUrl: string, input: Parameters<typeof listingNeedsChangesMessage>[0]) {
  return renderNotice(appUrl, listingNeedsChangesMessage(input));
}
export function renderListingApproved(appUrl: string, input: Parameters<typeof listingApprovedMessage>[0]) {
  return renderNotice(appUrl, listingApprovedMessage(input));
}
export function renderBankChanged(appUrl: string, input: Parameters<typeof bankChangedMessage>[0]) {
  return renderNotice(appUrl, bankChangedMessage(input));
}
export function renderInvitation(appUrl: string, input: Parameters<typeof invitationMessage>[0]) {
  return renderNotice(appUrl, invitationMessage(input));
}
