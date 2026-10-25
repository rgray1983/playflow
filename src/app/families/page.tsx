"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useStaffIdentity} from "@/components/StaffIdentity";
import FamilySearch from "@/components/families/FamilySearch";
import IntakeForm from "@/components/check-in/IntakeForm";
export default function Families(){const [adding,setAdding]=useState(false),identity=useStaffIdentity(),router=useRouter();return <section className="public-scroll min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-7"><div className="mx-auto max-w-6xl space-y-5"><header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-semibold">Families</h1><p className="mt-2 text-sm text-gray-600">Find a family and update parent contacts, children and emergency details.</p></div>{identity?.staff.permissions.includes("families.write")&&<button onClick={()=>setAdding(true)} className="rounded-lg bg-[#1E293B] px-4 py-3 font-semibold text-white">Add family</button>}</header><section className="rounded-xl border bg-white p-5"><FamilySearch directory/></section></div>{adding&&<IntakeForm context="families" endpoint="/api/families" onClose={()=>setAdding(false)} onSaved={async id=>{router.push(`/families/${id}`);}}/>}</section>;}
