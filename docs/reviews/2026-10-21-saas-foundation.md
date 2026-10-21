# PlayFlow SaaS foundation review — 2026-10-21

## Product direction

PlayFlow is the subscription software product. Palmetto Playhouse is its first business workspace, not the application's global identity. This was already stated in `docs/architecture/PLAYFLOW_ARCHITECTURE.md`; this review restores that direction to the implementation.

A business owner should create a PlayFlow login, verify their email, create their own business, subscribe to PlayFlow, configure services and forms, and authorize their Square seller account. They must never configure Vercel, Neon or a Square developer application.

## Implemented in this foundation pass

- `/start`: new business onboarding after verified account signup. No setup code is needed to create a new workspace. Existing staff and approved invitations retain their original business access.
- `/api/onboarding`: verified identity and same-origin checks; an atomic tenant, owner and commerce setup; one workspace per staff login; reserved/validated public slugs; real timezone validation; safe duplicate-request handling. A transaction-scoped account advisory lock serializes repeated submissions. Unique constraints handle competing slug claims. Ownership and roles never come from request fields.
- New businesses start without copied families, signed forms, products, admission prices, packages, staff, Square tokens or subscriptions. New commerce defaults do not assume a $100 deposit, automatic receipt email, or implemented refunds.
- Company Settings → Getting Started: business setup progress, owned portal address, Square configuration versus Sandbox testing, and explicit unavailable subscription billing. A configured item is not represented as legal approval or complete launch readiness.
- The dashboard uses tenant-scoped saved family/child/visit/party data. Sample revenue, people, activity, notification count and nonfunctional customization controls were removed. No financial-reporting or revenue number is fabricated.
- Staff shells display the active business name. The shared identity provider fetches staff identity once for staff pages and refreshes after a profile change. Parent screens have no Palmetto fallback name.
- Payment Providers describes merchant authorization. Missing platform configuration points to PlayFlow support, not a customer's developer console or secret setup. Each tenant keeps its own Square authorization.
- Business profile updates validate types, length, email, website scheme and timezone, and cannot change a tenant slug or owner.
- The legacy `/auth/setup` claim route remains available for support-led claims of existing businesses; it is not the new customer onboarding flow.

No database schema migration was needed. No Square account was replaced, payment initiated, customer email sent, business subscription activated, or Wix data changed in this pass.

## Boundary review

| Boundary | Current evidence | Remaining work |
| --- | --- | --- |
| Identity and email verification | Existing Neon Auth verified-user guard is used before onboarding DB work; unauthenticated/unverified cases tested | Browser-test signup, OTP delivery and password recovery with a fresh owner account |
| Business isolation | Tenant ID comes from staff/parent context; existing service tests reject foreign families, children, events and payments; new overview tests check every query uses the active tenant | Expand a real two-business acceptance run; assess composite tenant foreign keys / database policies before general availability |
| Workspace provisioning | New owner and commerce records created in one transaction; retries, rollback, slug conflict and attempted owner-ID injection covered | Production abuse limits, account lifecycle and later multiple workspaces per identity |
| Staff | Explicit approvals and preset OWNER/MANAGER/FRONT_DESK/PARTY_HOST permissions remain enforced | One staff workspace per login is an existing schema limit. Named StaffRole permission JSON is not the access policy; clarify or unify the two role systems before selling custom permission tiers |
| Square | Platform credentials remain deployment-level; seller authorization is per tenant+environment; first real Sandbox admission test completed and user confirmed Admission Paid | Live merchant acceptance tests, webhook delivery on a stable public endpoint, revoke/refresh/recovery testing, refunds/review handling and iPad reader handoff |
| Forms and parent booking | Palmetto forms are explicitly allow-listed; other businesses cannot sign Palmetto wording | Tenant-owned versioned forms and a publish/review workflow are a release blocker. Preserve each existing signed document's immutable wording |
| Dashboard | Real scoped counts and bounded lists, including local-day party windows; no fake revenue | Reconciled financial reports with Sandbox exclusion, adjustments/refunds and a specified accounting basis |
| Platform billing | Clearly NOT_AVAILABLE; no recurring charges or pretend subscription state | Implement the billing lifecycle below before selling access |
| Modules | Readiness catalog is explicit; new checklist does not claim modules can be switched on/off | Persist business preferences; enforce feature availability at server and navigation; separate plan entitlements from build readiness |

