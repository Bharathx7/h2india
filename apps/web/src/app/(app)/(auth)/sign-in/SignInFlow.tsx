"use client";

import {
  ACCOUNT_KINDS,
  ACCOUNT_PAGES,
  formatIstTime,
  PASSWORD_PAGES,
  SIGN_IN,
  SIGN_IN_ERROR,
  type AccountKind,
} from "@h2india/core/sign-in";
import { Alert, Button, FormField, Icon, Input, OtpInput, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type SyntheticEvent, type ReactNode } from "react";
import { PasswordInput } from "@/account/PasswordInput";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient, type SignInErrorDetail } from "@/lib/auth-client";
import { AuthCard } from "../AuthCard";
import { whereNext } from "./actions";

// The sign-in screens of Figma section 524:1772, as one flow so nothing has to travel in the address bar.
// Copy is the frames'. Messages the design does not show (rate limits, Google not set up) are short and plain; they are
// listed in docs/design-fidelity.md. Passkeys were removed on 17 Nov 2026 (A183). Since 19 Nov 2026 (A195) the buyer,
// supplier and member pages sign in with email and password, with "Email me a code instead" as the backup (the code
// flow below, unchanged); the local /sign-in keeps the code and Google, and staff use staff/StaffSignIn.tsx.

type Step = "start" | "code" | "paused";

interface Problem {
  title: string;
  body?: ReactNode;
}

/** Each account page's words (public QC 2, 16 Nov 2026): email only, no Google. */
const CREATE_WORDS: Record<AccountKind, string> = {
  buyer: "Create a buyer account",
  supplier: "Create a supplier account",
  member: "Join as a member",
};

const AUDIENCE: Record<AccountKind, { title: string; lead: string; label: string; join: string; other: string }> = {
  buyer: {
    title: "Buyer sign in",
    lead: "Sign in to request quotes, compare suppliers and follow your orders.",
    label: "Work email",
    join: "Create a buyer account",
    other: "Buyer",
  },
  supplier: {
    title: "Supplier sign in",
    lead: "Sign in to manage your listings, quote requests and orders.",
    label: "Work email",
    join: "Create a supplier account",
    other: "Supplier",
  },
  member: {
    title: "Member sign in",
    lead: "Sign in to see your saved items, follows, alerts and Hydrogen 101 progress.",
    label: "Email",
    join: "Join as a member",
    other: "Member",
  },
};
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

/** The audience pages' first screen: email and password, or (the backup) an email code. */
type Mode = "password" | "code";

