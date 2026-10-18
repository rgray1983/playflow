# Sprint 013 — Real open-play visits

The staff Check-In page now uses saved tenant families, guardians, children, waiver evidence, admissions and memberships. Sample families/children and fabricated inside counts are removed. Front Desk, Manager and Owner have a dedicated `visits.write` permission; Party Host and parent-only accounts do not gain desk intake access.

## Desk flow

1. Search active families by parent/child name, email or the last four phone digits. Results are tenant-scoped and capped at 20; names can contain multiple search words.
2. Select the attending guardian and individual active children. Allergy/accessibility notes and real waiver status are visible. Existing active visits cannot be duplicated.
3. New walk-in intake saves an unclaimed family, guardian and one to ten individual children. Matching contacts prompt review rather than silent account/family merging. A child can also be added to an existing family. Durable request IDs protect both operations from duplicate retries. No login account or family access is automatically granted or emailed.
4. If needed, hand the waiver screen to the guardian. Full terms, required acknowledgments, optional photo choice and typed electronic signature use the existing form/version. Each child gets its own signed coverage record. The document explicitly records IN_PERSON_GUARDIAN plus the authenticated staff witness; it does not claim the guardian used a verified parent login. Staff cannot replace proof with a waiver checkbox. Upcoming expected party attendance also receives replacement coverage.
5. Choose a saved admission type or an eligible recorded membership per child. Admission listed prices are validated and snapshotted. Staff explicitly acknowledge that taxes, fees and payment happen separately: this screen does not charge Square, record a payment, or label admission as paid. An admission record is not a receipt or settled sale.
6. Check in the selected children atomically. All must belong to the active family, have valid signed liability coverage, and be outside. Memberships must be active, started, unexpired, assigned to the child or family, and have a valid recorded plan. Shared visit packs count each child against the recorded membership term. Paused/pending/expired/exhausted memberships do not grant entry. Auto-renew flags do not invent new terms or payments.
7. The inside list shows real ongoing open-play visits with venue-timezone timestamps, guardian and admission/member selection. It refreshes every 15 seconds and paginates 50 rows. Party attendance remains separately managed. Checkout records the staff/time and is idempotent; waiver or membership expiry never prevents exit. Checkout does not refund a consumed membership visit.

A tenant reservation lock serializes check-in, signing, child archive/identity changes and membership use. Database protection adds one active visit per tenant/child and unique check-in request/child keys. Group failures roll back all visits. Same-request retries return original records even after checkout rather than admitting the child again. Changed retries fail.

## Data and parent portal

Additive migration `20261018033000_playtime_visits` adds durable intake keys, request fingerprints, guardian/member/waiver references, admission/evidence snapshots, staff audit fields and indexes. Applied to the original development database branch (no new Neon branch). Existing visits are not rewritten into fabricated waiver/payment evidence. Before the partial unique index was added, the database contained no duplicate active visits.

Parent Portal history reads these same Visit records, including check-in/check-out timestamps and admission versus membership use. Admission visits explicitly say payment was not recorded by check-in. Child archive remains blocked while a visit is active. Original signatures and completed attendance are not changed by later profile edits.

## Remaining integration

Admission sales, taxes/fees, payment recording/receipts and Square/POS checkout are separate work. Staff must handle collection separately; no paid status is inferred here. Membership enrollment, paid activation, renewals, refunds and visit-credit corrections still need their own workflows. Membership usage checks use the membership's recorded startsAt/endsAt and current plan visit limit; no monthly billing-cycle reset is guessed. Wix history/imports, photos, email automation and parent self-service check-in remain pending.

Validation includes tenant/role and cross-site denials, real family/guardian/child ownership, intake retry protection, active-visit race protection, required current waiver evidence, staff-witness metadata, price changes, atomic groups, shared membership limits/expiry/assignment, repeated checkout timestamps, and Parent Portal history. Tests use synthetic in-memory records; no person's live legal agreement is automatically signed or customer message sent. Type checks, focused lint and production builds run before preview publication.
