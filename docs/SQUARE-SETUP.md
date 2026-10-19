# Square setup for PlayFlow

The shared checkout is available from POS, Check-In, staff booking completion, the party manager and parent booking deposits. Cash and externally collected payments use the existing ledgers. Secure card payments use Square Web Payments SDK fields and the Payments API. Square Terminal / reader hardware is a separate integration and is not included here.

## Server configuration

Configure these as protected Vercel environment variables, not in client code, Git, settings JSON or chat:

- `PLAYFLOW_APP_URL`: the stable HTTPS app origin, without a path. During current development use the release branch preview origin.
- `PAYMENT_TOKEN_ENCRYPTION_KEY`: one persistent random 32-byte key encoded as 64 hexadecimal characters. Back it up securely. Replacing this key makes existing encrypted authorizations unreadable.
- `SQUARE_SANDBOX_APPLICATION_ID` and `SQUARE_SANDBOX_APPLICATION_SECRET`: from the application's Sandbox OAuth settings.
- Later, `SQUARE_LIVE_APPLICATION_ID` and `SQUARE_LIVE_APPLICATION_SECRET`: the Production OAuth credentials for that application.
- `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY` and later `SQUARE_LIVE_WEBHOOK_SIGNATURE_KEY`: from each webhook subscription.

Redeploy after changing server variables. Application IDs are public identifiers; secrets, seller tokens and token encryption keys stay server-side. Access/refresh tokens and unfinished payment source tokens are encrypted with AES-256-GCM.

In the Square Developer Console, register this OAuth callback using the exact configured app origin:

`https://YOUR_APP_ORIGIN/api/payments/square/callback`

Configure `payment.created` and `payment.updated` webhooks separately for each environment:

- `https://YOUR_APP_ORIGIN/api/payments/square/webhook?mode=sandbox`
- `https://YOUR_APP_ORIGIN/api/payments/square/webhook?mode=live`

The entire URL, including the query string, is used for webhook signature verification. It must match Square's subscription URL exactly. The webhook must be reachable by Square without Vercel sign-in; the current protected preview needs a suitable public deployment path before webhook delivery can be verified. Do not disable deployment protection just to work around this. Immediate API responses and authenticated pending-payment checks can reconcile payments independently of webhook delivery.

OAuth scopes: `MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE ORDERS_READ ORDERS_WRITE`. No application fee is collected by PlayFlow. The API version is pinned to `2026-09-16`.

## Authorize a Sandbox seller

1. In the Square Developer Console, create a PlayFlow application.
2. Create a Sandbox seller test account with automatic authorization disabled. Open its Sandbox Dashboard and leave that session signed in.
3. In PlayFlow, open Company Settings → Payment Providers and select Sandbox.
4. Choose Connect Square Sandbox and approve the authorization.
5. Verify the connection and choose an active USD location that supports card processing.
6. Use Square's published test cards in secure checkout on development-only families and bookings.

The default Sandbox account is suitable for basic API experiments, but Square's OAuth walkthrough uses a separate seller test account to exercise explicit authorization.

## Verification before real use

The automated suite exercises synthetic payment responses. It does not establish that this Square application or seller account has been configured or that a real card was charged. Complete these connected-account checks before Live use:

- Successful Sandbox payment and receipt from each checkout entry point.
- Decline, partial payment, split payment, double-click and network retry.
- Reopen checkout after losing a response; use Square payments to check.
- Signed webhook delivery, duplicate webhook replay and matching seller/location/currency/amount.
- OAuth reconnect, access-token refresh, location change and disconnect.
- Parent ownership checks and signed rental agreement before deposit payment.
- Mobile layout, Square card-field interaction and staff sign-in in the protected preview.

## Changing to the venue's account

Sandbox and Live retain separate seller authorizations. Resolve all pending or review payments before changing the environment or disconnecting. In Live, authorize Palmetto Playhouse's seller account and verify its payment location. To replace an account in the same environment, disconnect it first, then connect the replacement.

Sandbox records carry `providerMode=sandbox`, and counter receipts are labeled Square SANDBOX. They are simulated ledger entries on development bookings, not real funds. Square references stay attached to their original checkout/environment when the connection changes. Resolve development bookings before launch; do not interpret their simulated balances as real customer balances or include Sandbox rows in live financial reporting.

## Payment recovery

A durable ProviderCheckout is reserved under the business lock before calling Square. It preserves the target bills, amount, environment, actor and idempotency key. Manual collection and voiding are blocked for the same targets while an attempt is pending or needs review. Retry uses that same Square idempotency key.

Only a COMPLETED payment with the exact reference, location, USD amount and no refund can post to the original ledger. Webhooks are signature-checked, then the payment is retrieved directly from Square before settlement. Duplicate responses settle once.

If payment succeeds after a hold expires or its saved rules change, the attempt is retained as REVIEW with its Square payment reference. Do not collect again. A manager must reconcile the funds and booking; refunds and automatic review resolution are not implemented. No automatic booking confirmation or email is introduced by this change.

## Primary references

- https://developer.squareup.com/docs/oauth-api/walkthrough
- https://developer.squareup.com/docs/oauth-api/refresh-revoke-limit-scope
- https://developer.squareup.com/docs/web-payments/take-card-payment
- https://developer.squareup.com/reference/square/payments-api/CreatePayment
- https://developer.squareup.com/docs/webhooks/step3validate
