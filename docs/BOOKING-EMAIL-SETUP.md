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

## Shared branded booking designs

Holds, confirmations and reminders now use the same HTML email layout with the business's saved name, logo, primary/accent colors and contact details. The summary uses the actual saved party time, setup start, package/room, deposit state and balance snapshot; the portal remains the source for current payment information. Holds never include private host or guest links. Confirmed messages clearly separate the host-only access link from the invitation that the host shares with guests. Plain text is sent alongside HTML.

Company Settings → Communications includes a sample design selector and an individual saved-message preview. Both previews require settings.write in the current business, are sandboxed and uncached, and disable link navigation. Opening previews sends no email. PNG/JPEG/GIF logo uploads become inline CID attachments; HTTPS logo URLs are supported, while unsupported image formats fall back to the business name. Mail clients may still hide images.

The additive 202610270001_booking_email_design migration adds BookingMessage.presentation JSONB and was applied to the original development branch. HTML and inline attachments are frozen on preparation. Re-preparing messages upgrades legacy plain-text drafts/queued messages only if never attempted. Attempted legacy messages retain their original plain-text payload for stable provider idempotency. An optimistic updatedAt check on the delivery claim prevents concurrent upgrades from changing a payload mid-send. Existing SENT messages are never resent for a design change.

Validation: 394 automated tests cover the shared designs, escaping/unsafe URLs, test recipient restrictions, private-link separation, immutable retries, cross-business previews and signed-out route access. Desktop and narrow layout renderings were inspected with Palmetto's saved logo/colors. The build and changed-source lint checks pass. Real inbox rendering of the new HTML/CID email still needs an owner test; automated Chromium was unavailable in the workspace. Delivery remains limited to extngraphics@gmail.com in the preview. No design-test email was sent by the agent.

## Per-business wording editor

Company Settings → Communications → Edit and preview your email designs now provides a separate subject, introduction and optional closing for each of HOLD, CONFIRMATION and REMINDER. The subject is prefixed automatically with the business name. Plain text is escaped for HTML and preserves line breaks. The layout/status labels, hold warning/deadline, booking/payment summary, actions and private/shareable links remain controlled by PlayFlow. “Use default wording” loads defaults into the draft; Save applies them.

The editor uses the same renderer and sample data as the server design preview. Changes appear locally before saving; the preview has disabled links and a sandboxed iframe. Drafts persist across type switches and collapsing the editor. Saving applies to subsequently prepared messages, preserving existing message snapshots and uncertain-retry idempotency.

GET/PUT /api/communications/templates require settings.write and scope all database access to the authenticated business. Saves validate only the three editable fields, bound lengths, reject subject newlines/control characters, and use the tenant lock plus a revision digest to prevent silent concurrent overwrites. They preserve forms, module choices, other email types, and delivery/reminder settings. Updating delivery rules also preserves templates. No database migration is needed: wording lives under operationalSettings.communications.templates.

Template-only saves explicitly opt out of the staff mutation wrapper’s background email processing. Editing/previewing/saving never sends an email or enables delivery. Other staff mutations retain the existing processing behavior. The preview inbox allowlist is unchanged.

Validation: 405 automated tests pass, including real staff-wrapper authorization, cross-site rejection, concurrent saves, preservation of unrelated settings, no-dispatch behavior, escaping, and immutable saved messages. Changed-source lint and TypeScript checks pass. Signed-in editor interaction and inbox acceptance remain an owner check; no real template settings or booking messages were changed during automated tests.

## Scheduler activation check

The ordered owner-approved execution plan is docs/LAUNCH-CHECKLIST.md, with email automation active and the premium facelift before the sister's trial. Email automation is not yet marked complete.

A scheduler can first call authenticated GET /api/jobs/communications?dryRun=1. It checks authentication and sender configuration, returns processed:0, and never reads or processes the message queue. Missing/wrong authorization is rejected even for dry runs. Responses are private/no-store; processor failures return a generic retryable 503 without exposing provider details. Remove dryRun only after the intended deployment, schedule, recipient restriction and sender are verified.

Vercel Cron invokes production deployments, not branch previews. A frequent timer needs a compatible hosting plan (Hobby allows only daily execution). The current preview remains protected; no deployment protection was removed, no production promotion occurred, no paid service was enabled, and no scheduler or real-recipient delivery was activated. Verify the hosting plan and stable target before committing a frequent native cron schedule; an unsupported schedule can fail deployment. The scheduler's observed unattended execution remains a production-readiness checkbox.

References: https://vercel.com/docs/cron-jobs/manage-cron-jobs and https://vercel.com/docs/cron-jobs/usage-and-pricing
