# Booking email activation

The application prepares holds, deposit/agreement-gated confirmations with distinct private host/shareable guest links, and reminders. New messages stay DRAFT unless the business explicitly enables communications and the platform sender is configured. Existing drafts need individual queue approval. No customer emails were sent during this implementation.

## Platform setup still needed

The owner verified playflow-test.extngraphics.com in Resend and saved RESEND_API_KEY and PLAYFLOW_EMAIL_FROM for the testing preview. Presence and scope were checked by variable name only; no secret values were read or printed. CRON_SECRET and the scheduled trigger remain unconfigured. Platform setup is done once for PlayFlow, not by each customer.

1. Choose the PlayFlow sending domain/address and verify it in Resend. Connect a Resend sending API key as RESEND_API_KEY, and set PLAYFLOW_EMAIL_FROM to the verified sender. Store credentials as Vercel Secrets for the intended environment. Do not commit credentials or paste them into source.
2. Use a stable absolute HTTPS PLAYFLOW_APP_URL reachable by intended parents. The current branch preview uses Vercel authentication protection, which must be accounted for before customer invitations.
3. Configure a random CRON_SECRET and a scheduler that performs GET /api/jobs/communications with `Authorization: Bearer <CRON_SECRET>`. Run on a cadence appropriate to reminder timing and message volume (for example every 5 minutes); each invocation processes up to 3 due messages. More volume needs more frequent/larger processing within provider limits.
4. Choose a scheduler supported by the hosting plan. No Vercel cron schedule has been committed or enabled because the provider account/sender and scheduler configuration are incomplete. A configured secret alone is not evidence that a trigger is running.
5. In Company Settings → Communications, verify configuration status and enable the business's message rules deliberately. Prepare upcoming previews; existing drafts still need approval. Approve only an owner-controlled test recipient for delivery acceptance.
6. Verify a hold, a paid/signed confirmation, and a scheduled reminder. Check private host/shareable guest separation, timezone, provider acceptance and inbox receipt. Confirm cancellation/contact changes prevent stale links from being delivered. Then explicitly authorize broader delivery.

## Delivery behavior

The sender address is saved at first attempt; message body, recipient and provider key stay stable across retries. Transient provider/transport failures receive capped exponential backoff. Fresh sending leases cannot be stolen. Retries stop before the provider deduplication window expires and after the attempt ceiling; ambiguous outcomes become REVIEW. Definitive failed authorization/validation messages require an explicit bounded retry after setup is fixed. REVIEW is not automatically resent.

Processing filters disabled businesses and future/backoff messages, uses small isolated batches and checks the current contact, booking status, deposit and agreement before releasing confirmation links. Re-preparing upcoming parties updates unattempted reminder schedules but does not auto-queue old drafts.

SENT means Resend accepted the request. Inbox delivery, bounces and complaints are not tracked until a verified provider-event integration is added.

Primary provider reference: https://resend.com/docs/dashboard/emails/idempotency-keys

## Test delivery restriction

Missing PLAYFLOW_EMAIL_DELIVERY_MODE defaults to test mode. Vercel Preview deployments always enforce test mode, even if the mode is mistakenly set to live. Set PLAYFLOW_EMAIL_TEST_RECIPIENTS to exact comma-separated, approved test inbox addresses in the intended preview branch environment. An empty or malformed list blocks every recipient. The application never redirects messages for other families to a test inbox: their private links must not be exposed to another family.

The restriction applies when preparing, approving, processing, and delivering messages, including already queued messages and uncertain retries. Blocked messages do not consume delivery attempts. The processor excludes blocked addresses before selecting a batch, so they cannot starve approved test messages. Company Settings shows test status, approved inbox count, and blocked message controls. Changing the environment requires a new deployment. Live delivery requires explicit PLAYFLOW_EMAIL_DELIVERY_MODE=live on a non-preview deployment and separate authorization after acceptance testing.

No real emails have been sent as part of setup. Confirm the exact test recipient and delivery scope with the owner before an actual send. Sender branding and verified per-business reply-to addresses are the next configuration feature; the current sender is the platform environment value.
