import { createNeonAuth } from "@neondatabase/auth/next/server";

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("Staff authentication is not configured.");
  // The SDK requires a positive cache lifetime. Staff approval and permissions
  // are still rechecked in the database on every protected request.
  return createNeonAuth({ baseUrl, cookies: { secret, sessionDataTtl: 1 } });
}
