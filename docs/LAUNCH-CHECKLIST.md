# PlayFlow launch checklist

Agreed with Richie on October 27, 2026. This is the ordered checklist for the first release. Palmetto Playhouse is the first business; PlayFlow remains a multi-business SaaS. Finish the operating workflows, give the app a premium design pass, verify it ourselves, then invite Richie's sister to trial it.

Only the current item is active. Record implementation, verification and remaining external activation separately. A passing automated test is not proof of hardware, inbox delivery or an unattended scheduler run.

## 1. Finish email automation — IN PROGRESS

- [x] Verified shared sending domain and test delivery to extngraphics@gmail.com (owner-confirmed).
- [x] Branded hold, confirmation and reminder emails, plain-text fallback and separate private/shareable links.
- [x] Per-business wording editor, live preview, defaults and frozen message snapshots.
- [x] Test-recipient controls and retry/deduplication guards. Owner enabled automatic eligibility for saved contacts within each business on October 27; parent-by-parent inbox approval is not required.
- [x] Authenticated no-send scheduler configuration check and controlled processor failure response.
- [x] Choose and configure Vercel durable per-message jobs for the active preview, with scoped claims, durable wakeups and retries.
- [ ] Observe the hosted one-minute timer check and an actual unattended reminder delivery.
- [x] Per-business reply-inbox verification, frozen Reply-To headers and live-delivery gate.
- [x] Signed provider event processing, duplicate/out-of-order protection, delivery states, suppression and staff alerts.
- [x] Scheduled processor success/failure timestamps and visible activation status.
- [x] Automated expiration, cancellation, changed-recipient, lost-response and immutable-retry checks.
- [x] Verify Palmetto’s chosen reply inbox (current database state confirmed).
- [ ] Accept an actual reply from a newly sent test message.
- [ ] Register the provider webhook/signing secret on a reachable deployment and observe real delivered/failure events.
- [ ] Complete inbox acceptance for expiration, cancellation and changed-recipient scenarios with the approved test inbox.

Implementation validation: 456 automated tests, changed-source lint and the production build pass. No email was sent by the agent during these changes. Provider/scheduler activation and signed-in acceptance remain separate checks.

Done when booking notifications and reminders reach the approved inbox reliably without staff activity, replies go to the correct business, and delivery failures are visible. Change/cancellation message types are completed with item 2.

Scheduling choice: Vercel durable workflows are configured for the active preview. A worker sleeps until its message is due and rechecks booking state before each attempt; this avoids promoting the app simply to enable production-only native Cron. Hosted wakeup and email acceptance are still unchecked. A one-minute no-email timer check and scheduling recovery controls are in Communications settings.

Provider activation blocker: automatic approval review rejected storing a Vercel project protection-bypass key in the Resend callback URL because that would disclose a persistent credential to Resend. No webhook or signing-secret variable was created. The unused dedicated key created for the attempt was revoked. Owner approval of that specific credential sharing, or an approved public signed callback target, is required before retrying. Keep app protection enabled.

## 2. Finish booking changes and cancellation rules — QUEUED

- [ ] Blackout dates/closures.
- [ ] Rescheduling with fresh availability, setup and overlap checks.
- [ ] Explicit cancellation/deposit/refund policy and accurate retained history.
- [ ] Reschedule/cancellation messages and obsolete-reminder handling.
- [ ] Review final party closeout, guests checked out and balances settled.

Done when staff can change or cancel a party without double-booking, losing money/history, or emailing stale details.

## 3. Finish payment corrections and recovery — QUEUED

- [ ] Connected Square Sandbox partial/full refund acceptance.
- [ ] Cash/manual payment corrections with manager authorization and an audit trail.
- [ ] Manager resolution for pending/uncertain payments and refunds; no duplicate collection.
- [ ] Confirm effects on booking balances, receipts and memberships are explicit.
- [ ] Prepare Square Live and iPad Reader acceptance checklist for items 8/11.

Done when a cashier's mistake, a cancellation or a lost provider response has a clear, safe recovery path.

## 4. Finish daily closeout and useful reports — QUEUED

- [ ] Cash reconciliation/closeout and payment-method totals.
- [ ] Consistent collections, refund and outstanding-balance reporting.
- [ ] Required attendance/membership exports and clear export limits.
- [ ] Reconcile representative mixed admissions, snacks, memberships and party payments without counting deposits twice.

