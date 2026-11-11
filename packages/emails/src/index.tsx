// Email, WhatsApp and SMS templates from Figma page 16 (step 3.9). Server only.
import { render } from "@react-email/components";
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
