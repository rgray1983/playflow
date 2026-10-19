import {paidCents,type CounterReceipt} from "./receipt";

export function addCheckoutSale(current:CounterReceipt[],sale:CounterReceipt){
  return sale.status!=="OPEN"||sale.totalCents<=paidCents(sale)||current.some(s=>s.id===sale.id)?current:[...current,sale];
}
export function checkoutSummary(sales:CounterReceipt[],reference?:string):CounterReceipt|null{
  if(!sales.length)return null;
  if(sales.length===1&&!reference)return sales[0];
  const first=sales[0],sum=(read:(sale:CounterReceipt)=>number)=>sales.reduce((total,sale)=>total+read(sale),0);
  return {...first,billReferences:sales.map(s=>s.id),id:reference??`${sales.length} selected bills`,kind:"BASKET",status:sales.every(s=>s.status==="PAID")?"PAID":"OPEN",totalCents:sum(s=>s.totalCents),payments:sales.flatMap(s=>s.payments),quoteSnapshot:{...first.quoteSnapshot,profile:"mixed",taxRate:0,lines:sales.flatMap(s=>s.quoteSnapshot.lines.map(l=>({...l,id:`${s.id}:${l.id}`}))),fees:sales.flatMap(s=>s.quoteSnapshot.fees),subtotalCents:sum(s=>s.quoteSnapshot.subtotalCents),taxCents:sum(s=>s.quoteSnapshot.taxCents),feeCents:sum(s=>s.quoteSnapshot.feeCents),totalCents:sum(s=>s.totalCents),includedTaxCents:sum(s=>s.quoteSnapshot.includedTaxCents)}};
}
