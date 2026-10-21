// Square requires billingContact even when no additional contact data was collected.
// Postal code remains in Square's hosted card fields; never invent buyer details.
export function cardVerificationDetails(amountCents:number,sellerKeyedIn:boolean){
 return {amount:(amountCents/100).toFixed(2),currencyCode:"USD",intent:"CHARGE",billingContact:{},customerInitiated:!sellerKeyedIn,sellerKeyedIn};
}
export type CardTokenResult={status:string;token?:string;errors?:{type?:string;field?:string}[]};
export function cardTokenError(result?:CardTokenResult){
 if(result?.status==="Cancel")return "Card verification was cancelled. No payment was submitted.";
 // Report only SDK error identifiers, never card values, source tokens or raw responses.
 const details=result?.errors?.slice(0,3).map(error=>{
  const type=error.type&&/^[a-zA-Z][a-zA-Z_]{0,79}$/.test(error.type)?error.type:"";
  const field=error.field&&/^[a-zA-Z][a-zA-Z ._]{0,79}$/.test(error.field)?error.field:"";
  return [type,field].filter(Boolean).join(" · ");
 }).filter(Boolean).join("; ");
 return `Square could not validate the card${details?` (${details})`:""}. No payment was submitted. Review the fields and try again.`;
}
