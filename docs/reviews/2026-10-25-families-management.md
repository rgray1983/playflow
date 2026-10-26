# Families stages 3–4 review

## Shipped behavior

Open Families and a family record. Family history and saved forms is expandable and paginated. It includes saved signatures/printable copies, visits, bookings/attendance, memberships, bills/receipts, party payments, Square/refund states and archived children. It works for archived families too. New Wix history is still dependent on migration.

Owner/Manager sees Access & management: add an authorized guardian, generate a private verified-email portal link, or preview archive/restore. Front Desk retains ordinary profile edits and permitted history; Party Host has no general Families access. The record's recent changes show actor, time, field names and manager-only lifecycle reason.

Archive requires no live activity or outstanding money, exact-name confirmation, a reason and a fresh version. The final transaction checks blockers again. Parent access pauses; normal sign-in IDs remain attached for restore. Historical forms, payments, activity and child active flags stay intact. Restore does not revive old unused claim links.

## Owner acceptance

1. Refresh the preview and open a family. Browse each history section and page. View a previously signed form and download its original printable copy; verify original signer/wording remain intact after a profile correction.
2. As a manager, add a test guardian using an email not already present in this business. Verify the adult appears unconnected. Create an access link only after confirming the intended adult; copy privately and verify that claiming requires the matching verified sign-in email. Do not share links publicly.
3. Open Archive family for a record with live activity/unpaid bills. Review the blockers and confirm it cannot submit. Close without changing anything.
4. Use an inactive test household with no outstanding activity/money to preview and archive with a reason and exact name. Confirm it disappears from Active search and appears under Archived; history still loads. Its linked parent's portal should refuse family access.
5. Restore from that same family record with a reason/exact name. Confirm its original IDs, contacts and account connection remain, and individually archived children remain archived. Verify the linked parent can access their family again.
6. Confirm Front Desk cannot use the manager controls or management API; edit normal contact/child details through Check-In, Bookings and POS and continue the current workflow.

## Engineering evidence

345 automated tests pass. Production build, TypeScript, changed-source ESLint and diff validation pass. Three read-only Postgres fixture scenarios match expected counts for all archive blockers, resolved/foreign records and legacy/review cases. Fixtures shadow live tables using CTEs; no customer records are changed. The additive reason-column migration is applied to the original development database branch.

Automated signed-in browser/tablet acceptance is unavailable behind the deployment's authentication protection. No live payment/refund, email, guardian connection, or customer archive/restore was performed by the agent.

## Remaining scope

Permanent family erasure and parent privacy requests await shared-adult/retention decisions. This is reversible archive, not deletion. Access email delivery is manual. Membership/subscription cancellations and money corrections remain operations work and are not performed by archive; active or unresolved records remain blockers.
