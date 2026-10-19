# Workflow review — October 19, 2026

## Changes made

- Corrected POS amount-entry reset after a cart change or refreshed product quote. The next touch digit replaces the recalculated exact amount instead of attempting to append another decimal digit. Register layout and existing checkout controls retained.
- Corrected misleading Modules badges: working Memberships and Retail no longer show an unexplained Off state. The page shows build readiness, remaining work and links to the corresponding real settings.
- Connected Company Settings → POS & Products to the existing product catalog/manager and Commerce settings. No duplicate payment/POS settings model or fake configuration switches were added.
- Made Company Settings navigation usable on narrow screens with a section selector, compact global navigation, flexible panels and a visible scrolling content area. The inert Preview Setup button now opens the module review.
- Membership plan deletion now disables the plan rather than deleting its row. This preserves legacy membership plan references and history; the UI calls this Disable. Existing membership eligibility still uses saved entitlements/legacy plans, not the catalog's selling-enabled flag.
- Added server validation for membership catalog names, monetary amounts, billing intervals, positive whole-number durations/limits, description lengths and boolean options. Invalid settings return useful 400 errors before Prisma writes instead of producing database errors or unusable plans. Clarified that the auto-renew preference does not activate recurring billing.

## Workflows reviewed

POS: multiple child/bill selections, additions/removal/clear, draft retail/custom quotes, server price revalidation, whole and partial/split collections, receipt references, stale balances, concurrency/idempotency and all-or-nothing membership activation.

Parties: parent agreements/child coverage, hold expiry, reservation overlap checks, confirmation, token separation, pending/cancelled link restrictions, guest RSVP waiver evidence and checked-in child coverage.

Parent portal: verified family/account scoping, immutable legal records, profile/child edits, waiver invalidation on identity changes, archive/restore, visit/member/bill/receipt history, printable HTML escaping and scrollable dialogs. New parent receipt checks verify family scoping and absence of cashier/internal metadata.

Company Settings: all 12 module definitions, actual settings components and API/model support. Full inventory, dependencies, acceptance criteria and recommended sequencing are in `docs/MODULE-COMPLETION-PLAN.md`.

## Verification and limits

Regression suite: 217 passing automated tests. Added checks cover invalid membership settings, safe disable and role enforcement, expired/cancelled/overlapping party confirmations, and parent receipt scoping/internal-field exclusion. TypeScript, focused lint and production build are checked before deployment.

Tests use synthetic in-memory fixtures. No shared customer forms were signed, messages sent, payments fabricated, Square charges attempted or existing records deleted. This pass requires no database migration or additional branch.

A cloud-browser attempt reached Vercel's preview sign-in screen. No authentication/protection settings were changed and no new account/session access was created. Signed-in visual acceptance and device-specific scrolling still require an authorized app browser session; source review, rendering checks and automated API tests are not represented as completed authenticated browser QA.
