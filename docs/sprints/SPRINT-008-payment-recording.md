# Sprint 008 — Reliable manual payment recording

Record received deposit and balance payments without losing updates or recording retries twice. This is staff bookkeeping, not an integrated card charge.

- Serialize balance reads and writes with the booking business lock and a party row lock. Store payment, balance, deposit state and timeline atomically.
- Require request IDs and fingerprints; return the same payment on an identical retry and reject changed retries.
- Validate positive whole-cent amounts, selected payment purpose, enabled method rules, required notes, partial-payment rules and remaining amounts on the server.
- Keep deposit amounts due separate from amounts received; partial deposits stay pending, full deposits get a collected status, and final balance payments settle an outstanding applied deposit. Respect the saved apply-deposit-to-balance setting.
- Save cashier name/employee ID and purpose in payment history. Existing rows are classified as balance payments and labeled legacy where cashier identity is unknown; no historical money is recalculated.
- Expired holds are cancelled with history preserved instead of deleted. Cancellation never assumes that an unconfirmed booking has no payments.
- UI distinguishes deposit/balance, uses allowed methods, preserves typed amounts through background refreshes, and provides retry/new-payment controls.

Additive migration: `20261016223000_payment_recording`, applied to the existing development database. No new Neon branch. Overpayments remain blocked until credit/refund accounting exists, even if the older allow-overpayment setting is enabled. Refunds, reversals, processor charges, receipt delivery and accounting reconciliation are future work.

Validation: automated tests cover exact cents, deposit/balance accounting, retries, changed retries, simultaneous submissions, partial deposits, payment rules, cancellation, expiry and tenant isolation. Existing booking/auth tests also run. Owner visual review follows preview publication.
