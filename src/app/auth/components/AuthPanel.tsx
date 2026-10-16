"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import SignOutButton from "@/components/SignOutButton";

export type AuthMode = "sign-in" | "sign-up" | "verify" | "access" | "setup" | "recover" | "unavailable";
const headings: Record<AuthMode, string> = {
  "sign-in": "Welcome back", "sign-up": "Create your account", verify: "Verify your email",
  access: "Staff access needed", setup: "Set up your business", recover: "Reset your password", unavailable: "Unable to connect",
};
const inputClass = "mt-2 w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#20B8A8] focus:ring-2 focus:ring-[#20B8A8]/20";

export default function AuthPanel({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function sendCode() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" });
      if (result.error) throw new Error(result.error.message || "Unable to send verification code.");
      setMessage("Check your email for a verification code.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to send code."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "sign-in") {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) throw new Error(result.error.message || "Unable to sign in.");
        window.location.assign("/");
      } else if (mode === "sign-up") {
        const result = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
        if (result.error) throw new Error(result.error.message || "Unable to create account.");
        window.location.assign("/auth/verify");
      } else if (mode === "verify") {
        const result = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: code.trim() });
        if (result.error) throw new Error(result.error.message || "The code could not be verified.");
        window.location.assign("/");
      } else if (mode === "setup") {
        const response = await fetch("/api/staff/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupCode: code }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to set up your business.");
        window.location.assign("/");
      } else if (mode === "recover") {
        if (!resetSent) {
          const result = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
          if (result.error) throw new Error(result.error.message || "Unable to request a reset.");
          setResetSent(true); setMessage("If the account exists, a reset code has been sent.");
        } else {
          const result = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: code.trim(), password });
          if (result.error) throw new Error(result.error.message || "Unable to reset password.");
          setMessage("Password updated. You can sign in now."); setResetSent(false); setPassword(""); setCode("");
        }
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  const hasForm = !["access", "unavailable"].includes(mode);
  return <main className="flex min-h-screen items-center justify-center bg-[#E7E3DA] p-5 text-[#202633]">
    <section className="w-full max-w-md rounded-[20px] border border-black/10 bg-[#F6F0E6] p-7 shadow-sm">
      <div className="mb-7 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E293B] font-semibold text-white">PF</div><div><p className="text-lg font-semibold">PlayFlow</p><p className="text-xs text-[#6B7280]">Your venue, running smoothly.</p></div></div>
      <h1 className="text-2xl font-semibold tracking-tight">{headings[mode]}</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-[#6B7280]">{mode === "access" ? "Your business owner needs to approve your email for staff access. If you are setting up the business for the first time, use your owner setup code." : mode === "setup" ? "Sign in and verify your email first, then enter the one-time owner setup code." : mode === "verify" ? "Enter your account email and request a code to confirm it belongs to you." : mode === "sign-up" ? "Creating an account does not grant access to a business. Your owner must approve staff access." : mode === "unavailable" ? "We could not reach the sign-in service. Please try again shortly." : "Sign in with the email approved by your business owner."}</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {hasForm && <form onSubmit={submit} className="space-y-4">
        {mode === "sign-up" && <label className="block text-sm font-medium">Your name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} className={inputClass} /></label>}
        {mode !== "setup" && <label className="block text-sm font-medium">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} className={inputClass} /></label>}
        {(["sign-in", "sign-up"].includes(mode) || (mode === "recover" && resetSent)) && <label className="block text-sm font-medium">{mode === "recover" ? "New password" : "Password"}<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "sign-in" ? 1 : 12} maxLength={128} className={inputClass} /><span className="mt-1 block text-xs text-[#6B7280]">{mode !== "sign-in" && "Use at least 12 characters."}</span></label>}
        {(mode === "verify" || mode === "setup" || (mode === "recover" && resetSent)) && <label className="block text-sm font-medium">{mode === "setup" ? "Owner setup code" : "Email code"}<input value={code} onChange={(e) => setCode(e.target.value)} autoComplete={mode === "setup" ? "off" : "one-time-code"} required className={inputClass} /></label>}
        {mode === "verify" && <button type="button" onClick={sendCode} disabled={busy || !email.trim()} className="w-full rounded-[10px] border border-black/15 px-4 py-3 text-sm font-semibold disabled:opacity-50">Send verification code</button>}
        <button disabled={busy} className="w-full rounded-[10px] bg-[#1E293B] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Please wait…" : mode === "sign-up" ? "Create account" : mode === "verify" ? "Verify email" : mode === "setup" ? "Set up owner access" : mode === "recover" ? resetSent ? "Update password" : "Send reset code" : "Sign in"}</button>
      </form>}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-3 text-sm font-medium text-[#155E75]">
        {mode !== "sign-in" && <Link href="/auth/sign-in">Sign in</Link>}
        {mode === "sign-in" && <><Link href="/auth/sign-up">Create account</Link><Link href="/auth/recover">Forgot password?</Link></>}
        {mode === "access" && <><Link href="/auth/setup">First-time owner setup</Link><button onClick={() => window.location.assign("/")}>Check access again</button></>}
        {mode === "unavailable" && <button onClick={() => window.location.assign("/")}>Try again</button>}
      </div>
      {["verify", "access", "setup"].includes(mode) && <div className="mt-5 border-t border-black/10 pt-3"><SignOutButton /></div>}
    </section>
  </main>;
}
