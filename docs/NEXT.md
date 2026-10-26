# NEXT

This document is the living product backlog for PlayFlow.

It is intentionally flexible. Items move up, down, or are removed as we
learn from real-world use.

> **Rule:** Only the current sprint is committed work. Everything in
> this file is subject to change.

------------------------------------------------------------------------

# 🔥 Highest Priority

Owner direction: finish the operating app and dashboard first. Guided owner onboarding and PlayFlow subscription billing follow afterward.

**Families stages 1–4 are implemented:** staff directory/editing, shared workflow edits, full scoped history and manager portal assistance, plus guarded archive/restore. See `docs/FAMILIES-MODULE-PLAN.md` and `docs/reviews/2026-10-25-families-management.md`. Staff membership management is now implemented; see `docs/reviews/2026-10-26-overnight-operations.md`. Next: signed-in workflow/tablet acceptance and verified email setup. Owner decision: archiving is sufficient; permanent deletion is outside the current scope.

> Shared parent/staff booking now includes the required hosting-parent rental agreement before deposit checkout. See `docs/reviews/2026-10-24-shared-booking.md` for implementation and acceptance checks.

1. Party checkout: deposits, balances, extras and iPad Square Reader. Shared checkout, confirmation gates and Reader handoff are implemented; physical Live reader acceptance remains blocked on platform Live setup and callback registration.
2. Booking communications: durable hold/confirmation/reminder previews and delivery queue implemented. Retry/backoff, sender snapshots, current-recipient/readiness checks and setup diagnostics are implemented. Connect a verified PlayFlow email sender, configure an authenticated scheduled queue trigger, enable delivery deliberately, and verify with owner-controlled test addresses.
3. Forms and settings: tenant-owned published waivers/rental agreements and enforced new-activity module switches implemented. Run second-business owner/parent/staff acceptance and review approved wording before rollout.
4. Reporting and payment corrections: daily collections, Sandbox separation, unpaid balances, Square receipts and guarded Square refund requests implemented. Complete provider Sandbox refund acceptance, cash/manual reversals, external Square refund reconciliation and bank settlement matching.
5. Dashboard: live collections, separate Sandbox totals, today's unpaid parties, missing agreements/guest waivers and payment/message alerts implemented. Dashboard refreshes while visible, filters quick actions by role and highlights memberships nearing expiry. Continue business acceptance and tablet visual review.

See `docs/reviews/2026-10-21-operations.md` for exact verification and external setup blockers. PlayFlow remains a multi-business SaaS; Palmetto Playhouse is the first customer.

------------------------------------------------------------------------

# 🟡 High Priority

-   Follow `docs/MODULE-COMPLETION-PLAN.md` for module readiness, settings consolidation and safe business enablement.

-   Add public customer booking flow for a Wix booking-page link.
-   Inspect Wix CMS exports and implement a repeatable migration with source IDs.
-   Add blackout dates, separate rooms if needed, and guarded rescheduling.
-   Refine the live dashboard from front-desk use and verify tablet layouts.
-   Review restored product/admission prices and complete POS acceptance testing; snacks, retail, custom charges and family payment recording are connected.
-   Extend reports with reconciliation, attendance and membership exports.
-   Verify transactional email delivery; SMS remains deferred.
-   Staff assignments for parties
-   Party completion workflow polish

------------------------------------------------------------------------

# 🟢 Medium Priority

-   Recurring membership billing and self-service purchases
-   Retail / concessions
-   Inventory tracking
-   Gift cards (deferred; not needed now)
-   Store credit

------------------------------------------------------------------------

# 💡 Future Ideas

-   Parent mobile app
-   Self-service check-in kiosk
-   AI operational insights
-   Franchise / multi-location dashboard
-   Loyalty & rewards
-   Digital invitations

------------------------------------------------------------------------

# 🅿️ Parking Lot

Ideas worth remembering but not actively planning.

-   Digital waivers improvements
-   Equipment maintenance
-   Customer surveys
-   Birthday follow-up campaigns
-   Seasonal promotions

------------------------------------------------------------------------

# Recently Completed

-   Workflow/settings review: honest module readiness, POS product settings, narrow-screen settings navigation, safe membership-plan disabling and stronger validation (`docs/reviews/2026-10-19-workflow-review.md`).

-   Admission bills with configured taxes/fees, recorded payments, printable receipts, real family POS and paid membership/visit-pack activation (Sprint 014; Square charging remains pending).
-   Real open-play family intake, child waivers, admission/member visit recording and checkout (Sprint 013; payment collection remains separate).
-   Parent family management, child archive/restore, saved/printable forms, and private history (Sprint 012).
-   Parent booking through signed rental agreement and unpaid, expiring hold (Sprint 011; Square checkout remains pending).
-   ✅ Commerce Settings V1
-   ✅ Booking workflow
-   ✅ RSVP & Guest Intake
-   ✅ Party Workflow
-   ✅ Event Log / Incidents
-   ✅ Party Control Center Dashboard
-   ✅ Party payment recording, history, and payment timeline entries
-   ✅ Private host tokens independent of guest invitations (Sprint 005)
-   Preview: staff login, explicit approvals, enforced roles, and business
    isolation (Sprint 006; owner onboarding verification remains pending)

------------------------------------------------------------------------

# Product Principles

Before starting any sprint, ask:

1.  Does this simplify the employee's job?
2.  Can this be configured instead of hard-coded?
3.  Does this fit the PlayFlow design language?
4.  Are we building the brain before the UI?
5.  Can this benefit future modules?

If the answer to any of these is "no", rethink the sprint before
implementation.

## Shared checkout and Square foundation (2026-10-19)

Implemented shared POS controls, Check-In order sidebar and family checkout popup, party deposit/balance checkout and family extras, staff booking deposit entry, parent deposit entry after rental signing, and central Payment Providers settings. Square Web Payments SDK / OAuth / Payments API / signed webhook handlers are implemented with encrypted credentials, durable retry references and pending-payment recovery. Existing manual collection remains.

Follow `docs/SQUARE-SETUP.md` to configure and authorize a Sandbox seller, then complete connected-account and browser verification. No Square account is connected by this code change. Terminal hardware, automated booking confirmation/email, refunds and manager REVIEW resolution remain later work. Sandbox records must be excluded from live reporting and development bookings resolved before launch.

## SaaS onboarding foundation (2026-10-21)

Implemented verified-owner self-service workspace creation at `/start`, an atomic empty business/owner/commerce setup, Company Settings → Getting Started, tenant-specific shell names and live business-scoped dashboard counts. Customer payment settings no longer ask businesses to configure developer secrets. Existing workspace claim and staff approval remain protected.

PlayFlow subscription billing is explicitly unavailable; creating a workspace does not create a paid subscription. Other businesses remain blocked from using Palmetto-specific legal forms. See the review above for release blockers and the implementation sequence.
