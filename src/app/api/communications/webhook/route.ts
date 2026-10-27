import {Webhook} from "svix";
import {NextResponse} from "next/server";
import {parseDeliveryEvent,recordDeliveryEvent} from "@/lib/communications/delivery-events";
export const runtime="nodejs";
function json(body:object,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});}
export async function POST(request:Request) {
  const secret=process.env.RESEND_WEBHOOK_SECRET;
  if(!secret)return json({error:"Delivery tracking is not configured."},503);
  const id=request.headers.get("svix-id")??"";
  if(!/^[-a-zA-Z0-9_]{1,256}$/.test(id))return json({error:"Invalid webhook signature."},403);
  // Bound raw body reads before signature verification. Never parse/re-serialize signed JSON.
  let body="";
  try {
    if(Number(request.headers.get("content-length"))>65536)return json({error:"Event too large."},413);
    const reader=request.body?.getReader();if(!reader)return json({error:"Invalid event."},400);
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return json({error:"Event too large."},413);}chunks.push(value);}
    body=Buffer.concat(chunks).toString("utf8");
  }catch{return json({error:"Invalid event."},400);}
  let verified;
  try {verified=new Webhook(secret).verify(body,{"svix-id":id,"svix-timestamp":request.headers.get("svix-timestamp")??"","svix-signature":request.headers.get("svix-signature")??""});}
  catch{return json({error:"Invalid webhook signature."},403);}
  let event;
  try{event=parseDeliveryEvent(verified);}catch{return json({error:"Invalid event."},400);}
  if(!event)return json({received:true});
  try {await recordDeliveryEvent(id,event);return json({received:true});}
  catch {console.error("Email delivery event could not be saved.");return json({error:"Delivery event could not be saved. Retry."},503);}
}
