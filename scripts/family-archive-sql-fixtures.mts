// Generate read-only SQL fixtures using the real Postgres row types and the same
// archive query as the app. CTEs shadow the live tables; no data is written.
// Run: node --import tsx scripts/family-archive-sql-fixtures.mts
import {archiveBlockerQuery} from '../src/lib/families/lifecycle';
const tenantId='archive-test-business',familyId='archive-test-family';
const own={tenantId,familyId},now=new Date('2030-01-01T00:00:00Z');
const tables=['Parent','Child','Visit','Party','PartyGuest','Membership','CounterSale','CounterPayment','MembershipPayment','EventPayment','ProviderCheckout','PaymentRefund'];
const quote=(value:unknown)=>"'"+String(value).replace(/'/g,"''")+"'";
const sql=archiveBlockerQuery(tenantId,familyId,now);
const query=sql.text.replace(/\$(\d+)/g,(_,n:string)=>{const value=sql.values[Number(n)-1];return typeof value==='number'?String(value):quote(value instanceof Date?value.toISOString():value);});
const positive:Record<string,unknown[]>={
 Parent:[{...own,id:'parent'}],Child:[{...own,id:'child'}],
 Visit:[{...own,id:'visit',childId:'child',status:'CHECKED_IN',admissionSnapshot:{mode:'ADMISSION',listedPrice:5}}],
 Party:[{...own,id:'host',status:'CONFIRMED',endTime:'2030-01-02',balanceDue:10,depositAmount:5,depositStatus:'PENDING'},{id:'guest-party',tenantId,familyId:'another-family',status:'CONFIRMED',endTime:'2030-01-02',balanceDue:0}],
 PartyGuest:[{tenantId,id:'guest',partyId:'guest-party',childId:'child',status:'CHECKED_IN',rsvpStatus:'ATTENDING'}],
 Membership:[{...own,id:'membership',status:'ACTIVE',autoRenew:false}],
 CounterSale:[{...own,id:'sale',status:'OPEN',totalCents:1000}],CounterPayment:[{tenantId,id:'payment',saleId:'sale',amountCents:100}],
 MembershipPayment:[{...own,id:'member-payment',status:'PENDING',amount:2}],EventPayment:[{tenantId,id:'event-payment',partyId:'host',status:'PENDING',amount:3}],
 ProviderCheckout:[{tenantId,id:'pending',status:'PENDING',targetKeys:[],payload:{kind:'counter',familyId}},{tenantId,id:'review',status:'REVIEW',targetKeys:['party:host'],payload:{}},{tenantId,id:'paid',status:'PAID',targetKeys:['sale:sale'],payload:{}},{tenantId:'other-business',id:'foreign',status:'PENDING',targetKeys:['sale:sale'],payload:{kind:'counter',familyId}}],
 PaymentRefund:[{tenantId,id:'refund',checkoutId:'paid',status:'PENDING'}],
};
const negative:Record<string,unknown[]>={
 Child:[{...own,id:'child'}],Visit:[{...own,id:'past',status:'CHECKED_OUT',checkedOutAt:'2029-12-31',admissionSnapshot:{mode:'MEMBERSHIP'}},{...own,id:'cancelled',status:'CANCELLED',admissionSnapshot:{mode:'ADMISSION',listedPrice:10}}],
 Party:[{...own,id:'expired-hold',status:'PENDING',confirmationExpiresAt:'2029-12-30',endTime:'2030-01-02',balanceDue:100,depositAmount:50,depositStatus:'PENDING'},{...own,id:'cancelled-party',status:'CANCELLED',endTime:'2030-01-02',balanceDue:100}],
 PartyGuest:[{tenantId,id:'declined',partyId:'cancelled-party',childId:'child',status:'EXPECTED',rsvpStatus:'DECLINED'}],
 Membership:[{...own,id:'ended',status:'ACTIVE',endsAt:'2029-12-31',autoRenew:false},{...own,id:'cancelled',status:'CANCELLED',autoRenew:false}],
 CounterSale:[{...own,id:'paid-sale',status:'PAID',totalCents:100},{...own,id:'void',status:'VOID',totalCents:50}],CounterPayment:[{tenantId,id:'payment',saleId:'paid-sale',amountCents:100}],
 ProviderCheckout:[{tenantId,id:'failed',status:'FAILED',targetKeys:[],payload:{kind:'counter',familyId}},{tenantId:'foreign',id:'foreign',status:'REVIEW',targetKeys:[],payload:{kind:'counter',familyId}},{tenantId,id:'other-family',status:'PENDING',targetKeys:[],payload:{kind:'counter',familyId:'another-family'}}],
 PaymentRefund:[{tenantId,id:'refund',checkoutId:'failed',status:'COMPLETED'}],
};
const fixtures=[{name:'all-blockers',data:positive,expected:{visits:1,guestVisits:1,hostedParties:1,guestParties:1,memberships:1,bills:1,unbilled:1,partyBalances:1,legacyPayments:2,checkouts:2,refunds:1}},{name:'resolved-and-foreign',data:negative,expected:{visits:0,guestVisits:0,hostedParties:0,guestParties:0,memberships:0,bills:0,unbilled:0,partyBalances:0,legacyPayments:0,checkouts:0,refunds:0}}];
fixtures.push({name:'legacy-and-review',data:{Child:[{...own,id:'child'}],Visit:[{...own,id:'legacy-visit',status:'CHECKED_OUT',checkedOutAt:'2029-12-31',admissionSnapshot:{mode:'ADMISSION',listedPrice:'unknown'}}],Party:[{...own,id:'past-party',status:'COMPLETED',endTime:'2029-12-31',balanceDue:0,depositStatus:'PENDING',depositAmount:10}],Membership:[{...own,id:'paused',status:'PAUSED',endsAt:'2029-12-31',autoRenew:false}],CounterSale:[{...own,id:'legacy-sale',status:'PAID',totalCents:100}],ProviderCheckout:[{tenantId,id:'old-checkout',status:'REVIEW',targetKeys:['sale:legacy-sale'],payload:{}}],PaymentRefund:[{tenantId,id:'review-refund',checkoutId:'old-checkout',status:'REVIEW'}]},expected:{visits:0,guestVisits:0,hostedParties:0,guestParties:0,memberships:1,bills:0,unbilled:1,partyBalances:1,legacyPayments:0,checkouts:1,refunds:1}});
console.log(JSON.stringify(fixtures.map(({name,data,expected})=>({name,expected,sql:'WITH '+tables.map(table=>`"${table}" AS (SELECT * FROM json_populate_recordset(NULL::public."${table}",${quote(JSON.stringify(data[table]??[]))}::json))`).join(',\n')+'\n'+query})),null,2));
