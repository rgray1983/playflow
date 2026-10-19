"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StaffName from "@/components/StaffName";
import SignOutButton from "@/components/SignOutButton";
import CounterPanel from "@/components/counter/CounterPanel";
import type { DeskFamily, DeskSearchResult } from "@/components/check-in/types";
export default function POSPage() {
    const [query, setQuery] = useState(""), [results, setResults] = useState<DeskSearchResult[]>([]), [family, setFamily] = useState<DeskFamily | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [searching, setSearching] = useState(false), [refreshKey, setRefreshKey] = useState(0);
    const selected = useRef("");
    useEffect(() => { if (query.trim().length < 2)
        return; const controller = new AbortController(); const timer = window.setTimeout(() => { fetch(`/api/check-in?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const result = await response.json(); if (!response.ok)
        throw new Error(result.error || "Unable to search families."); return result.families; }).then(result => { setResults(result); setSearching(false); }).catch(error => { if (!controller.signal.aborted) {
        setError(error.message);
        setSearching(false);
    } }); }, 300); return () => { controller.abort(); window.clearTimeout(timer); }; }, [query]);
    async function load(id: string) { const response = await fetch(`/api/check-in?familyId=${encodeURIComponent(id)}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok)
        throw new Error(result.error || "Unable to load family."); if (selected.current === id)
        setFamily(result.family); }
    async function choose(id: string) { selected.current = id; setBusy(true); setError(""); setFamily(null); try {
        await load(id);
    }
    catch (error) {
        setError(error instanceof Error ? error.message : "Unable to load family.");
    }
    finally {
        if (selected.current === id)
            setBusy(false);
    } }
    return <main className="public-scroll h-dvh overflow-y-auto bg-[#F6F0E6] p-4 text-[#202633] sm:p-8"><div className="mx-auto max-w-6xl space-y-6"><header className="flex flex-wrap justify-between gap-4"><div><Link href="/" className="text-lg font-semibold">PlayFlow</Link><h1 className="mt-4 text-3xl font-semibold">Family sales & payments</h1><p className="mt-2 text-sm text-gray-600">Admission bills, collected payments, memberships and visit packs.</p></div><div className="space-y-2 text-sm"><StaffName /><SignOutButton /></div></header><nav className="flex flex-wrap gap-5 text-sm underline"><Link href="/">Dashboard</Link><Link href="/check-in">Playtime check-in</Link><Link href="/parties">Party & events</Link><Link href="/company-settings">Company Settings</Link></nav><p className="rounded-xl bg-white p-4 text-sm">New admissions start at <Link href="/check-in" className="font-semibold underline">Playtime check-in</Link>. Find the family here to review bills, record money already collected, print receipts, or enroll a membership. Retail and gift-card checkout will be added separately.</p>{error && <p role="alert" className="rounded-lg bg-white p-4 text-red-700">{error}</p>}<div className="grid items-start gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]"><section className="space-y-4 rounded-xl bg-white p-5"><h2 className="text-xl font-semibold">Find a family</h2><label className="block text-sm">Parent / child name, email, or last four phone digits<input maxLength={254} value={query} onChange={e => { setQuery(e.target.value); setResults([]); setSearching(e.target.value.trim().length >= 2); }} className="mt-2 block w-full rounded-lg border p-3"/></label>{searching && <p>Searching…</p>}{!searching && query.trim().length >= 2 && !results.length && <p className="text-sm">No active families found.</p>}{results.map(result => <button key={result.id} disabled={busy} onClick={() => choose(result.id)} className="block w-full rounded-lg border p-4 text-left disabled:opacity-40"><strong>{result.name}</strong>{result.parents.map((p, i) => <span key={i} className="mt-1 block text-sm">{p.firstName} {p.lastName}{p.phone ? ` · ${p.phone}` : ""}</span>)}</button>)}{results.length === 20 && <p className="text-xs">First 20 matches. Narrow your search if needed.</p>}</section><section className="min-w-0 space-y-4 rounded-xl bg-white p-5">{busy ? <p>Loading family…</p> : family ? <><h2 className="text-xl font-semibold">{family.name}</h2><CounterPanel key={family.id} family={family} refreshKey={refreshKey} initiallyOpen onChanged={async () => { await load(family.id); setRefreshKey(n => n + 1); }}/></> : <p>Select a saved family to begin.</p>}</section></div></div></main>;
}
