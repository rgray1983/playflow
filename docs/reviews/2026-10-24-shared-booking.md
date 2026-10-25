# Shared party booking and required rental agreement

Parents and staff now use one `BookingWizard`, one catalog/availability service and one reservation service. Staff selects the hosting family and parent first; parent portal users keep their verified family identity. Existing family/child details are reused. Staff can add a family or child through the existing intake dialog.

## Booking steps

1. Party details, birthday child, package, extras and date.
2. Available time, including the business's setup period.
3. Booking review and the child's liability waiver when coverage is missing.
4. Hosting parent's Party Rental Agreement with electronic signature.
5. Deposit checkout and current confirmation status.

The agreement, booking, host child and add-ons save in one transaction. There is no new unsigned reservation or checkout to pay until the agreement has been signed. Staff uses an in-person guardian signature with employee witness metadata; the employee is not substituted for the signing parent. Separate per-child liability coverage is still required and recorded through the existing signing services. Approved legal wording comes from the current business's published form; signed wording and booking terms remain immutable snapshots.

## Implementation

- Shared UI: `src/components/booking/BookingWizard.tsx`.
- Parent adapter: `ParentBookingWizard.tsx`; staff family selection: `/bookings`.
- Shared catalog and availability: `src/lib/booking/catalog.ts`.
- Shared transactional reservation: `src/lib/booking/reservation.ts`; `parent-booking.ts` preserves its existing exported parent adapter.
- Staff API: `/api/bookings`, guarded by approved staff with party-write permission.
- `/api/events` GET continues to supply existing party listings. Its POST delegates to the same signed staff booking handler, so the former unsigned payload cannot create a booking.
- Staff can explicitly waive a deposit with a required reason. The agreement is still mandatory; parent requests cannot acquire staff waiver authority.
- Booking refresh reads scoped current records, including partial deposits and the business's apply-deposit-to-balance setting. Payments continue through the existing shared party checkout or parent Square form. The final booking step refreshes confirmation status rather than continuing to say the venue always confirms manually.

## Verification

318 tests pass, including staff/parent access guards, mandatory current agreement, saved guardian identity and staff witness, foreign family/child rejection, idempotent retries across both staff URLs, concurrent slot conflict, signature-save rollback, stale prices/forms, restricted deposit waivers, partial-payment refresh and party-module disablement. TypeScript, changed-source lint, production build and whitespace checks pass.

No database migration, new Neon branch, real payment, live customer email, or legal wording change is required or performed for this change. Automated provider calls remain mocked in tests. Signed-in browser/tablet acceptance remains to be performed on the deployed preview.

## Acceptance

- In Bookings, select an existing family or add a new one, choose the hosting parent, and start the shared wizard.
- If the birthday child's waiver is missing, have the guardian complete it during review.
- Hand the device to the hosting parent for the rental agreement. Confirm that deposit checkout is unavailable until the agreement saves.
- Complete a Sandbox deposit; refresh the booking and verify current confirmation, balance, and party links.
- Repeat from the parent portal to verify the same booking steps and saved agreement.
- Staff-assisted signing currently requires the guardian on the device. For remote self-service, the parent books and signs through their own portal. A separate invitation to resume a staff-prepared unsigned draft is not added by this change.
