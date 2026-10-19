# Shared checkout and Square implementation review

## Delivered

- Approved POS layout retained with shared PaymentControls: Cash/Card, configured Split, amount entry, number pad, exact amount and Pay.
- Reusable wide CheckoutDialog carries a family and optional newly saved admission bill into the register.
- Check-In has a running selected admission subtotal and saved-bill sidebar. Saving admissions opens checkout automatically. Membership use, waiver proof and departure checkout retain their existing behavior.
- PartyCheckout reuses the payment controls for deposits and balances. Staff booking completion opens deposit checkout. Party-day snacks/custom charges use the linked family's register and retain separate itemized bills.
- Parent deposits can open Square card fields after the rental agreement, from booking completion or the saved booking in the portal. Parents cannot use that endpoint for staff counter sales or party balance payments.
- Company Settings → Payment Providers owns account authorization, Sandbox / Live selection, location choice, connection health and disconnect. Commerce Processor links to it rather than exposing another independent connection switch.
- Square OAuth, encrypted token storage/refresh, secure Web Payments SDK card fields, Payments API calls, durable payment attempts, signed webhook verification and pending-payment recovery.
- Amounts are verified against the same server domain rules before charging and before ledger settlement. COMPLETED payment reference, location, currency, exact amount and refund state are checked.
- Pending or REVIEW payments block another collection/void of the same target. Timeout retries reuse a durable idempotency key. Ledger posting is protected by the business lock and is idempotent.
- Sandbox entries preserve the environment and display a test label. Account changes preserve original payment references and environment.

## Validation

- 249 tests pass, including existing booking, waiver, visit, membership, counter, party-link and access checks.
- New tests cover payment encryption/tampering, webhook URL/body signatures, pending reservations, timeout recovery, concurrent duplicate settlement, declines, incomplete payments, mismatched funds, ledger review, stale environment/location, parent ownership, required agreement and invalid recovery IDs.
- Render checks verify that the register retains product categories, keypad, Cash/Card and Pay; shared controls retain Split when enabled; dialogs retain Close, mobile sizing and scrollable content.
- TypeScript and focused ESLint pass. Production Next.js build passes.
- Two additive migrations were applied to the existing Neon development branch: payment connection/checkout tables and nullable payment environment fields. Existing family, waiver, visit, booking and payment evidence was not rewritten.

## Not yet verified or enabled

No Square seller account or developer application credentials were available. No actual Square authorization, card field session, Sandbox charge, webhook delivery, token refresh or Live payment was executed. `docs/SQUARE-SETUP.md` lists the exact configuration and connected-account checks.

Authenticated browser/device walkthrough is still pending because the preview is protected by Vercel sign-in and app staff sign-in. Automated checks do not substitute for that walkthrough.

Square Terminal hardware, automatic booking confirmation/email, refunds and manager resolution of REVIEW attempts remain later work. A paid booking still follows the existing explicit confirmation process. Extras opened from a party retain their own family counter receipts rather than being silently merged into EventPayment.
