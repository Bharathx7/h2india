import { describe, expect, it } from "vitest";
import { EnvError, parseServerEnv } from "./env";
import { FLAG_DEFAULTS, FlagOffError, isEnabled, readFlags, requireFlag } from "./flags";

const valid = {
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "x".repeat(32),
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://:p@localhost:6379",
  MEILI_HOST: "http://localhost:7700",
  MEILI_MASTER_KEY: "k".repeat(16),
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "ap-south-1",
  S3_ACCESS_KEY: "h2india",
  S3_SECRET_KEY: "s".repeat(8),
  S3_BUCKET_PRIVATE: "h2india-private",
  S3_BUCKET_PUBLIC: "h2india-public",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  EMAIL_FROM: "H2 Economy <no-reply@h2india.local>",
};

describe("server settings", () => {
  it("accepts a complete set and converts types", () => {
    const env = parseServerEnv(valid);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.NODE_ENV).toBe("development");
    expect(env.AUTH_IP_HEADER).toBe("x-forwarded-for");
  });

  it("treats an empty optional setting as not set", () => {
    const env = parseServerEnv({ ...valid, GOOGLE_CLIENT_ID: "", SMTP_USER: "" });
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.SMTP_USER).toBeUndefined();
  });

  it("names every missing or malformed setting, without printing values", () => {
    const attempt = () => parseServerEnv({ ...valid, DATABASE_URL: undefined, AUTH_SECRET: "short-secret-value" });
    expect(attempt).toThrow(EnvError);
    try {
      attempt();
    } catch (e) {
      const message = (e as EnvError).message;
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("AUTH_SECRET");
      expect(message).not.toContain("short-secret-value");
    }
  });
});

describe("feature flags", () => {
  it("defaults to the safe values: transactions off", () => {
    expect(readFlags({})).toEqual(FLAG_DEFAULTS);
    expect(isEnabled("transactions", {})).toBe(false);
  });

  it("reads true and false from the environment", () => {
    expect(isEnabled("comingSoon", { FLAG_COMING_SOON: "true" })).toBe(true);
    expect(isEnabled("comingSoon", { FLAG_COMING_SOON: "false" })).toBe(false);
  });

  it("refuses anything other than true or false", () => {
    expect(() => readFlags({ FLAG_TRANSACTIONS: "yes" })).toThrow(/FLAG_TRANSACTIONS/);
  });

  it("guards server code: requireFlag throws a 404 error when off", () => {
    expect(() => {
      requireFlag("transactions", {});
    }).toThrow(FlagOffError);
    expect(() => {
      requireFlag("transactions", { FLAG_TRANSACTIONS: "true" });
    }).not.toThrow();
  });
});

describe("operator password flag (step 12.1, A183)", () => {
  it("is on in a production build unless switched off, and off in development", () => {
    expect(readFlags({ NODE_ENV: "production" }).operatorPassword).toBe(true);
    expect(readFlags({ NODE_ENV: "production", FLAG_OPERATOR_PASSWORD: "false" }).operatorPassword).toBe(false);
    expect(readFlags({ NODE_ENV: "development" }).operatorPassword).toBe(false);
    expect(readFlags({ FLAG_OPERATOR_PASSWORD: "true" }).operatorPassword).toBe(true);
  });
});
