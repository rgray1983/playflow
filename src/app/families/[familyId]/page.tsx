"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import FamilyDetails from "@/components/families/FamilyDetails";
export default function FamilyPage(){const {familyId}=useParams<{familyId:string}>();return <section className="public-scroll min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-7"><div className="mx-auto max-w-5xl space-y-5"><Link href="/families" className="inline-block text-sm underline">← Families</Link><FamilyDetails key={familyId} familyId={familyId}/></div></section>;}
