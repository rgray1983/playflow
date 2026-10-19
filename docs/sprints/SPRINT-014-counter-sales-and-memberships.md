# Sprint 014 — Admission sales, recorded payments and membership enrollment

## Result

Playtime check-in can now save one admission bill for the selected children in the same transaction as their visits. The sales ledger links to the family and each admission visit without rewriting its waiver evidence. Check-in does not claim a payment was collected. Membership-covered children are excluded from admission charges.

The staff POS page now uses real family sales instead of demo products and a simulated payment button. Staff can also open the same sales component beneath the selected family on Check-In. Admission visits saved before this sprint can be selected and billed explicitly. Existing records and historical prices are not silently backfilled.

## Pricing and payment behavior

- Prices come from the visit's saved admission price or a server-loaded active membership plan. All ledger amounts use integer USD cents.
- Admissions and memberships use their corresponding Commerce Settings tax profiles. Inclusive tax is disclosed without adding it a second time. Enabled flat and percentage fees apply once to a bill; taxable fees use the configured default tax rate. All charged fees appear on the bill/receipt.
- No tax rates or taxable classifications were guessed or enabled. Owners must review their saved Commerce Settings for their operation.
- Review the saved admission bill before collecting payment. Membership enrollment requires a current server quote; stale prices or terms require a fresh review.
- Payment recording supports enabled cash/card/other methods, required notes, partial payments and the configured split-method rule. Card means collected on an external terminal. No Square credentials, charge or processor verification is involved.
- Staff must explicitly attest the money has already been collected. Receipt references can be stored in internal notes; card data must not be entered.
- Tenant locking, request fingerprints, durable request IDs and guarded remaining-balance calculations prevent duplicate retries and overcollection. Failed payment/activation writes roll back together.
- Bills show OPEN, PAID or VOID and retain line, fee, tax, business and staff snapshots. The inside list shows the saved balance or a warning for unbilled legacy admissions. Exiting the facility is never blocked by a payment problem.
- Only unpaid, nonzero bills with no payment records can be voided. Staff name/time/reason are retained; admission visits can be billed again. No refund or credit is invented.

## Memberships and visit packs

Staff select an active plan and explicitly choose one child or shared family coverage. Enrollment saves a pending membership plus bill; full recorded payment activates it. Zero-total plans activate immediately without creating a fictitious payment.

Activation establishes the term start. An explicit duration in days takes precedence; otherwise MONTHLY/YEARLY means one calendar month/year in the venue timezone. NONE with no duration has no automatic expiration. No automatic renewal or recurring card billing is enabled.

Saved terms preserve the visit limit, duration, interval and timezone. Subsequent plan edits/deletion do not expand or remove purchased entitlements. Legacy memberships continue using their existing plan rules. Each admitted child consumes one use from a shared pack; unlimited plans have no visit limit. Check-out does not restore a visit. An unpaid enrollment can be cancelled by voiding its unpaid bill.

## Parent portal and receipts

Family history adds Admission & membership bills, showing outstanding amounts, payment records and printable receipt/bill downloads. Membership history shows eligibility/remaining-use information. Parent requests are restricted to the verified parent's linked family and tenant. Party payment visibility remains restricted to that parent's hosted parties.

Printable HTML escapes stored text, snapshots configured business/footer/policy details and reports actual recorded payments and remaining balance. Open the downloaded file in a browser to print/save PDF. No email/SMS receipt is sent. Internal payment notes, staff IDs, request hashes and processor data are excluded from parent receipt selections.

## Database and validation

Additive migration: `20261019052000_counter_sales`, applied to the original development database branch. New CounterSale and CounterPayment tables, Visit.counterSaleId, Membership.termsSnapshot, indexes and ledger check constraints. Existing visit/waiver/member records retained. No synthetic sale, collected payment or signed customer form was inserted in the shared database during automated tests.

Validation: 189 automated tests passed, including complete admission check-in/bill rollback, concurrent billing/payment attempts, stale membership quotes, partial payments, activation rollback, saved entitlements, calendar boundaries, access guards and receipt escaping. Changed application files pass ESLint; production build and TypeScript checks pass. Browser visual testing remains a manual preview check; automated tests use synthetic in-memory data.

## Still pending

- Square sandbox/live charging and signed webhook reconciliation.
- Refunds, credit accounting, paid-sale corrections and overpayment/change workflows.
- Recurring membership billing/renewal and parent self-service membership purchase.
- Retail/concessions, gift cards and inventory checkout.
- Automatic emailed receipts/booking notifications (provider/sender setup and delivery tracking).
- Visual polish and full manual acceptance testing on desktop/mobile.

## POS register layout restored

The POS now uses the original register arrangement: sidebar navigation, sales/category tiles, ordered items and totals, cash/card/split controls, an onscreen decimal number pad, and a prominent Pay button. Family lookup and history/membership management open in separate dialogs. The register uses persisted admission/member bills; it does not reintroduce fabricated products or process an unrecorded demo charge. Unbilled saved visits can be added to checkout. The Pay action confirms externally collected money through the existing idempotent payment service, then presents the receipt. Partial/split controls honor Commerce Settings.

The first numeric key replaces the prefilled exact balance, so staff can enter a partial amount directly. Clear, backspace, duplicate decimals and maximum precision are covered by three additional tests (192 total passing).

## Multiple children in one checkout

The register now keeps a cart of selected family bills rather than replacing one selected bill with the next. Clicking another child/sale adds it, selected tiles show a checkmark, clicking again or using Remove removes only that selection, and Clear clears the checkout selection. Adding an unbilled admission preserves the other selected sales. The grand total sums the selected bills' saved prices, taxes, fees and recorded payments without repricing historical bills or introducing another checkout fee.

One Pay action records the collected amount across up to 20 selected bills atomically under the tenant lock. Allocations retain their original bill/family links and use one replay fingerprint covering the full selection, reviewed balances, amount and method. A stale balance requires refresh/review; any failed allocation rolls back the whole collection, including membership activation. Partial payments allocate to bills in stable bill-ID order. The combined printable checkout summary includes all selected children's lines, original bill references and payments; individual bill records remain in parent/staff history.

Validation: 201 tests pass, including sibling cart accumulation, removal and totals, combined receipt references, full and partial multi-bill collection, retry/concurrency protection, stale/foreign bill rejection, and rollback when the second bill's membership activation fails. No schema migration is required for this fix.
