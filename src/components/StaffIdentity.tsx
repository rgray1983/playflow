"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {usePathname} from "next/navigation";
type Identity={staff:{name:string;accessRole:string;permissions:string[]};business:{name:string;slug:string;timezone:string}};
const IdentityContext=createContext<Identity|null>(null);
export function StaffIdentityProvider({children}:{children:ReactNode}){
 const pathname=usePathname(),enabled=pathname==="/"||/^\/(bookings|calendar|check-in|company-settings|parties|pos|reports)(\/|$)/.test(pathname);
 const [data,setData]=useState<Identity|null>(null);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();const refresh=()=>{fetch("/api/staff/me",{cache:"no-store",signal:controller.signal}).then(async r=>r.ok?r.json():null).then(d=>{if(!controller.signal.aborted)setData(d);}).catch(()=>{});};refresh();window.addEventListener("playflow:business-updated",refresh);return()=>{controller.abort();window.removeEventListener("playflow:business-updated",refresh);};},[enabled]);
 return <IdentityContext.Provider value={enabled?data:null}>{children}</IdentityContext.Provider>;
}
export function useStaffIdentity(){return useContext(IdentityContext);}
export function BusinessName(){const identity=useStaffIdentity();return <>{identity?.business.name??"Your business"}</>;}
