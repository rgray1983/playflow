# NEXT

This document is the living product backlog for PlayFlow.

It is intentionally flexible. Items move up, down, or are removed as we
learn from real-world use.

> **Rule:** Only the current sprint is committed work. Everything in
> this file is subject to change.

------------------------------------------------------------------------

# 🔥 Highest Priority

The owner-approved execution order is now maintained in [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md). That checklist supersedes older sequencing and stale integration status below.

Current item: **1 — Finish email automation (in progress).** Shared Resend test delivery, branded designs, editable wording, reply-inbox verification, signed delivery-event processing/suppression and processor health timestamps are implemented. Reply-inbox verification is confirmed. Durable Vercel email jobs and a no-email one-minute timer check are implemented/configured for the preview. The owner approved the dedicated access key in Resend’s private callback URL, and the callback/signing secret are configured. Runtime signature rejection and staff-auth checks pass. Remaining acceptance: observe hosted timer wakeups, real booking-message delivery/provider events and an actual reply. The owner enabled automatic eligibility for active saved contacts within each business in the preview; no production promotion is needed for implementation.

Sequence: email automation → booking changes/cancellations → payment corrections/recovery → daily closeout/reports → remaining daily workflows → Wix migration preparation → premium facelift → our release checks → sister's trial → feedback fixes → production activation/final import → commercial SaaS onboarding/billing.

The premium facelift is explicitly before the sister's trial. Preserve the approved POS keypad/payment layout. Archiving is sufficient for this release; permanent family deletion stays deferred.

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
