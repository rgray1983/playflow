import {after} from "next/server";
export function scheduleDelivery(tenantId:string){
 if(!process.env.RESEND_API_KEY||!process.env.PLAYFLOW_EMAIL_FROM||!process.env.PLAYFLOW_APP_URL)return;
 after(async()=>{try{const {processMessages}=await import("./service");await processMessages(tenantId);}catch{console.error("Booking message delivery needs review.");}});
}
