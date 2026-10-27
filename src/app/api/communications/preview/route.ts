import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {buildBookingEmail,escapeEmail,previewHtml,readPresentation,type EmailKind} from "@/lib/communications/templates";
async function get(request:Request) {
  const tenantId=getStaffContext().tenantId,query=new URL(request.url).searchParams;
  let html:string;
  if(query.has("id")) {
    const message=await prisma.bookingMessage.findFirst({where:{id:query.get("id")!,tenantId},select:{presentation:true,body:true}});
    if(!message)return NextResponse.json({error:"Message not found."},{status:404});
    const presentation=readPresentation(message.presentation);
    html=presentation?previewHtml(presentation):`<!doctype html><html lang="en"><body><pre style="white-space:pre-wrap;font:16px/1.6 Arial,sans-serif;padding:24px;">${escapeEmail(message.body)}</pre></body></html>`;
  } else {
    const kind=query.get("kind")??"CONFIRMATION";
    if(!["HOLD","CONFIRMATION","REMINDER"].includes(kind))return NextResponse.json({error:"Choose an email design."},{status:400});
    const brand=await prisma.tenant.findUniqueOrThrow({where:{id:tenantId},select:{name:true,logoUrl:true,primaryColor:true,accentColor:true,phone:true,email:true,address1:true,address2:true,city:true,state:true,zip:true,timezone:true}});
    html=previewHtml(buildBookingEmail({kind:kind as EmailKind,brand,title:"Avery’s Birthday Party · SAMPLE",date:"November 14, 2026",time:"2:00 PM – 4:00 PM",timezone:new Intl.DateTimeFormat("en-US",{timeZone:brand.timezone,timeZoneName:"short"}).formatToParts(new Date("2026-11-14T19:00:00Z")).find(part=>part.type==="timeZoneName")?.value??brand.timezone,setupTime:"1:30 PM",packageName:"Birthday celebration",deposit:kind==="HOLD"?"Deposit due · $100.00":"Deposit paid · $100.00",balance:"$150.00",holdDeadline:"November 1, 2026 at 5:00 PM",portalUrl:"https://example.invalid/parent-portal",hostUrl:"https://example.invalid/private-host-page",guestUrl:"https://example.invalid/guest-invitation"}).presentation);
  }
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
}
export const GET = withStaff("settings.write",get);
