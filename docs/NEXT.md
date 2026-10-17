# NEXT

This document is the living product backlog for PlayFlow.

It is intentionally flexible. Items move up, down, or are removed as we
learn from real-world use.

> **Rule:** Only the current sprint is committed work. Everything in
> this file is subject to change.

------------------------------------------------------------------------

# 🔥 Highest Priority

-   Complete owner onboarding: real email verification/recovery and visual review.
-   Add payment refunds/reversals and credit accounting before allowing overpayments.
-   Connect Square sandbox/live deposit checkout and signed webhooks to the parent booking hold flow; gate confirmation and invitation release on payment.
-   Import Wix families and historical waivers with verified account claims and manual review of ambiguous matches.

------------------------------------------------------------------------

# 🟡 High Priority

-   Add public customer booking flow for a Wix booking-page link.
-   Inspect Wix CMS exports and implement a repeatable migration with source IDs.
-   Add blackout dates, separate rooms if needed, and guarded rescheduling.
-   Replace demo dashboard totals with live business data.
-   Replace demo walk-in check-in with persistent families and visits.
-   Complete general POS checkout (current Process Payment button is a mockup).
-   Reports Dashboard
-   Email & SMS automation
-   Staff assignments for parties
-   Party completion workflow polish

------------------------------------------------------------------------

# 🟢 Medium Priority

-   Walk-In POS
-   Membership billing
-   Retail / concessions
-   Inventory tracking
-   Gift cards
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
