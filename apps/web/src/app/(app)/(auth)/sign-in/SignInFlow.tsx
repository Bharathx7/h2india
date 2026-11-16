"use client";

import { formatIstTime, SIGN_IN, SIGN_IN_ERROR } from "@h2india/core/sign-in";
import { Alert, Button, buttonClasses, FormField, Icon, Input, OtpInput, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type SyntheticEvent, type ReactNode } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient, type SignInErrorDetail } from "@/lib/auth-client";
import { AuthCard } from "../AuthCard";
import { whereNext } from "./actions";

// The sign-in screens of Figma section 524:1772, as one flow so nothing has to travel in the address bar.
// Copy is the frames'. Messages the design does not show (rate limits, passkey failures, Google not set up) are
// short and plain; they are listed in docs/design-fidelity.md.

type Step = "start" | "code" | "paused" | "offer";

interface Problem {
  title: string;
  body?: ReactNode;
}

const OFFER_COOKIE = "h2_passkey_offer";
const OFFER_LATER_DAYS = 30;

const linkButton = "cursor-pointer";

/** The error body carries our extra fields (code, triesLeft, until, retryAt) next to Better Auth's own. */
function asDetail(error: unknown): SignInErrorDetail {
  return error ?? {};
}

function retryIn(iso: string | undefined): string {
  if (!iso) return "a minute";
  const seconds = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  return seconds < 90 ? `${String(seconds)} seconds` : `${String(Math.ceil(seconds / 60))} minutes`;
}

/** "MacBook · Chrome", so people can tell their passkeys apart later (Security page). */
function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "This device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}

function offerSnoozed(): boolean {
  return document.cookie.split("; ").some((c) => c === `${OFFER_COOKIE}=later`);
}

function snoozeOffer() {
  document.cookie = `${OFFER_COOKIE}=later; max-age=${String(OFFER_LATER_DAYS * 86400)}; path=/; samesite=lax`;
}

