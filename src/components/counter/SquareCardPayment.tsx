"use client";
import {useEffect,useId,useRef,useState} from "react";
import SquareReaderPayment from "./SquareReaderPayment";
import SigningDialog from "@/components/forms/SigningDialog";
import {cardVerificationDetails,cardTokenError,type CardTokenResult} from "@/lib/payments/square/card-verification";
import {dollars} from "@/lib/counter/receipt";
import type {CheckoutPayload} from "@/lib/payments/square/checkout";
type Config={mode:"sandbox"|"live";ready:boolean;applicationId:string;locationId:string|null};
type Card={attach:(selector:string)=>Promise<void>;destroy:()=>Promise<void>;tokenize:(details:object)=>Promise<CardTokenResult>};
type SquareWindow=Window&{Square?:{payments:(appId:string,locationId:string)=>{card:()=>Promise<Card>}}};
type Result={id:string;status:string;mode:string;receiptUrl:string|null;error?:string};
export default function SquareCardPayment({payload,slug,onClose,onPaid}:{payload:CheckoutPayload;slug?:string;onClose:()=>void;onPaid:()=>void}){
 const [config,setConfig]=useState<Config|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<Result|null>(null),[attempted,setAttempted]=useState(false);
 const card=useRef<Card|null>(null),inFlight=useRef(false),request=useRef<{requestId:string;sourceToken:string}|null>(null),containerId=`square-card-${useId().replace(/[^a-zA-Z0-9-]/g,"")}`;
 const endpoint=slug?`/api/parent/${encodeURIComponent(slug)}/payments`:"/api/payments/square/checkout",configEndpoint=slug?`${endpoint}?config=1`:"/api/payments/square/connection";
 useEffect(()=>{const controller=new AbortController();fetch(configEndpoint,{cache:"no-store",signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load Square.");return d;}).then(setConfig).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[configEndpoint]);
 useEffect(()=>{
  if(!config?.ready||!config.locationId)return;
  let active=true,instance:Card|null=null;
  async function initialize(){
   const src=config!.mode==="sandbox"?"https://sandbox.web.squarecdn.com/v1/square.js":"https://web.squarecdn.com/v1/square.js";
   const old=document.querySelector<HTMLScriptElement>('script[data-playflow-square]');
   if(old&&old.src!==src)throw new Error("Payment environment changed. Refresh this page before entering card details.");
   if(!(window as SquareWindow).Square)await new Promise<void>((resolve,reject)=>{const script=old??document.createElement("script");script.addEventListener("load",()=>resolve(),{once:true});script.addEventListener("error",()=>reject(new Error("Square payment fields could not load. Refresh and try again.")),{once:true});if(!old){script.src=src;script.dataset.playflowSquare="true";document.head.appendChild(script);}});
   if(!active)return;const square=(window as SquareWindow).Square;if(!square)throw new Error("Square payment fields are unavailable.");instance=await square.payments(config!.applicationId,config!.locationId!).card();if(!active){await instance.destroy();return;}await instance.attach(`#${containerId}`);if(active){card.current=instance;setReady(true);}
  }
  initialize().catch(e=>{if(active)setError(e.message);});return()=>{active=false;card.current=null;instance?.destroy().catch(()=>{});};
 },[config,containerId]);
 async function pay(){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError("");try{
  let body:object;
  if(result?.id)body={action:"status",id:result.id};else{
   if(!request.current){const token=await card.current?.tokenize(cardVerificationDetails(payload.amountCents,!slug));if(token?.status!=="OK"||!token.token)throw new Error(cardTokenError(token));request.current={requestId:crypto.randomUUID(),sourceToken:token.token};setAttempted(true);}
   body={...payload,...request.current,mode:config?.mode,locationId:config?.locationId};
  }
  const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||"Payment status is uncertain. Retry to check the same payment.");setResult(d);if(d.status==="PAID")onPaid();if(d.status==="FAILED")request.current=null;
 }catch(e){setError(e instanceof Error?e.message:"Unable to complete payment. Retry to check this payment.");}finally{setBusy(false);inFlight.current=false;}}
 return <SigningDialog title="Secure Square payment" busy={busy} onClose={onClose}><div className="space-y-5"><p className="text-3xl font-semibold">{dollars(payload.amountCents)}</p>{config&&<p className={`rounded-lg p-3 text-sm font-semibold ${config.mode==="sandbox"?"bg-amber-100 text-amber-900":"bg-green-100"}`}>{config.mode==="sandbox"?"SANDBOX — simulated payment, no real money":"LIVE — this charges the card entered below"}</p>}{!slug&&config?.ready&&config.mode==="live"&&!attempted&&<SquareReaderPayment payload={payload} disabled={busy}/>} {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{!config?<p>Loading payment settings…</p>:!config.ready?<p>Square checkout is not connected. Contact the venue to arrange payment.</p>:<><div id={containerId} className={attempted&&result?.status!=="FAILED"?"hidden":""}/><p className="text-xs text-gray-600">Card details are entered in Square’s secure fields.</p>{result?.status==="PAID"?<section className="space-y-3" role="status"><p className="font-semibold text-green-800">{result.mode==="sandbox"?"Test payment completed":"Payment completed"}</p><p className="break-all text-xs">Reference: {result.id}</p>{result.receiptUrl&&<a className="font-semibold underline" href={result.receiptUrl} target="_blank" rel="noopener noreferrer">View Square receipt</a>}</section>:result?.status==="REVIEW"?<p role="alert" className="font-semibold text-amber-900">{result.error}</p>:<><button disabled={busy||!ready} onClick={()=>{if(result?.status==="FAILED"){setResult(null);setAttempted(false);setError("");return;}pay();}} className="w-full rounded-xl bg-[#20B8A8] p-4 font-semibold text-white disabled:opacity-40">{busy?"Checking payment…":result?.status==="FAILED"?"Start a new payment":result?.status==="PENDING"||attempted?"Check / retry this payment":`Pay ${dollars(payload.amountCents)}`}</button>{result?.status==="PENDING"&&<p className="text-sm">Payment is processing. Check this payment before collecting again.</p>}</>}</>}</div></SigningDialog>;
}
