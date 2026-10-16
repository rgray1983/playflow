import assert from "node:assert/strict";
import { test } from "node:test";
import { getAuth } from "../src/lib/auth/server";

test("the real managed SDK accepts PlayFlow's runtime configuration", () => {
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.invalid/neondb/auth";
  process.env.NEON_AUTH_COOKIE_SECRET = "test-only-cookie-secret-with-at-least-32-characters";
  assert.doesNotThrow(() => getAuth());
  assert.equal(typeof getAuth().handler().GET, "function");
});

test("missing authentication credentials fail closed", () => {
  delete process.env.NEON_AUTH_COOKIE_SECRET;
  assert.throws(() => getAuth(), /not configured/);
});
