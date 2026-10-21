import {NextResponse} from "next/server";
import {getStaffTenant,withStaff} from "@/lib/auth/staff";
import {dailyReport} from "@/lib/reports/daily";
import {localDay} from "@/lib/calendar/dates";
async function get(request:Request){const t=await getStaffTenant();if(!t)return NextResponse.json({error:"Business not found."},{status:404});const q=new URL(request.url).searchParams,day=q.get("day")??localDay(new Date(),t.timezone);if(q.has("mode")&&!["live","sandbox"].includes(q.get("mode")!))return NextResponse.json({error:"Choose Live or Sandbox."},{status:400});try{return NextResponse.json(await dailyReport(t.id,t.timezone,day,q.get("mode")==="sandbox"?"sandbox":"live"));}catch(e){if(e instanceof Error&&e.message==="Choose a valid calendar date.")return NextResponse.json({error:e.message},{status:400});throw e;}}
export const GET = withStaff("payments.write",get);