## Prioritized implementation sequence

### 1. Tenant-owned forms and customer activation

Add versioned form configuration for each tenant and form kind. Owners provide their own wording; never duplicate Palmetto legal text into another workspace. Validate and sign the exact published version, reject stale versions, and store the complete signed snapshot. Keep per-child coverage and existing valid historical forms intact. Enable parent booking only after the required business forms and booking rules are published.

Complete a second-owner signup → empty workspace → configuration → separate staff approval → own parent portal acceptance run. Test browser navigation on desktop and the actual iPad.

### 2. PlayFlow subscription billing

This is separate from venue memberships and customer payments. Do not reuse the `Membership` model or a tenant's Square seller tokens for PlayFlow subscription charges.

The implementation should include:

- A platform-owned plan catalog with explicit, approved monthly prices, currency, included features and any trial terms. No price is assumed by this review.
- One subscription record per tenant with provider customer/subscription IDs, normalized state, billing period, cancellation state and lifecycle timestamps. Plan entitlement comes from trusted server-side state.
- Hosted checkout and payment-method management billed by PlayFlow's own billing merchant account. Provider selection and plan prices remain owner decisions. Customers need no API credentials.
- A webhook inbox with unique provider event IDs, signature checks and retry-safe processing. Retrieve provider state to handle duplicate or out-of-order events. A browser success redirect never grants paid access by itself.
- A billing service that resolves TRIALING, ACTIVE, PAST_DUE, CANCELED and INCOMPLETE states, and applies an explicit grace/access policy.
- Billing-owner authorization. Staff must not change plans, subscription payment details or cancellation.
- Access rules that do not strand ongoing visits, pending customer payments, signed waivers or receipts when a subscription lapses. Keep billing/recovery/export available; agree on exactly which operations stop.
- Cancellation, renewal, failed-payment recovery, invoices, data export and retention behavior. Never silently delete venue records after cancellation.

Before implementation, Richie needs to choose the initial plan(s)/monthly price, any trial period, and how restrictive past-due access should be. Those choices do not block the onboarding foundation.

### 3. Complete in-person and booking payments

Implement the iPad Square POS app handoff for the existing Reader, with trusted payment reconciliation before marking a bill paid. Maintain the typed-card and cash/manual-external options. Test interruption/cancel/double-click/return paths on the actual iPad and Reader. Finish deposit → confirmation → host/guest invite rules, then automatic emails.

### 4. Launch operations

Use a stable production PlayFlow domain for customer links, OAuth callbacks and signed webhooks. Keep Vercel/Neon/Square developer setup in the platform runbook. Establish platform-admin/support roles, audit trails, monitoring, backup/restore drills, business export/offboarding, privacy/terms, abuse limits and reporting. Review tenant-specific pricing, module entitlements and operational capacity before opening public sales.

## Review steps for Richie

1. Open Company Settings → Getting Started in the existing Palmetto workspace. Review the status and confirm no setup claims it has started a PlayFlow subscription.
2. Open Dashboard. Counts and displayed guests/events should match the saved Palmetto data; sample revenue and example names are gone.
3. Open `/start` while signed in as the existing owner. It must identify the existing workspace, not create or replace it.
4. In a separate browser session, create a fresh verified owner login through `/start`. Create a uniquely named test business. It must have no Palmetto customers, prices, forms or Square connection.
5. Do not treat this build as a paid public launch: subscription billing and per-business form publication are still blockers.

## Validation for this pass

- All 265 automated tests pass, including new verified-owner, duplicate creation, transaction rollback, cross-business overview and profile validation cases.
- TypeScript and the Next.js production build pass.
- ESLint passes for new files and changed implementation files except `src/app/parties/page.tsx`, where the only edits are business-name wiring. That existing page still has its pre-existing effect/state and unescaped-apostrophe lint errors; they are not introduced by this pass.
- The exact account advisory-lock SQL and existing owner column were checked successfully on the original Neon development branch. No new branch, schema change or customer-data mutation was performed for this check.
- Browser acceptance for a fresh verified business owner and real second-business data isolation is still pending. Automated tests use isolated fixtures; they do not establish completed email delivery, a real SaaS subscription, live payment acceptance or reader hardware support.
