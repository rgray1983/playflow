# Sprint 007 — Reliable booking creation

Booking creation must save a linked customer and reserve a real time using saved business prices. A pending booking is a 48-hour hold, not a successful payment or a sent email.

Implemented:
- Linked Family and Parent records, conservative matching within the staff business, and a customer/pricing snapshot on each new booking.
- Server quotes from packages, add-ons, commerce taxes/fees and deposit rules. The full total remains unpaid until a payment is actually recorded.
- Business-timezone dates, package duration plus configured add-on extra minutes, configurable open days/start times/turnaround, expired-hold release, and overlap checks.
- Tenant row locking for concurrent reservations; request IDs and matching request fingerprints make retries safe. Confirmation and restoration share reservation locking and recheck availability.
- Real availability picker, fail-closed settings loading, clear pending/deposit labels, confirmation link after creation, and authenticated staff names instead of Devin.

Current model: one bookable venue. Separate simultaneous rooms, seasonal hours, blackout dates, duration-changing edits, customer record management, payment transaction hardening, full waiver records, and automated email delivery remain follow-up work. Staff can configure schedule defaults in Company Settings → Booking Schedule. Extra-time add-ons must have their additional minutes configured explicitly; existing add-ons default to zero extra minutes rather than guessing from their names.

Database: additive migration `20261016222000_booking_foundation`, applied to the existing development database. No extra Neon branch. Historical bookings are not repriced or relinked. Prisma migration history still needs a baseline before general migrate deploy can be enabled.

Wix migration plan (not yet implemented): inspect actual collections and sample exports; map guardian, child, booking, custom-answer and attachment fields; preserve original Wix IDs and source timestamps in an import ledger; dry-run, report duplicates/unmapped fields, then import repeatably. Keep original waiver text/signatures/timestamps as historical evidence rather than turning imported answers into new consent. Reconcile counts before switching incoming bookings. Wix can remain the public website and link to a future public booking flow; replacing the website is a separate decision. The staff `/bookings` page is not a public customer booking page.
