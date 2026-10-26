# Company Settings and module completion plan

Reviewed October 19, 2026 for Palmetto Playhouse.

## Main finding

The original Modules screen was a static list, not a configuration system. Its Enabled/Off badges were hardcoded and did not control the database, APIs, navigation or parent portal. Memberships and Retail were shown Off even though their core workflows now work. No TenantModule model exists. POSSettings.tsx was an unused placeholder claiming another settings model was needed, although CommerceSettings already stores payment, tax, fee and receipt rules.

The reviewed screen now presents honest build-readiness cards and links to working settings. It does not introduce pretend switches or silently disable business functions. POS & Products now exposes the existing real product catalog and points to Commerce for payment/tax/receipt configuration. A narrow-screen settings selector replaces the fixed desktop panels on phones. Desktop navigation and the approved POS layout remain.

## Module inventory

| Module | Current implementation | Work needed to finish |
|---|---|---|
| Admissions | Family intake, individual child waiver coverage, admission/member check-in, checkout, saved bills and receipts | Operational acceptance testing, payment connection and eventual occupancy/resource rules |
| Parties | Staff/parent booking, rental agreements, holds, availability checks, host/guest links, RSVP, child waivers, attendance and manual payments | Square-backed confirmation, automatic emails/invitations, rescheduling, cancellation/refunds, final party closeout |
| Calendar | Saved weekly events and setup periods, tenant timezone, overlap/buffer checks | Blackouts, safe rescheduling, room/resources only if needed |
| POS | Approved register/keypad, multi-child basket, catalog/custom charges, partial/split recorded payments, receipts | Square charging and reconciliation, refunds/reversals, cash closeout; do not replace the approved layout |
| Memberships | Plan settings, paid enrollment, saved terms, family/child coverage, limited packs and usage | Staff renewal purchases, manager credit corrections and ending access now implemented. Remaining: signed-in acceptance, recurring billing/external subscription handling and parent purchases; expired/unpaid states must stay accurate |
| Retail | Saved catalog, editable prices, active/disabled products, quantities, tax/fee quote, receipts | Optional inventory counts/adjustments/low-stock alerts; SKU/barcodes only if needed |
| Café | Packaged snacks/drinks already sell in POS | Dedicated café workflow would need menu/modifiers, kitchen tickets and preparation status; defer unless needed |
| Camps | No camp session/enrollment domain | Sessions, capacity, enrollment, multi-day attendance, emergency/authorized pickup, guardian consent and refunds |
| Classes | No recurring class/enrollment domain | Recurring timetable, instructors, capacity, waitlist, enrollment/attendance and make-up/cancellation rules |
| Field Trips | Generic event names can describe one; no school/group workflow | School contacts, group headcount/capacity, quotes/invoices, individual child waivers, group attendance |
| Rentals | Party rental agreements exist; general rentals do not | Clarify room vs equipment rental, resource availability, deposits/damage policy, handover/return |
| Reports | Attendance and transaction source records exist; no Reports page/dashboard | Reconciled daily sales, payment-method totals, unpaid balances, visit/waiver counts and membership usage, followed by exports |

Gift cards are explicitly deferred and should not appear as a working POS category. Do not block finishing the app on camps/classes/café/general rentals that Palmetto Playhouse may not need.

## Recommended build order

### Phase 1 — Finish the launch workflow

1. Complete manual acceptance of intake/waiver/check-in → multi-child admissions + snacks/custom items → payment recording → receipt → checkout → parent history. Keep historical charges and original legal evidence immutable.
2. Complete party acceptance: signed parent agreement and child waiver → expiring hold → payment/confirmation → separate host/guest links → RSVP waiver → party attendance → closeout.
3. Decide and implement cancellation/refund/reversal rules before accepting overpayments or claiming any external refund was processed. Preserve cashier audit and idempotency across all payment paths.
4. Connect Square sandbox once access is available, test signed webhooks, then distinguish provider-confirmed payments from staff-recorded external collections. Recording money is not charging a card.
5. Add transactional email with a selected provider and verified sender, a durable outbox, retry/deduplication, delivery status and previews. Do not send real messages during QA without an explicit sending task.

Done means the full workflows work on desktop/mobile and the app does not confirm unpaid online bookings or imply emails/charges happened when they did not. Existing deliberate staff/manual confirmation remains a documented exception until provider policy is implemented; do not silently change that policy during visual cleanup.

### Phase 2 — Operational visibility and consolidated settings

1. Build real daily reports first: receipts, cash/card/other collected, unpaid bills and admissions/visits. Define sale totals vs payment collections explicitly; avoid double counting composite checkout receipts and their original bills.
2. Include legacy party EventPayment and new CounterPayment ledgers with explicit categories; do not drop historical membership payment records from later reporting/migration.
3. Provide venue-timezone day boundaries, clear date filters and downloadable reconciliation. Square-settled totals must stay separate until processor reconciliation exists.
4. Keep one source for each setting: Commerce for tax/fees/payment/receipt policy, POS & Products for catalog, Admissions for admission types, Memberships for plans, Booking Schedule for hours/setup/buffers, Waivers for validity/legal versions.
5. Replace demo dashboard statistics and the missing Reports destination with verified live reports. Avoid another duplicate POSSettings payment model.

### Phase 3 — Real business module preferences

Keep four concepts separate: build readiness, business enablement, staff permission, and integration connection. A module being built or selected must not grant permissions or assert that Square/email is connected.

Suggested persistence: TenantModule with tenantId/key unique, enabled, updatedAt and actor; append-only preference-change audit. All current working modules must default to preserving current behavior. Do not derive initial settings from the old hardcoded Off badges.

Dependencies and behavior:

- Admissions requires family records and child liability coverage. Parties requires availability/booking rules and appropriate agreements/waivers. These safety records are core services, not optional switches to bypass.
- Retail selling depends on POS. Café counter sales reuse retail/POS rather than a second sales ledger. The Calendar UI can be optional while reservation collision checks remain mandatory.
- Disabling Memberships should stop new sales/upsells, not destroy already-purchased rights. Decide explicitly how existing members continue redeeming while that module is hidden.
- Disabling a module must preserve historical profiles, signatures, transactions and reports. Existing visits must still check out; bills still need payment/refund handling; confirmed bookings and their host/guest links must still function.
- Parent profile, saved forms and history remain accessible. Gate creation of new bookings/enrollments consistently across staff and public/parent APIs.
- Enforce preferences on the server and use the same resolved state for staff navigation, Company Settings, POS tabs and parent screens. Hiding a button alone is not enforcement.
- Check the exact action and record lifecycle rather than placing blanket guards that strand existing transactions. Validate dependency changes atomically.

Acceptance checks: owner/manager authorization, tenant isolation, direct API calls to disabled creation actions, dependency conflicts, stale updates/concurrent changes, disable/re-enable without lost data, and completion of pre-existing visits/bookings/payments. Allow read-only history regardless of future selling preferences.

### Phase 4 — Only the additional operations the business needs

Choose one additional vertical at a time with concrete acceptance criteria. Suggested order if demand exists: field trips → camps/classes → kitchen café → general rentals. Reuse family, waiver, schedule, payment and communications services; give each vertical its own actual roster/resource rules. A generic Event Type name is not a completed specialized module.

## Decisions needed later

- Which of field trips, camps, classes, café preparation and non-party rentals Palmetto Playhouse actually plans to offer.
- Whether rooms/resources need independent capacity calendars.
- Square access, sender/domain for email, live tax/fee/pricing review and cancellation policy.
- What existing member/booking operations remain available when future module sales are switched off.

None of these require rebuilding the approved POS or migrating real Wix records during development QA.
