import {sleep} from "workflow";
import {start} from "workflow/api";
import {claimEmailBatch,rememberEmailRun,failEmailAutomation,runEmailAttempt,completeAutomationCheck,type EmailClaim} from "./automation-steps";
export async function deliverBookingEmail(claim:EmailClaim){
  "use workflow";
  try {
    for(let attempt=0;attempt<32;attempt++){
      const next=await runEmailAttempt(claim);
      if(next===null)return;
      await sleep(Math.max(1000,next-Date.now()));
    }
    await failEmailAutomation(claim,"WORKER_REVIEW");
  }catch{await failEmailAutomation(claim,"WORKER_FAILED");}
}
export async function dispatchBookingEmails(tenantId:string){
  "use workflow";
  // Bound each run's event history, then continue in a fresh durable dispatcher if needed.
  for(let batch=0;batch<20;batch++){
    const claims=await claimEmailBatch(tenantId);
    if(!claims.length)return;
    for(const claim of claims){
      try{const run=await start(deliverBookingEmail,[claim]);await rememberEmailRun(claim,run.runId);}
      catch{await failEmailAutomation(claim,"START_FAILED");}
    }
  }
  await start(dispatchBookingEmails,[tenantId]);
}
export async function checkEmailTimer(tenantId:string,startedAt:string){
  "use workflow";
  try{await sleep("60s");await completeAutomationCheck(tenantId,startedAt);}
  catch{await completeAutomationCheck(tenantId,startedAt,true);}
}
