> Current activation status (October 27, 2026): Vercel durable workflows are the chosen preview scheduler; see the final section below. Reply inbox verification is confirmed. Resend callbacks are not activated: automatic approval review rejected sharing a preview-protection bypass key in the provider URL, and the unused key was revoked. Historical native-Cron setup notes below remain an alternative for a future production deployment.

# Booking email activation

The application prepares holds, deposit/agreement-gated confirmations with distinct private host/shareable guest links, and reminders. New messages stay DRAFT unless the business explicitly enables communications and the platform sender is configured. Existing drafts need individual queue approval. No customer emails were sent during this implementation.

## Platform setup still needed

The owner verified playflow-test.extngraphics.com in Resend and saved RESEND_API_KEY and PLAYFLOW_EMAIL_FROM for the testing preview. Presence and scope were checked by variable name only; no secret values were read or printed. CRON_SECRET, RESEND_WEBHOOK_SECRET and the scheduled trigger remain unconfigured. Platform setup is done once for PlayFlow, not by each customer.

1. Choose the PlayFlow sending domain/address and verify it in Resend. Connect a Resend sending API key as RESEND_API_KEY, and set PLAYFLOW_EMAIL_FROM to the verified sender. Store credentials as Vercel Secrets for the intended environment. Do not commit credentials or paste them into source.
2. Use a stable absolute HTTPS PLAYFLOW_APP_URL reachable by intended parents. The current branch preview uses Vercel authentication protection, which must be accounted for before customer invitations.
3. Configure a random CRON_SECRET and a scheduler that performs GET /api/jobs/communications with `Authorization: Bearer <CRON_SECRET>`. Run on a cadence appropriate to reminder timing and message volume (for example every 5 minutes); each invocation processes up to 3 due messages. More volume needs more frequent/larger processing within provider limits.
4. Choose a scheduler supported by the hosting plan. No Vercel cron schedule has been committed or enabled because the provider account/sender and scheduler configuration are incomplete. A configured secret alone is not evidence that a trigger is running.
5. In Company Settings → Communications, verify configuration status and enable the business's message rules deliberately. Prepare upcoming previews; existing drafts still need approval. Approve only an owner-controlled test recipient for delivery acceptance.
6. Verify a hold, a paid/signed confirmation, and a scheduled reminder. Check private host/shareable guest separation, timezone, provider acceptance and inbox receipt. Confirm cancellation/contact changes prevent stale links from being delivered. Then explicitly authorize broader delivery.

## Delivery behavior

The sender address is saved at first attempt; message body, recipient and provider key stay stable across retries. Transient provider/transport failures receive capped exponential backoff. Fresh sending leases cannot be stolen. Retries stop before the provider deduplication window expires and after the attempt ceiling; ambiguous outcomes become REVIEW. Definitive failed authorization/validation messages require an explicit bounded retry after setup is fixed. REVIEW is not automatically resent.

Processing filters disabled businesses and future/backoff messages, uses small isolated batches and checks the current contact, booking status, deposit and agreement before releasing confirmation links. Re-preparing upcoming parties updates unattempted reminder schedules but does not auto-queue old drafts.

SENT means Resend accepted the request. Separate delivery states are updated by signed provider events once the webhook integration is activated; see the delivery tracking section below.

Primary provider reference: https://resend.com/docs/dashboard/emails/idempotency-keys

## Test delivery restriction

Missing PLAYFLOW_EMAIL_DELIVERY_MODE defaults to test mode. Vercel Preview deployments always enforce test mode, even if the mode is mistakenly set to live. Recipient eligibility has two testing modes:

- Default allowlist mode: PLAYFLOW_EMAIL_TEST_RECIPIENTS contains exact comma-separated approved test inbox addresses. An empty or malformed list blocks all addresses unless database mode is explicitly enabled.
- Database mode: PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE=database automatically makes addresses on active families, active/approved staff and the current business contact eligible within that same business. Explicit test inboxes remain available too. Saved contacts need no parent-by-parent environment edits or approval. The owner requested and enabled this mode for the active branch preview on October 27, 2026.

Both modes preserve bounce/complaint suppression, booking prerequisites, business message-rule opt-in and private host/guest link separation. The application never redirects another family's message to a test inbox. Changing recipient eligibility does not approve existing DRAFT messages or prepare/send a bulk mailing.

The restriction applies when preparing, approving, processing, and delivering messages, including already queued messages and uncertain retries. Blocked messages do not consume delivery attempts. The processor excludes ineligible addresses before selecting its batch. Database mode uses correlated, business-scoped EXISTS checks before LIMIT 3, so unknown addresses cannot starve eligible contacts and the directory is not loaded into application memory. Company Settings shows test status, approved inbox count, and blocked message controls. Changing the environment requires a new deployment. Live delivery requires explicit PLAYFLOW_EMAIL_DELIVERY_MODE=live on a non-preview deployment and separate authorization after acceptance testing.