## 5. Finish the everyday staff and parent workflows — QUEUED

- [ ] Full family/guardian assistance, membership management and party operations review.
- [ ] Parent booking, rental agreement, guest RSVP/waiver and saved-document/history review.
- [ ] Verify sign-in, email verification, password recovery and staff permissions.
- [ ] Refine dashboard priorities and action links from realistic front-desk scenarios.
- [ ] Remove misleading/dead controls and resolve workflow inconsistencies.

## 6. Prepare the Wix migration and switch-over — QUEUED

- [ ] Inspect actual exports and map families, children, forms, bookings and history.
- [ ] Build an idempotent importer with original source IDs, duplicate review and reconciliation.
- [ ] Preserve original signature/text/timestamp evidence rather than manufacturing new consent.
- [ ] Dry-run on reviewed data and prepare the Wix-to-PlayFlow booking/portal links.

Do not import real records or redirect real customers until the pilot and reconciliation are accepted. Final import happens with item 11. Replacing the entire Wix website remains a separate later decision.

## 7. Give PlayFlow its premium facelift — QUEUED

This happens BEFORE the sister's trial.

- [ ] Cohesive typography, colors, spacing, navigation and component states.
- [ ] Clear hierarchy, fewer competing controls and obvious primary actions.
- [ ] Polished dashboard, families, calendar, party management and Company Settings.
- [ ] Polished parent portal, booking, RSVP, waivers and checkout.
- [ ] Comfortable iPad touch targets, responsive scrolling and loading/empty/error/success states.
- [ ] Preserve the approved POS keypad, multi-child selection and immediately accessible payment controls.

Done when the full app feels like one premium, straightforward product, rather than separately built screens.

## 8. Complete our release checks — QUEUED

- [ ] Complete representative business-day walkthrough on desktop and the actual iPad.
- [ ] Intake/waiver → multiple children + snacks → payment → receipt → checkout → parent history.
- [ ] Parent party booking → agreement/deposit → confirmation → invitations/RSVP/waivers → attendance → final payment → closeout.
- [ ] Membership purchase, redemption, renewal, correction and ending access.
- [ ] Failure/retry/double-click/expired-hold/cancellation and role-isolation checks.
- [ ] iPad layout and Reader handoff/cancel-return checks in the available testing mode. Final physical Live sale/refund acceptance is item 11.
- [ ] Automated tests, changed-source lint, TypeScript, production build and security/backup readiness review.

## 9. Sister's guided trial — QUEUED

- [ ] Provide the polished build, test families/bookings and a short scenario checklist.
- [ ] Observe actual front-desk/party tasks and collect specific friction/defects.
- [ ] Keep test money and recipients separate from real customers until launch.

## 10. Fix trial feedback and sign off — QUEUED

- [ ] Resolve pilot defects/usability issues.
- [ ] Recheck changed workflows on the target device.
- [ ] Confirm business pricing, published forms and operating policies with the owners.

## 11. Production setup and Palmetto go-live — QUEUED

- [ ] Permanent production app address, parent links, OAuth callbacks and publicly reachable signed webhooks with appropriate authentication preserved.
- [ ] Square Live platform setup, Palmetto seller/location authorization and physical payment acceptance.
- [ ] Scheduled email activation and an observed unattended reminder run; verified business reply inbox/provider event delivery.
- [ ] Monitoring/alerts, secure credential recovery, backup and restore check.
- [ ] Resolve test/pending records deliberately, reconcile the final Wix import, then switch incoming booking/portal links.
- [ ] Remove test-only delivery restrictions only after explicit real-customer launch authorization.

## 12. Commercial SaaS onboarding and billing — QUEUED AFTER THE OPERATING APP

- [ ] Guided owner setup on top of the existing workspace foundation.
- [ ] Approved PlayFlow plans/prices/trials and subscription/payment-method management.
- [ ] Renewal, cancellation, past-due/grace/access rules and invoices.
- [ ] Fresh second-business owner/staff/parent acceptance and isolation checks.
- [ ] Platform support, business data export/offboarding and release documentation.

## Parked for later

Gift cards, permanent family deletion, custom sending domains, inventory, camps/classes, kitchen cafe workflows and general rentals are outside this first-release checklist unless the owner deliberately changes scope. Archiving remains the current family-removal workflow. Recurring venue membership billing and parent membership purchases remain later work.
