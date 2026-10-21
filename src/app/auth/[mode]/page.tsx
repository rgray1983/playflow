import { notFound } from "next/navigation";
import AuthPanel, { type AuthMode } from "../components/AuthPanel";

const modes = ["sign-in", "sign-up", "verify", "access", "setup", "recover", "unavailable"];
export default async function AuthPage({ params, searchParams }: { params: Promise<{ mode: string }>; searchParams: Promise<{next?: string}> }) {
  const { mode } = await params;
  if (!modes.includes(mode)) notFound();
  const query = await searchParams;
  const nextPath = typeof query.next === "string" && (/^(\/parent\/[a-z0-9-]+)$/.test(query.next)||query.next==="/start") ? query.next : "/";
  return <AuthPanel key={mode} mode={mode as AuthMode} nextPath={nextPath} />;
}
