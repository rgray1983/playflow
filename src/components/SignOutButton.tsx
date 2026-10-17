"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function SignOutButton({ returnTo }: { returnTo?: string } = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Unable to sign out. Please try again.");
      window.location.assign(returnTo && /^\/parent\/[a-z0-9-]+$/.test(returnTo) ? `/auth/sign-in?next=${encodeURIComponent(returnTo)}` : "/auth/sign-in");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to sign out."); setBusy(false); }
  }
  return <><button onClick={signOut} disabled={busy} className="flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-sm font-medium text-[#5B6270] hover:bg-white/70 disabled:opacity-50"><span>↪</span><span>{busy ? "Signing out…" : "Log Out"}</span></button>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</>;
}
