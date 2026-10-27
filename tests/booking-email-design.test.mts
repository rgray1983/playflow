import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildBookingEmail,previewHtml,type BookingEmailInput} from '../src/lib/communications/templates';
const input:BookingEmailInput={kind:'CONFIRMATION',brand:{name:'Test Playhouse',primaryColor:'#374151',accentColor:'#FB7185',logoUrl:'data:image/png;base64,aGVsbG8='},title:'Avery’s Birthday',date:'November 14, 2026',time:'2:00 PM – 4:00 PM',timezone:'America/New_York',setupTime:'1:30 PM',deposit:'Deposit paid · $100.00',balance:'$150.00',portalUrl:'https://app.example.invalid/parent/venue',hostUrl:'https://app.example.invalid/rsvp/secret-host/host',guestUrl:'https://app.example.invalid/rsvp/shareable-guest'};
test('confirmed HTML and plain text keep private host and shareable guest links distinct',()=>{
 const mail=buildBookingEmail(input);assert.match(mail.presentation.html,/JUST FOR THE PARTY HOST/);assert.match(mail.presentation.html,/SHARE WITH YOUR GUESTS/);assert.match(mail.text,/Private host page \(keep this link private\)/);assert.match(mail.text,/Guest invitation link \(share this with guests\)/);
 assert.match(mail.presentation.html,/href="https:\/\/app.example.invalid\/rsvp\/secret-host\/host"/);assert.match(mail.presentation.html,/Setup begins/);assert.match(mail.text,/1:30 PM/);assert.match(mail.text,/Balance at time of email: \$150.00/);
});
test('holds never release host or guest links even when supplied to the shared renderer',()=>{
 const mail=buildBookingEmail({...input,kind:'HOLD',holdDeadline:'November 1 at 5 PM'});
 for(const body of [mail.presentation.html,mail.text]){assert.ok(!body.includes('secret-host'));assert.ok(!body.includes('shareable-guest'));assert.match(body,/not confirmed/);assert.match(body,/November 1 at 5 PM/);}
});
test('reminders retain booking actions and provide readable plain text alongside HTML',()=>{
 const mail=buildBookingEmail({...input,kind:'REMINDER'});assert.match(mail.presentation.html,/It’s almost party time/);assert.match(mail.presentation.html,/Review your party/);assert.match(mail.text,/current balance and guest attendance/);assert.match(mail.text,/Parent portal: https:/);
});
test('untrusted text, CSS colors, logo schemes and action URLs cannot inject executable markup',()=>{
 const mail=buildBookingEmail({...input,title:'<script>alert(1)</script>',brand:{name:'<img src=x onerror=alert(1)>',primaryColor:'red; background:url(x)',accentColor:'" onmouseover="bad',logoUrl:'javascript:alert(1)',email:'a<b@example.invalid'},portalUrl:'javascript:alert(1)',hostUrl:'https://user:password@example.invalid/private',guestUrl:'data:text/html,bad'});
 assert.ok(!mail.presentation.html.includes('<script>'));assert.ok(!mail.presentation.html.includes('<img src=x'));assert.ok(!mail.presentation.html.includes('href="javascript:'));assert.ok(!mail.presentation.html.includes('password@'));assert.ok(!mail.presentation.html.includes('background:url(x)'));assert.match(mail.presentation.html,/&lt;script&gt;/);assert.match(mail.presentation.html,/#374151/);assert.equal(mail.presentation.attachments.length,0);
});
test('uploaded raster logos are frozen inline attachments and preview resolves the same image',()=>{
 const mail=buildBookingEmail(input);assert.match(mail.presentation.html,/src="cid:business-logo"/);assert.deepEqual(mail.presentation.attachments,[{filename:'business-logo.png',content:'aGVsbG8=',content_id:'business-logo',content_type:'image/png'}]);assert.ok(!previewHtml(mail.presentation).includes('href="'));assert.match(previewHtml(mail.presentation),/src="data:image\/png;base64,aGVsbG8="/);
});
test('missing or unsupported logos fall back to the business name; remote logos require HTTPS',()=>{
 for(const logoUrl of [null,'data:image/svg+xml;base64,PHN2Zz4=','http://unsafe.example.invalid/logo.png']){const mail=buildBookingEmail({...input,brand:{name:'Another Venue',logoUrl}});assert.ok(!mail.presentation.html.includes('<img '));assert.match(mail.presentation.html,/Another Venue/);}
 const mail=buildBookingEmail({...input,brand:{name:'Another Venue',logoUrl:'https://brand.example.invalid/logo.png'}});assert.match(mail.presentation.html,/https:\/\/brand.example.invalid\/logo.png/);
});
test('light brand colors choose dark button and banner text for readable contrast',()=>{const mail=buildBookingEmail({...input,brand:{name:'Light Venue',primaryColor:'#FFFFFF'}});assert.match(mail.presentation.html,/bgcolor="#FFFFFF"/);assert.match(mail.presentation.html,/color:#172033/);});
