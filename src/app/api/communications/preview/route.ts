import {operations} from "@/lib/operations/settings";
import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {sampleBookingEmail,escapeEmail,previewHtml,readPresentation,type EmailKind} from "@/lib/communications/templates";
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
    const brand=await prisma.tenant.findUniqueOrThrow({where:{id:tenantId},select:{operationalSettings:true,name:true,logoUrl:true,primaryColor:true,accentColor:true,phone:true,email:true,address1:true,address2:true,city:true,state:true,zip:true,timezone:true}});
    html=previewHtml(sampleBookingEmail(brand,kind as EmailKind,operations(brand.operationalSettings).communications?.templates?.[kind as EmailKind]).presentation);
  }
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
}
export const GET = withStaff("settings.write",get);