export function SignInFlow({
  next,
  initialError,
  staffOnly = false,
  signedInElsewhere = false,
}: {
  next: string;
  initialError?: Problem;
  /** The admin domain (public QC, 16 Nov 2026): staff wording, no Google and no Join. */
  staffOnly?: boolean;
  /** Admin domain, already signed in as someone who isn't staff: only Sign out is offered. */
  signedInElsewhere?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<Problem | undefined>(initialError);
  const [wrong, setWrong] = useState<"wrong" | "expired">();
  const [pausedUntil, setPausedUntil] = useState<Date>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"passkey" | "send" | "verify" | "google" | "create">();
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new heading when the step changes, so screen readers announce the new screen.
  useEffect(() => {
    if (step !== "start") heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (resendAt <= now) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [resendAt, now]);

  const finish = () => {
    void whereNext(next).then((to) => {
      router.replace(to);
      router.refresh();
    });
  };

  const pause = (until: string | undefined) => {
    setPausedUntil(until ? new Date(until) : new Date(Date.now() + SIGN_IN.pauseMinutes * 60_000));
    setProblem(undefined);
    setWrong(undefined);
    setCode("");
    setStep("paused");
  };

  const sendProblem = (detail: SignInErrorDetail): Problem => {
    if (detail.code === SIGN_IN_ERROR.suspended) {
      return {
        title: "This account is suspended",
        body: "To appeal, reply to the email we sent you or write to the grievance officer.",
      };
    }
    if (detail.code === SIGN_IN_ERROR.resendTooSoon) {
      return {
        title: "Please wait before asking again",
        body: `You can ask for a new code in ${retryIn(detail.retryAt)}.`,
      };
    }
    if (detail.code === SIGN_IN_ERROR.tooManyCodes || detail.status === 429) {
      return { title: "Too many codes requested", body: `Try again in ${retryIn(detail.retryAt)}, or use a passkey.` };
    }
    return { title: "We couldn't send a code", body: "Check your connection and try again." };
  };

  const sendCode = async (): Promise<boolean> => {
    setBusy("send");
    setProblem(undefined);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(undefined);
    if (error) {
      const detail = asDetail(error);
      if (detail.code === SIGN_IN_ERROR.paused) {
        pause(detail.until);
        return false;
      }
      setProblem(sendProblem(detail));
      return false;
    }
    const at = Date.now();
    setNow(at);
    setResendAt(at + SIGN_IN.resendSeconds * 1000);
    return true;
  };

  const onEmail = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Enter your work email, like you@company.com");
      return;
    }
    setEmailError(undefined);
    if (await sendCode()) {
      setCode("");
      setWrong(undefined);
      setStep("code");
    }
  };

  const afterCodeSignIn = async () => {
    const canPasskey = typeof window.PublicKeyCredential === "function";
    if (canPasskey && !offerSnoozed()) {
      const { data } = await authClient.passkey.listUserPasskeys();
      if (data?.length === 0) {
        setStep("offer");
        return;
      }
    }
    finish();
  };

  const verify = async (value: string) => {
    if (value.length < SIGN_IN.codeLength || busy === "verify") return;
    setBusy("verify");
    setProblem(undefined);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: value });
    if (!error) {
      await afterCodeSignIn();
      setBusy(undefined);
      return;
    }
    setBusy(undefined);
    const detail = asDetail(error);
    if (detail.code === SIGN_IN_ERROR.paused) {
      pause(detail.until);
    } else if (detail.code === SIGN_IN_ERROR.expiredCode) {
      setWrong("expired");
      setProblem({ title: "That code has expired", body: "Resend a new one." });
    } else if (detail.code === SIGN_IN_ERROR.wrongCode) {
      const left = detail.triesLeft ?? 1;
      setWrong("wrong");
      setProblem({
        title: "That code didn't work",
        body: `Check the code and try again. You have ${String(left)} ${left === 1 ? "try" : "tries"} left before we pause sign-in for ${String(SIGN_IN.pauseMinutes)} minutes.`,
      });
    } else {
      setProblem({ title: "We couldn't check the code", body: "Check your connection and try again." });
    }
  };

  const resend = async () => {
    if (await sendCode()) {
      setCode("");
      setWrong(undefined);
    }
  };

  const passkeySignIn = async () => {
    setBusy("passkey");
    setProblem(undefined);
    const result = await authClient.signIn.passkey();
    setBusy(undefined);
    if (!result.error) {
      finish();
      return;
    }
    // Closing the browser's passkey window is not an error worth a message.
    const message = result.error.message ?? "";
    if (/cancel|abort|not allowed|NotAllowed/i.test(message)) return;
    setProblem({ title: "That passkey didn't work", body: "Try again, or sign in with an email code." });
  };

  const google = async () => {
    setBusy("google");
    setProblem(undefined);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: `${AUTH_LINKS.signIn}?error=google`,
    });
    if (error) {
      setBusy(undefined);
      setProblem({ title: "Google sign-in isn't available yet", body: "Use a passkey or an email code." });
    }
  };

  const createPasskey = async () => {
    setBusy("create");
    setProblem(undefined);
    const result = await authClient.passkey.addPasskey({ name: deviceName() });
    setBusy(undefined);
    if (!result.error) {
      finish();
      return;
    }
    const message = result.error.message ?? "";
    if (/cancel|abort|not allowed|NotAllowed/i.test(message)) return;
    setProblem({ title: "We couldn't create the passkey", body: "Try again, or choose Not now." });
  };

  const alert = problem ? (
    <Alert tone="error" title={problem.title} live>
      {problem.body}
    </Alert>
  ) : null;

  if (step === "paused") {
    return (
      <AuthCard>
        <span className="flex size-14 items-center justify-center rounded-pill bg-subtle text-primary">
          <Icon name="lock" size={28} />
        </span>
        <h1 ref={heading} tabIndex={-1} className="type-h2 text-primary outline-none">
          Sign-in paused for {SIGN_IN.pauseMinutes} minutes
        </h1>
        <p className="type-body text-body">
          There were too many wrong codes for {email.trim()}. To keep the account safe, you can try again at{" "}
          {formatIstTime(pausedUntil ?? new Date())}.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => {
            setStep("start");
          }}
        >
          Back to sign in
        </Button>
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={AUTH_LINKS.contactSupport}>Not you trying? Contact support</Link>
        </TextLink>
      </AuthCard>
    );
  }

  if (step === "offer") {
    return (
      <AuthCard>
        <h1 ref={heading} tabIndex={-1} className="type-h2 text-primary outline-none">
          Set up a passkey
        </h1>
        <p className="type-body text-body">
          Use this device&apos;s fingerprint, face or screen lock to sign in next time.
        </p>
        {alert}
        <Button
          size="lg"
          leadingIcon="lock"
          className="w-full"
          disabled={busy === "create"}
          onClick={() => void createPasskey()}
        >
          Create passkey
        </Button>
        <TextLink asChild showIcon={false} className="self-start">
          <button
            type="button"
            className={linkButton}
            onClick={() => {
              snoozeOffer();
              finish();
            }}
          >
            Not now
          </button>
        </TextLink>
      </AuthCard>
    );
  }

  if (step === "code") {
    const waiting = Math.max(0, Math.ceil((resendAt - now) / 1000));
    return (
      <AuthCard>
        <h1 ref={heading} tabIndex={-1} className="type-h2 text-primary outline-none">
          Check your email
        </h1>
        <p className="type-body text-body">
          We sent a {SIGN_IN.codeLength}-digit code to {email.trim()}. It expires in {SIGN_IN.codeMinutes} minutes.
        </p>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void verify(code);
          }}
        >
          <FormField label="Enter the code">
            <OtpInput
              size="field"
              label="Code from your email"
              value={code}
              onChange={(value) => {
                setCode(value);
                if (wrong) setWrong(undefined);
              }}
              onComplete={(value) => void verify(value)}
              invalid={wrong !== undefined}
              disabled={busy === "verify"}
              autoFocus
            />
          </FormField>
          {alert}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {waiting > 0 ? (
              <p className="type-body-sm text-secondary" aria-live="off">
                Resend code in 0:{String(waiting).padStart(2, "0")}
              </p>
            ) : (
              <TextLink asChild showIcon={false}>
                <button type="button" className={linkButton} disabled={busy === "send"} onClick={() => void resend()}>
                  Resend code
                </button>
              </TextLink>
            )}
            <TextLink asChild showIcon={false}>
              <button
                type="button"
                className={linkButton}
                onClick={() => {
                  setProblem(undefined);
                  setWrong(undefined);
                  setStep("start");
                }}
              >
                Use a different email
              </button>
            </TextLink>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy === "verify"}>
            Continue
          </Button>
        </form>
        {problem ? null : (
          <TextLink asChild showIcon={false} className="self-start">
            <Link href={AUTH_LINKS.forgotAccess}>Trouble signing in?</Link>
          </TextLink>
        )}
      </AuthCard>
    );
  }

  if (signedInElsewhere) {
    return (
      <AuthCard>
        <h1 className="type-h2 text-primary">Sign in to the H2 India back office</h1>
        {alert}
        <a href="/sign-out" className={`${buttonClasses({ variant: "outline", size: "lg" })} w-full`}>
          Sign out
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      {staffOnly ? (
        <>
          <h1 className="type-h2 text-primary">Sign in to the H2 India back office</h1>
          <p className="type-body text-body">
            For H2 India staff. Use your passkey, or a code sent to your work email.
          </p>
        </>
      ) : (
        <>
          <h1 className="type-h2 text-primary">Sign in to H2 India</h1>
          <p className="type-body text-body">
            One sign-in for buyers, suppliers and members. You&apos;ll come back to the page you were on.
          </p>
        </>
      )}
      {alert}
      <Button
        size="lg"
        leadingIcon="lock"
        className="w-full"
        disabled={busy === "passkey"}
        onClick={() => void passkeySignIn()}
      >
        Continue with passkey
      </Button>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="flex-1 border-t border-default" />
        <span className="type-body-sm text-secondary">or</span>
        <span className="flex-1 border-t border-default" />
      </div>
      <form className="flex flex-col gap-5" onSubmit={(event) => void onEmail(event)} noValidate>
        <FormField label="Work email" error={emailError}>
          <Input
            type="email"
            name="email"
            autoComplete="email webauthn"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(undefined);
            }}
          />
        </FormField>
        <Button type="submit" variant="outline" size="lg" className="w-full" disabled={busy === "send"}>
          Send code
        </Button>
      </form>
      {staffOnly ? null : (
        <button
          type="button"
          onClick={() => void google()}
          disabled={busy === "google"}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-card border border-default bg-page px-3.5 type-label text-primary transition-colors duration-(--motion-duration-fast) ease-standard hover:border-hover disabled:cursor-default disabled:text-secondary"
        >
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-pill border border-control type-label-sm"
          >
            G
          </span>
          Continue with Google
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextLink asChild showIcon={false}>
          <Link href={AUTH_LINKS.forgotAccess}>Trouble signing in?</Link>
        </TextLink>
        {staffOnly ? null : (
          <p className="flex items-center gap-1 type-body-sm text-body">
            New to H2 India?{" "}
            <TextLink asChild showIcon={false}>
              <Link href={AUTH_LINKS.join}>Join free</Link>
            </TextLink>
          </p>
        )}
      </div>
    </AuthCard>
  );
}
