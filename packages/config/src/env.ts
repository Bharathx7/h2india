import { z } from "zod";

// Playbook step 1.6: one typed place for settings. Secrets are read on the server only.
// Add a variable here, in .env.example and in docs/secrets.md in the same pull request.

const url = z.url();
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: url,
  AUTH_SECRET: secret(32),
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
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  EMAIL_FROM: z.string().min(3),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: url,
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