The owner confirmed initial test delivery. The agent has not sent real email during implementation. The approved preview recipient remains extngraphics@gmail.com; do not broaden recipients without authorization. The platform sender remains centrally configured; each business verifies its own Reply-To inbox in the app.

## Shared branded booking designs

Holds, confirmations and reminders now use the same HTML email layout with the business's saved name, logo, primary/accent colors and contact details. The summary uses the actual saved party time, setup start, package/room, deposit state and balance snapshot; the portal remains the source for current payment information. Holds never include private host or guest links. Confirmed messages clearly separate the host-only access link from the invitation that the host shares with guests. Plain text is sent alongside HTML.

Company Settings → Communications includes a sample design selector and an individual saved-message preview. Both previews require settings.write in the current business, are sandboxed and uncached, and disable link navigation. Opening previews sends no email. PNG/JPEG/GIF logo uploads become inline CID attachments; HTTPS logo URLs are supported, while unsupported image formats fall back to the business name. Mail clients may still hide images.

The additive 202610270001_booking_email_design migration adds BookingMessage.presentation JSONB and was applied to the original development branch. HTML and inline attachments are frozen on preparation. Re-preparing messages upgrades legacy plain-text drafts/queued messages only if never attempted. Attempted legacy messages retain their original plain-text payload for stable provider idempotency. An optimistic updatedAt check on the delivery claim prevents concurrent upgrades from changing a payload mid-send. Existing SENT messages are never resent for a design change.

Validation: 394 automated tests cover the shared designs, escaping/unsafe URLs, test recipient restrictions, private-link separation, immutable retries, cross-business previews and signed-out route access. Desktop and narrow layout renderings were inspected with Palmetto's saved logo/colors. The build and changed-source lint checks pass. Real inbox rendering of the new HTML/CID email still needs an owner test; automated Chromium was unavailable in the workspace. At the time of that design validation, delivery was limited to extngraphics@gmail.com; see the current database-recipient mode above. No design-test email was sent by the agent.

## Per-business wording editor

Company Settings → Communications → Edit and preview your email designs now provides a separate subject, introduction and optional closing for each of HOLD, CONFIRMATION and REMINDER. The subject is prefixed automatically with the business name. Plain text is escaped for HTML and preserves line breaks. The layout/status labels, hold warning/deadline, booking/payment summary, actions and private/shareable links remain controlled by PlayFlow. “Use default wording” loads defaults into the draft; Save applies them.

The editor uses the same renderer and sample data as the server design preview. Changes appear locally before saving; the preview has disabled links and a sandboxed iframe. Drafts persist across type switches and collapsing the editor. Saving applies to subsequently prepared messages, preserving existing message snapshots and uncertain-retry idempotency.

GET/PUT /api/communications/templates require settings.write and scope all database access to the authenticated business. Saves validate only the three editable fields, bound lengths, reject subject newlines/control characters, and use the tenant lock plus a revision digest to prevent silent concurrent overwrites. They preserve forms, module choices, other email types, and delivery/reminder settings. Updating delivery rules also preserves templates. No database migration is needed: wording lives under operationalSettings.communications.templates.

Template-only saves explicitly opt out of the staff mutation wrapper’s background email processing. Editing/previewing/saving never sends an email or enables delivery. Other staff mutations retain the existing processing behavior. Template saves do not change the platform recipient policy.

Validation: 405 automated tests pass, including real staff-wrapper authorization, cross-site rejection, concurrent saves, preservation of unrelated settings, no-dispatch behavior, escaping, and immutable saved messages. Changed-source lint and TypeScript checks pass. Signed-in editor interaction and inbox acceptance remain an owner check; no real template settings or booking messages were changed during automated tests.

## Scheduler activation check

The ordered owner-approved execution plan is docs/LAUNCH-CHECKLIST.md, with email automation active and the premium facelift before the sister's trial. Email automation is not yet marked complete.

A scheduler can first call authenticated GET /api/jobs/communications?dryRun=1. It checks authentication and sender configuration, returns processed:0, and never reads or processes the message queue. Missing/wrong authorization is rejected even for dry runs. Responses are private/no-store; processor failures return a generic retryable 503 without exposing provider details. Remove dryRun only after the intended deployment, schedule, recipient restriction and sender are verified.

Vercel Cron invokes production deployments, not branch previews. A frequent timer needs a compatible hosting plan (Hobby allows only daily execution). The current preview remains protected; no deployment protection was removed, no production promotion occurred, no paid service was enabled, and no scheduler or real-recipient delivery was activated. Verify the hosting plan and stable target before committing a frequent native cron schedule; an unsupported schedule can fail deployment. The scheduler's observed unattended execution remains a production-readiness checkbox.

