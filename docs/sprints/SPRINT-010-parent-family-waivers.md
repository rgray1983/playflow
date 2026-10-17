# Sprint 010 — Parent identity and signed child coverage

First reviewable parent-portal and waiver foundation, using the current Palmetto Playhouse forms and the owner's supplied correction to liability section 1. This is not the completed public booking/Square rollout.

## Available flows

- `/parent/palmetto-playhouse`: verified parents create a new family, add individual children, select covered children, and sign a liability waiver. Existing Wix families are not imported or silently claimed by email.
- Company Settings → Waivers & Agreements: choose no automatic expiration or 1–3650 days for new signatures. Existing signed documents retain their stored expiry. Review these operating settings separately from legal enforceability.
- Staff with settings permission can search existing parents and create a private, single-use family access link, expiring after 30 minutes. The recipient must use the matching verified email. Creating a replacement invalidates the previous link; accepting consumes it. An account already linked to a family cannot silently switch families.
- Parent authentication returns to the portal after sign-in/sign-up/email verification. Parent membership never grants staff access. Family queries use the verified account ID and business ID, not a client-provided family ID.
- Linked hosting parents can sign a rental agreement for their own existing booking from the portal. The exact event dates and deposit amount are snapshotted with the agreement. Rental signatures do not grant child liability coverage.
- Guest RSVP acceptance presents the actual liability terms, every required acknowledgment, typed signature/electronic-signature consent, and separate optional photo consent. Up to ten children are listed individually. One signed document creates a separate `WaiverChild` signed record for each child; each guest points to that child's coverage.
- Public RSVP contact details create an unclaimed intake family; they cannot overwrite or claim a verified family. A venue-issued family link can later connect that parent. Automatic reuse of a signed-in guest's existing family is a later UX step.
- Identical signed RSVP requests return without duplicating records. Changed retries fail. Declines create no signed evidence. An old `waiverAccepted: true` request cannot create a signed waiver.
- Guest check-in requires actual valid signed liability coverage linked to the correct child, not a legacy checkbox. Legacy `SIGNED` flags without coverage display as needed in the event manager. Historical rows are not fabricated into new signatures.
- New bookings reserve the configured setup period (default 30 minutes) before the displayed party start. Setup blocks availability and confirmation/restoration overlap checks and appears separately on the calendar. Existing bookings with no setup snapshot are not backfilled.

## Records and migration preparation

Additive migration `20261017060000_family_waivers` adds verified parent bindings, source Wix profile/member/child IDs, emergency/relationship fields, one-time claim fields, immutable signing snapshots and per-child signing details, guest coverage links, and setup time. It is applied to the original development database; no extra Neon branch or Wix writes.

Each signed document retains its kind/version, signer name/email, typed signature, server signing time, required acknowledgments, optional photo permission, identity method, exact displayed wording and child names/birth dates at signing. Each child has its own signed coverage record linked to that document. New liability signatures default to no automatic expiration, as the owner's provisional operating choice; rental agreements are specific to their booking.

Reviewed sources: `parent-portal-current.html`, `parent-portal-velo.js`, parentProfiles/children/waivers/parentVisits/memberships/accountSecurity/staff JSW files. Parent profiles, children, and visits link through `parentMemberId`. The migration must include Wix member-ID/email mapping as well as full paginated CMS exports. Existing waiver-name matching and manual approval flags must remain distinguishable from confirmed document/child associations. Memberships derive from Wix store orders and need their own reconciliation. Raw uploaded Wix source files and real customer records are not copied into this repository.

## Still required before customer launch

- Full parent-facing party wizard using shared booking steps and existing children, with rental agreement before deposit checkout and hosting-child liability coverage.
- Square integration, signed webhooks and confirmation gated on the required agreement/deposit. Manual staff payment recording remains separate; this sprint does not charge cards or enforce the future public booking checkout gates.
- Wix import dry run, source-ID ledger, explicit family account claims, ambiguous waiver review, and protected historical signatures/files.
- Parent profile/child editing and archiving, full walk-in visit persistence, memberships, photo uploads and consent withdrawal handling.
- Rental renewal rules after rescheduling and policy/version changes.

Validation includes ownership and unverified/cross-site denials, no email-only claims or staff escalation, claim email/expiry/reuse checks, per-child snapshots, signature validation, RSVP retry protection, check-in evidence, setup overlaps, and calendar setup boundaries. Existing booking/payment/calendar/auth suites also run. Visual and real-signature review are for the owner; no live person's legal agreement is signed by automated tests.
