# Booking email activation

The application prepares holds, deposit/agreement-gated confirmations with distinct private host/shareable guest links, and reminders. New messages stay DRAFT unless the business explicitly enables communications and the platform sender is configured. Existing drafts need individual queue approval. No customer emails were sent during this implementation.

## Platform setup still needed

The current preview has PLAYFLOW_APP_URL but no RESEND_API_KEY, PLAYFLOW_EMAIL_FROM or CRON_SECRET. Values were checked by variable name only; no secrets were read or printed. Platform setup is done once for PlayFlow, not by each customer.

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
