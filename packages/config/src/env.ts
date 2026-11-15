import { z } from "zod";

// Playbook step 1.6: one typed place for settings. Secrets are read on the server only.
// Add a variable here, in .env.example and in docs/secrets.md in the same pull request.

const url = z.url();
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);
/** A setting that may be left empty in .env files ("NAME=" counts as not set). */
const optionalText = () => z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional());
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: url,
  /** Where the worker reaches the web app for scheduled work (step 1.7), e.g. http://web-public:3000 inside Docker.
   * Falls back to APP_URL. Links in messages always use APP_URL. */
  INTERNAL_WEB_URL: optionalUrl,
  AUTH_SECRET: secret(32),
  // Google sign-in (step 3.2). Without both values the Google button reports that it is not set up yet.
  GOOGLE_CLIENT_ID: optionalText(),
  GOOGLE_CLIENT_SECRET: optionalText(),
  // The header holding the visitor's IP. Behind the production proxy, set it to the header the proxy writes
  // (ADR 0003 and 0006); only the proxy may reach the app, or the header could be faked.
  AUTH_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
  DATABASE_URL: z.string().startsWith("postgres", "must be a postgres:// or postgresql:// URL"),
  REDIS_URL: z.string().startsWith("redis", "must be a redis:// URL"),
  MEILI_HOST: url,
  MEILI_MASTER_KEY: secret(16),
  S3_ENDPOINT: url,
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: secret(8),
  S3_BUCKET_PRIVATE: z.string().min(3),
  S3_BUCKET_PUBLIC: z.string().min(3),
  /** Where browser uploads land until the worker has checked them (step 3.7). */
  S3_BUCKET_QUARANTINE: z.string().min(3).default("h2india-quarantine"),
  /** Base URL that serves the public bucket (a CDN in production). Defaults to the bucket on S3_ENDPOINT. */
  S3_PUBLIC_URL: optionalUrl,
  /** ClamAV daemon (clamd) for the virus scan. */
  /** SMS and WhatsApp providers (M5). "fake" delivers to Mailpit and treats templates as approved. */
  SMS_PROVIDER: z.enum(["fake"]).default("fake"),
  WHATSAPP_PROVIDER: z.enum(["fake"]).default("fake"),
  /** Payment partner (M3, step 10.4). "sim" is the simulated partner (A176): test pay page, signed webhooks, no money. */
  PAYMENT_PARTNER: z.enum(["sim"]).default("sim"),
  /** The simulated partner refuses to run in a production build unless this is "true" (staging only, never live). */
  PAYMENT_SIM_ALLOWED: z.enum(["true", "false"]).default("false"),
  CLAMAV_HOST: z.string().min(1).default("localhost"),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: optionalText(),
  SMTP_PASSWORD: optionalText(),
  EMAIL_FROM: z.string().min(3),
  // Sender for sign-in and security emails (Figma 671:428 uses security@). Falls back to EMAIL_FROM.
  EMAIL_FROM_SECURITY: optionalText(),
  // Where support requests are sent until the admin queue exists (decision A16).
  SUPPORT_EMAIL: z.email().default("support@h2india.local"),
  // Bot challenge for public forms (step 5.9). The provider is not chosen yet; without both values the honeypot,
  // timing and rate limits still apply and no challenge is asked.
  BOT_CHALLENGE_SECRET: optionalText(),
  BOT_CHALLENGE_VERIFY_URL: optionalUrl,
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: url,
  /** The analytics script, once the tool is chosen (M10). Loaded only after consent, never for operators. */
  NEXT_PUBLIC_ANALYTICS_SRC: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export class EnvError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `Invalid or missing settings:\n${problems.map((p) => `  - ${p}`).join("\n")}\nSee .env.example and docs/secrets.md.`,
    );
    this.name = "EnvError";
  }
}

function parse<T extends z.ZodType>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  // Names and reasons only; values are never printed because they may be secrets.
  const problems = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  throw new EnvError(problems);
}

export function parseServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return parse(serverEnvSchema, source);
}

export function parseClientEnv(source: Record<string, string | undefined> = process.env): ClientEnv {
  return parse(clientEnvSchema, source);
}
