import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

function applyValidEnv() {
  process.env.NODE_ENV = "production";
  process.env.VITE_APP_ID = "app-id";
  process.env.JWT_SECRET = "secret";
  process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/app";
  process.env.OAUTH_SERVER_URL = "https://oauth.example.com";
  process.env.OAUTH_PORTAL_URL = "https://portal.example.com";
  process.env.BUILT_IN_FORGE_API_URL = "https://api.example.com";
  process.env.BUILT_IN_FORGE_API_KEY = "forge-key";
  process.env.PUBLIC_BASE_URL = "https://app.example.com";
}

describe("validateRequiredEnv", () => {
  it("throws when required variables are missing", async () => {
    applyValidEnv();
    delete process.env.JWT_SECRET;

    const { validateRequiredEnv } = await import("./_core/env");

    expect(() => validateRequiredEnv()).toThrow(/JWT_SECRET/);
  });

  it("throws when PUBLIC_BASE_URL is invalid for production", async () => {
    applyValidEnv();
    process.env.PUBLIC_BASE_URL = "http://localhost:3000";

    const { validateRequiredEnv } = await import("./_core/env");

    expect(() => validateRequiredEnv()).toThrow(/PUBLIC_BASE_URL/);
  });

  it("passes when the environment is fully configured", async () => {
    applyValidEnv();

    const { validateRequiredEnv } = await import("./_core/env");

    expect(() => validateRequiredEnv()).not.toThrow();
  });
});
