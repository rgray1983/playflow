# NEXT

This document is the living product backlog for PlayFlow.

It is intentionally flexible. Items move up, down, or are removed as we
learn from real-world use.

> **Rule:** Only the current sprint is committed work. Everything in
> this file is subject to change.

------------------------------------------------------------------------

# 🔥 Highest Priority

-   Follow the SaaS foundation review in `docs/reviews/2026-10-21-saas-foundation.md`: PlayFlow is the product; Palmetto Playhouse is its first customer.
-   Complete tenant-owned published legal forms and a second-business owner/parent/staff acceptance run.
-   Implement platform subscription billing, trusted billing webhooks and entitlements separately from venue memberships/customer payments. Plan prices, trial terms and past-due policy are pending owner decisions.
-   Finish iPad Square POS / Reader handoff and payment reconciliation.

-   Complete owner onboarding: real email verification/recovery and visual review.
-   Add payment refunds/reversals and credit accounting before allowing overpayments.
-   Connect Square sandbox/live deposit checkout and signed webhooks to the parent booking hold flow; gate confirmation and invitation release on payment.
-   Import Wix families and historical waivers with verified account claims and manual review of ambiguous matches.

------------------------------------------------------------------------

# 🟡 High Priority

-   Follow `docs/MODULE-COMPLETION-PLAN.md` for module readiness, settings consolidation and safe business enablement.

-   Add public customer booking flow for a Wix booking-page link.
-   Inspect Wix CMS exports and implement a repeatable migration with source IDs.
-   Add blackout dates, separate rooms if needed, and guarded rescheduling.
-   Replace demo dashboard totals with live business data.
-   Review restored product/admission prices and complete POS acceptance testing; snacks, retail, custom charges and family payment recording are connected.
-   Reports Dashboard
-   Email & SMS automation
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
