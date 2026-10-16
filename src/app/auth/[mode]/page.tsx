import { notFound } from "next/navigation";
import AuthPanel, { type AuthMode } from "../components/AuthPanel";

const modes = ["sign-in", "sign-up", "verify", "access", "setup", "recover", "unavailable"];
export default async function AuthPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!modes.includes(mode)) notFound();
  return <AuthPanel mode={mode as AuthMode} />;
}