References: https://vercel.com/docs/cron-jobs/manage-cron-jobs and https://vercel.com/docs/cron-jobs/usage-and-pricing


## Reply inboxes and provider delivery tracking — October 27

Company Settings → Communications now lets settings staff request a verification code for a business reply inbox and confirm it in the same page. The email address is normalized and rejects display names/multiple recipients/header characters. Preview verification uses the same recipient eligibility policy as bookings; in the active database mode an address saved under the current business is eligible automatically. Codes expire after 15 minutes, are stored only as a challenge-bound hash, allow five guesses and can be used once. Requests have a two-minute cooldown and five-per-business hourly limit, protected by the tenant row lock. An existing verified reply inbox remains active while a replacement is pending. Neither verifying nor reading these settings dispatches booking emails. A send with an uncertain response keeps its code usable if it actually arrived.

New booking attempts freeze Reply-To and correlation tags with the sender at first claim. Uncertain retries preserve that exact payload; attempted legacy messages retain their old payload without new tags/headers. First live attempts require a verified reply inbox. Approved preview testing remains available while the inbox is unverified. Business customers configure an inbox in PlayFlow; they never need a Resend account or backend credentials.

The additive 202610270002_email_delivery_tracking migration was applied to the original development database and adds reply verification, booking delivery state, minimal provider event receipts, tenant-scoped suppression records and a processor heartbeat. The provider ID is unique; the existing development records were checked for duplicates before applying the index.

POST /api/communications/webhook uses the official Svix verifier over the bounded raw body with RESEND_WEBHOOK_SECRET. Invalid/old signatures are rejected before database access. Event receipts deduplicate on svix-id. Events bind to the attempted message using provider ID or frozen message/tenant tags, with recipient and sender checks. Tags allow a valid event to reconcile an API response that was lost or has not returned yet. No caller-supplied tenant ID can redirect an event to another business. Unknown provider emails are acknowledged without storing them; no open/click tracking is stored.

Delivery states distinguish provider acceptance, delayed delivery, delivery to the recipient mail server, failure, bounce, provider suppression and spam complaint. Delivery is not proof of inbox placement or reading. Later/repeated acceptance or delay events cannot erase a delivery or hard failure; a complaint remains visible. Bounces, suppressions and complaints block subsequent booking delivery to that exact address for that business. There is deliberately no blind resend or automatic suppression-clearing control. Correct the family contact and use another channel; provider-account review is required before any future suppression removal policy. Dashboard attention and saved-message views show delivery problems and practical next steps.

### Platform activation still required (once for PlayFlow)

1. On a stable endpoint the provider can actually reach, register a Resend webhook at HTTPS_APP_ORIGIN/api/communications/webhook. Subscribe to email.sent, email.delivered, email.delivery_delayed, email.failed, email.bounced, email.suppressed and email.complained. Add its signing secret directly to the matching Vercel environment as sensitive RESEND_WEBHOOK_SECRET, then deploy. Do not paste the secret in chat or source. The current protected preview is not automatically reachable by Resend: do not disable protection across the app or claim events are active merely because a secret exists. Resolve deployment-specific protected access or activate on the planned public production route with signature verification preserved.
2. Verify an actual signed event appears in Resend and the same scoped booking record. Use the approved inbox for delivery acceptance. Test bounce/complaint state with signed local fixtures, not real recipients or deliberately generating a spam complaint against the shared sender.
3. Verify Palmetto's chosen reply inbox through the new controls. Use an inbox the tester controls. The original extngraphics@gmail.com test address remains eligible, and database mode also supports eligible saved addresses in the current business. Use a new approved booking email and actually Reply to verify the mail client chooses the business inbox. Do not infer reply routing from a previous email sent before this change.
4. Configure the CRON_SECRET and compatible unattended scheduler after choosing a reachable stable target. Native Vercel Cron is production-only and plan-limited. Every authenticated real run records started/completed/failed timestamps; dryRun=1 records nothing and never processes messages. A completed request means the queue processor ran, not that every email was delivered. Observe a due reminder arriving without a staff/parent mutation. No cron schedule or secret was activated by this change.

Validation: all 430 automated tests, changed-source lint and the production build pass. Tests use mocked provider calls and real Svix signing/verification fixtures; no actual email was sent. Browser/iPad interaction, real provider callbacks and unattended delivery remain acceptance work. Do not mark launch item 1 complete until its unchecked acceptance requirements are met.

Provider references: https://resend.com/docs/webhooks/verify-webhooks-requests, https://resend.com/docs/webhooks/event-types and https://resend.com/docs/api-reference/emails/send-email.


