# Overnight operations delivery — October 26, 2026

## Membership management

Open Families → a family → Memberships & visit packs → View / manage. The same panel appears in POS under Family sales, payments & memberships. It shows effective status, recorded dates, original/adjusted visit limits, used and unused credits, purchase/payment receipt, the latest 20 term visits and management changes. History remains readable for archived families.

Front Desk can inspect and purchase permitted renewals. Owner/Manager can end access immediately or correct finite visit credits with an explicit reason. Ending access requires confirmation and refuses active visits or external billing connections. Pending enrollments are resolved through their bills. Ending access does not refund money or cancel an external subscription.

Credit corrections are a separate signed integer balance plus append-only change records; they never rewrite purchased terms or historical visits. They cannot remove already-consumed credits and are used by the same eligibility calculation in staff check-in and parent history. The business lock serializes corrections and membership consumption.

Renewals use the existing quote, bill, checkout and payment-activation services. An eligible ended/exhausted term creates a separate successor with the same child/family coverage, current chosen plan terms and one original-to-successor link. A single term cannot create duplicate successor purchases. Price/version/eligibility checks rerun when saving. Paid renewals start after full payment; free renewals activate immediately. No recurring charge is created. Early renewals, automatic billing, external subscription cancellation, expiry extension and parent purchases remain deferred.

## Dashboard and front-desk review

The dashboard refreshes in place every minute while visible and on window focus, offers an in-place retry, preserves the last snapshot on errors with a warning, and shows its update time. Quick actions follow staff permissions. Memberships ending within the next business-local week link back to their family. Existing live versus Sandbox money separation remains.

The approved POS register/keypad layout was preserved. Membership tools reuse the existing family and checkout workflows; existing regression tests continue to cover multi-child check-in, admissions/snacks/custom sales, payment/receipt activation, shared booking/agreement and guest waivers. No real payments or customer changes were performed.

## Booking email reliability

Added setup diagnostics, sender snapshots, attempt counts/backoff, active-lease protection, bounded/isolated processing, and current-recipient/deposit/agreement rechecks. Temporary failures retry the same immutable provider request; definitively failed setup attempts support an explicit bounded retry. Ambiguous outcomes stop for review. The scheduled endpoint rejects missing/incorrect authentication and remains idle without sender setup.

Email remains inactive: the preview has no Resend API key, sender address or scheduled-processor secret. No scheduled trigger or real delivery test was enabled. Follow `docs/BOOKING-EMAIL-SETUP.md` once a PlayFlow sending domain/provider is available. SENT indicates provider acceptance, not tracked inbox delivery.

## Verification

371 automated tests pass, including membership manager permissions, business/family scope, pending/external billing guards, shared balance consumption, stale/replayed requests, duplicate/concurrent renewals, free/paid activation and audit rollback; email stale-recipient/readiness checks, transport/rate-limit backoff, stable sender/body/key, attempt limits, leases and job authorization; and bounded business-scoped dashboard alerts. TypeScript, changed-source ESLint, production build and diff checks pass.

The additive Membership/BookingMessage columns and MembershipChange audit table are applied on the original development database branch. No new database branch was created. No customer membership, payment, email, family archive or signed document was modified during QA.

## Morning acceptance

1. Refresh the stable preview. In a test family's Memberships & visit packs, inspect status, balance, receipt, visits and changes.
2. As a manager, correct a finite pack by +1 with a reason, verify check-in shows the added credit, then reverse with -1 if unused. Confirm Front Desk cannot correct/end rights.
3. Test renewal on an expired/exhausted test term: save one renewal bill, verify the original remains intact, pay using the existing Sandbox/cash-test workflow, and confirm the successor activates. Retrying must not create another term.
4. End a test membership after its visits are checked out. Verify it stops new redemption and no longer alone blocks family archive. No refund should be implied.
5. Check dashboard refresh and expiry alerts on desktop/iPad. Check-In/POS keypad and payment buttons should retain the approved layout.
6. Review Communications configuration; delivery acceptance waits for sender/scheduler setup. No live recipient test should be inferred from automated tests.

Automated signed-in browser/tablet acceptance remains unavailable behind the preview's authentication protection. The owner's signed-in walkthrough is still needed. Permanent family deletion is outside the current scope; archiving is sufficient per the owner's decision.