export function SignInFlow({
  next,
  initialError,
  audience,
}: {
  next: string;
  initialError?: Problem;
  /** The buyer, supplier or member sign-in page (public QC 2): email code only, that page's words and sign-up. */
  audience?: AccountKind;
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
  const [busy, setBusy] = useState<"send" | "verify" | "google" | "password">();
  const [mode, setMode] = useState<Mode>(audience ? "password" : "code");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const [pausedBy, setPausedBy] = useState<"code" | "password">("code");
  const heading = useRef<HTMLHeadingElement>(null);
  const words = audience ? AUDIENCE[audience] : null;
  const others = ACCOUNT_KINDS.filter((k) => k !== audience);

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
    void whereNext(next, audience).then((to) => {
      router.replace(to);
      router.refresh();
    });
  };

  const pause = (until: string | undefined, by: "code" | "password" = "code") => {
    setPausedBy(by);
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
      return {
        title: "Too many codes requested",
        body: `Try again in ${retryIn(detail.retryAt)}.`,
      };
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

  const verify = async (value: string) => {
    if (value.length < SIGN_IN.codeLength || busy === "verify") return;
    setBusy("verify");
    setProblem(undefined);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: value });
    if (!error) {
      finish();
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

  const onPassword = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(badEmail ? "Enter your email, like you@company.com" : undefined);
    setPasswordError(password ? undefined : "Enter your password");
    if (badEmail || !password) return;
    setBusy("password");
    setProblem(undefined);
    const { error } = await authClient.signIn.email({ email: value, password });
    if (!error) {
      finish();
      return;
    }
    setBusy(undefined);
    setPassword("");
    const detail = asDetail(error);
    if (detail.code === SIGN_IN_ERROR.paused) {
      pause(detail.until, "password");
    } else if (detail.code === SIGN_IN_ERROR.suspended) {
      setProblem(sendProblem(detail));
    } else if (detail.code === SIGN_IN_ERROR.wrongPassword || detail.code === SIGN_IN_ERROR.emailNotConfirmed) {
      // An unconfirmed email (a backstop that no path should reach) gets the same words, so it reveals nothing.
      const left = detail.triesLeft;
      setProblem({
        title: "Email or password is wrong",
        body:
          left === undefined
            ? "Check them and try again."
            : `Check them and try again. You have ${String(left)} ${left === 1 ? "try" : "tries"} left before we pause sign-in for ${String(SIGN_IN.pauseMinutes)} minutes.`,
      });
    } else if (detail.status === 429) {
      setProblem({ title: "Too many tries", body: "Wait a minute and try again." });
    } else {
      setProblem({ title: "We couldn't sign you in", body: "Check your connection and try again." });
    }
  };

  const switchMode = (to: Mode) => {
    setMode(to);
    setProblem(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
  };

  const resend = async () => {
    if (await sendCode()) {
      setCode("");
      setWrong(undefined);
    }
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
      setProblem({ title: "Google sign-in isn't available yet", body: "Use an email code." });
    }
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
          There were too many wrong {pausedBy === "password" ? "passwords" : "codes"} for {email.trim()}. To keep the
          account safe, you can try again at {formatIstTime(pausedUntil ?? new Date())}.
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

  if (step === "code") {
    const waiting = Math.max(0, Math.ceil((resendAt - now) / 1000));
    return (
      <AuthCard>
        <h1 ref={heading} tabIndex={-1} className="type-h2 text-primary outline-none">
          Check your email
        </h1>
        <p className="type-body text-body">
          We&apos;ve sent an email to {email.trim()}. If it has an H2 Economy account, the email holds a{" "}
          {SIGN_IN.codeLength}-digit code that expires in {SIGN_IN.codeMinutes} minutes. If it doesn&apos;t, the email
          tells you how to create one.
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
        {/* No account (founder QC, 19 Nov 2026): never say whether an email has an account, but always show the way
            to create one, the person's own kind first. */}
        <div className="flex flex-col gap-2 rounded-card border border-default bg-subtle p-4">
          <p className="type-label text-primary">No email after 2 minutes?</p>
          <p className="type-body-sm text-body">
            Check your spam folder. If you don&apos;t have an account yet, create one. It&apos;s free.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[...(audience ? [audience] : []), ...ACCOUNT_KINDS.filter((k) => k !== audience)].map((k) => (
              <TextLink key={k} asChild showIcon={false}>
                <Link href={ACCOUNT_PAGES[k].join}>{CREATE_WORDS[k]}</Link>
              </TextLink>
            ))}
          </div>
        </div>
      </AuthCard>
    );
  }

  // Buyer, supplier and member pages (public QC 2; A195): email and password, or an email code instead.
  if (audience && words) {
    const keep = next !== ACCOUNT_PAGES[audience].home && next !== "/";
    const withNext = (href: string) => (keep ? `${href}?next=${encodeURIComponent(next)}` : href);
    const emailField = (
      <FormField label={words.label} error={emailError}>
        <Input
          type="email"
          name="email"
          autoComplete={mode === "password" ? "username" : "email"}
          placeholder={audience === "member" ? "you@example.com" : "you@company.com"}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(undefined);
          }}
        />
      </FormField>
    );
    return (
      <AuthCard>
        <h1 className="type-h2 text-primary">{words.title}</h1>
        <p className="type-body text-body">{words.lead}</p>
        {alert}
        {mode === "password" ? (
          <>
            <form className="flex flex-col gap-5" onSubmit={(event) => void onPassword(event)} noValidate>
              {emailField}
              <FormField label="Password" error={passwordError}>
                <PasswordInput
                  value={password}
                  autoComplete="current-password"
                  onChange={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError(undefined);
                  }}
                />
              </FormField>
              <div className="-mt-2 flex flex-col gap-1">
                <TextLink asChild showIcon={false} className="self-start">
                  <Link href={`${PASSWORD_PAGES.forgot}?as=${audience}`}>Forgot password?</Link>
                </TextLink>
                <p className="type-body-sm text-secondary">First time with a password? Set one with Forgot password.</p>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy === "password"}>
                Sign in
              </Button>
            </form>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                switchMode("code");
              }}
            >
              Email me a code instead
            </Button>
          </>
        ) : (
          <>
            <form className="flex flex-col gap-5" onSubmit={(event) => void onEmail(event)} noValidate>
              {emailField}
              <Button type="submit" size="lg" className="w-full" disabled={busy === "send"}>
                Send code
              </Button>
            </form>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                switchMode("password");
              }}
            >
              Sign in with a password instead
            </Button>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TextLink asChild showIcon={false}>
            <Link href={AUTH_LINKS.forgotAccess}>Trouble signing in?</Link>
          </TextLink>
          <p className="flex items-center gap-1 type-body-sm text-body">
            New to H2 Economy?{" "}
            <TextLink asChild showIcon={false}>
              <Link href={ACCOUNT_PAGES[audience].join}>{words.join}</Link>
            </TextLink>
          </p>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-default pt-4 type-body-sm text-body">
          <span>Not a {audience}?</span>
          {others.map((k, i) => (
            <span key={k} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <TextLink asChild showIcon={false}>
                <Link href={withNext(ACCOUNT_PAGES[k].signIn)}>{AUDIENCE[k].title}</Link>
              </TextLink>
            </span>
          ))}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Sign in to H2 Economy</h1>
      <p className="type-body text-body">You&apos;ll come back to the page you were on.</p>
      {alert}
      <form className="flex flex-col gap-5" onSubmit={(event) => void onEmail(event)} noValidate>
        <FormField label="Work email" error={emailError}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(undefined);
            }}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={busy === "send"}>
          Send code
        </Button>
      </form>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextLink asChild showIcon={false}>
          <Link href={AUTH_LINKS.forgotAccess}>Trouble signing in?</Link>
        </TextLink>
        <p className="flex items-center gap-1 type-body-sm text-body">
          New to H2 Economy?{" "}
          <TextLink asChild showIcon={false}>
            <Link href={AUTH_LINKS.join}>Join free</Link>
          </TextLink>
        </p>
      </div>
      <p className="border-t border-default pt-4 type-body-sm text-body">
        H2 Economy staff?{" "}
        <TextLink asChild showIcon={false}>
          <Link href={`${AUTH_LINKS.staffSignIn}?next=${encodeURIComponent(next)}`}>Sign in with your password</Link>
        </TextLink>
      </p>
    </AuthCard>
  );
}
