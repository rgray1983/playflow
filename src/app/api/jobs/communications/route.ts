import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {processMessages,senderReady} from "@/lib/communications/service";
export async function GET(request:Request){const expected=process.env.CRON_SECRET,actual=request.headers.get("authorization")??"";const received=Buffer.from(actual),wanted=Buffer.from(`Bearer ${expected??""}`);if(!expected||received.length!==wanted.length||!timingSafeEqual(received,wanted))return NextResponse.json({error:"Unauthorized."},{status:401});if(!senderReady())return NextResponse.json({processed:0,configured:false});return NextResponse.json({processed:await processMessages()});}