## Saved contacts in testing — owner-requested update

Only the branch preview was configured with PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE=database. Live delivery settings, scheduler activation and provider event credentials remain unchanged. Each eligibility check normalizes addresses and scopes parent/family, employee and business contact matches to the current tenant. Archived families, inactive/unapproved staff, unrelated historical email strings and another business's records do not grant eligibility. Reply inbox ownership still requires its one-time code; eligibility to receive transactional messages is separate from mailbox ownership verification. A new reply address must be verified again.

Shared recipient checks run at preparation, message approval/retry, processing, actual send and reply-inbox verification. The queue view uses one batched lookup for up to 100 displayed messages and explains why an unknown or suppressed address is blocked. New database contacts take effect without another deployment. Company Settings describes this as “Testing with saved business contacts.” Existing drafts remain individually queueable to avoid unexpectedly sending old previews.

Validation: all 440 tests, changed-source lint and the production build pass. A read-only PostgreSQL fixture verified active versus archived/inactive/unapproved and cross-business matching, plus filtering before the queue limit. No migration, real-contact record change or actual email send was needed for this update. Sign-in/email verification for parent accounts remains part of account security; recipients do not require platform staff to approve each booking email.


## Durable reminder scheduling and activation review

The active branch is configured with PLAYFLOW_EMAIL_AUTOMATION_MODE=workflow. Workflow SDK 5.2.3 is pinned; withWorkflow wraps the existing Next.js configuration. System environment access was enabled so the hosted runtime can use Vercel’s managed World/OIDC authentication. The existing proxy matcher already excludes Workflow’s internal .well-known routes. Normal staff/parent business APIs retain their authentication and tenant scope. No new external scheduler account, live-customer delivery mode or production promotion was introduced.

The additive 202610270003_durable_email_jobs migration was applied to the original development database. BookingMessage stores a worker claim key, run ID, scheduled-date snapshot, claim timestamp and scheduling-error code. A durable dispatcher claims ten eligible messages at a time using row locks/SKIP LOCKED, tenant scope, recipient policy and enabled business rules. It dispatches bounded batches and continues in another run before its event history grows large. Routine mutations skip starting an empty dispatcher when all existing messages already have jobs.

Each message job sleeps durably until the saved delivery/retry/lease time, then reads current data again. Claim keys invalidate obsolete runs when a reminder schedule changes. Cancelled/completed/rescheduled/changed-recipient bookings retire without sending. Actual sends use the existing deposit/agreement checks, suppression rules, bounded attempts, stable provider key and immutable payload. Scheduled retries do not require a parent or staff member to use the app. Exhausted worker/start failures are visible separately from provider delivery failures. “Retry automatic scheduling” resets only job registration for this business’s QUEUED/SENDING records, preserving message payload, sender/reply snapshots, provider idempotency and attempt history. REVIEW/FAILED/SENT messages cannot be blindly revived by this control.

Communications settings include “Run one-minute timer check” and “Refresh delivery status.” The settings-protected POST starts a tenant-specific durable sleep and versioned completion checkpoint. It sends no email and has a two-minute request cooldown. An older run cannot complete a newer check. A passed timer check proves a hosted wakeup, not actual email delivery; follow it with a valid approved test booking/reminder and confirm the matching provider/database state. The only existing reminder inspected during activation belongs to an already CANCELLED test party; do not reactivate it or fabricate a rental signature to make a send test pass. Use a fresh, normally completed test booking.

Resend’s connected plugin confirmed the verified sending domain and no existing webhooks. A dedicated project-protection access key was created for a callback at the stable branch alias, but automatic approval review rejected the provider registration: putting that key in the URL would disclose a privileged persistent credential to Resend. The callback request was not executed. The unused access key was then revoked successfully; no Resend webhook or RESEND_WEBHOOK_SECRET was created. Do not retry indirectly or disable protection to get around this decision. Request explicit approval for storing a dedicated Vercel project-access key in Resend’s private callback URL, explaining that it passes the project’s outer deployment gate while PlayFlow sign-in and signed-event verification remain enforced. Alternatively, obtain approval for an appropriate public signed callback target.

Validation: 456 automated tests, changed-source lint and the production build pass. Tests cover durable orchestration, scoped claim ownership, simultaneous dispatchers, future/backoff/fresh leases, obsolete booking cancellation, bounded failures, child-run continuation, timer checkpoint versioning and safe recovery. The actual claim query was also checked read-only against PostgreSQL. No actual email was sent by the agent. Hosted wakeup and real reminder/provider-callback/reply acceptance remain unchecked until observed.

References: https://workflow-sdk.dev/docs/getting-started/next, https://workflow-sdk.dev/worlds/vercel, https://vercel.com/docs/workflows/pricing and https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation.
