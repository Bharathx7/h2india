// Email, WhatsApp and SMS templates from Figma page 16 (step 3.9). Server only.
import { render } from "@react-email/components";
import { joinRequestAnsweredMessage, joinRequestToAdminMessage, verifyEmailMessage } from "./join/messages";
import { Notice } from "./notice";
import { SignInCode, signInCodeSubject, type SignInCodeProps } from "./sign-in/SignInCode";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderSignInCode(props: SignInCodeProps): Promise<RenderedEmail> {
  const element = <SignInCode {...props} />;
  return {
    subject: signInCodeSubject(props.code),
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
