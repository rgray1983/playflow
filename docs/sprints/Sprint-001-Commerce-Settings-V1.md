# Sprint 001 --- Commerce Settings V1

**Module:** Commerce\
**Status:** Complete (Baseline)\
**Priority:** Critical Foundation

------------------------------------------------------------------------

# Objective

Create the configurable Commerce Settings foundation that powers all
money-related workflows in PlayFlow.

This sprint establishes the "brain" for payments so future modules
(Party Manager POS, Walk-ins, Memberships, Retail, Gift Cards, etc.)
consume configuration instead of hard-coded rules.

------------------------------------------------------------------------

# Why We're Building This

Every venue operates differently.

Rather than embedding payment rules throughout the application, PlayFlow
centralizes them into a configurable Commerce module that can scale
across tenants, locations, event types, and future products.

------------------------------------------------------------------------

# Business Rules

-   Commerce Settings are the source of truth.
-   No payment processors are integrated yet.
-   Focus on configuration, not transaction processing.
-   Build reusable systems before feature-specific implementations.

------------------------------------------------------------------------

# Functional Requirements

## Payment Methods

-   Enable/disable payment methods.
-   Configure available methods for the tenant.

## Deposits

-   Configure default deposit behavior.
-   Support future expansion to package-specific rules.

## Taxes

-   Configure default tax behavior.
-   Prepare for tax profiles in a future sprint.

## Tips

-   Enable/disable tipping.
-   Store default tip preferences.

## Fees

-   Configure optional service and processing fees.

## Receipts

-   Store receipt footer/options.
-   Prepare for email/print receipts.

## Checkout Rules

-   Configure payment behavior and completion rules.

## Processor Placeholder

-   Store payment processor configuration for future integrations.

------------------------------------------------------------------------

# Acceptance Criteria

-   Commerce Settings page loads.
-   Settings save successfully.
-   Settings persist correctly.
-   Existing booking and party workflows continue to function.
-   No unrelated UI redesign.
-   Build passes.

------------------------------------------------------------------------

# Future Ideas

-   Tax Profiles
-   Location Overrides
-   Event Type Overrides
-   Package Overrides
-   Square Integration
-   Stripe Integration
-   Gift Cards
-   Store Credit
-   Coupons
-   Promo Codes
-   Automatic Deposit Capture
-   Refund Engine

------------------------------------------------------------------------

# Architecture Decisions

-   Commerce is a platform module, not just a POS page.
-   Future payment features must consume Commerce Settings rather than
    implement independent logic.
-   Configuration precedes implementation.

------------------------------------------------------------------------

# Codex Execution Rules

Repository: `rgray1983/playflow`

Branch: `master`

Implement only the approved sprint.

Before declaring completion:

1.  Pull latest master.
2.  Run `npm install` if needed.
3.  Run `npx prisma generate`.
4.  If the Prisma schema changed:
    -   Run `npx prisma db push` or `npx prisma migrate dev`.
    -   Never run `prisma migrate reset`.
5.  Run `npm run build`.
6.  Run `npm run dev`.
7.  Click-test the modified page(s) and API(s).
8.  Verify:
    -   No TypeScript errors
    -   No Prisma errors
    -   No missing table errors
    -   No HTTP 500 errors
9.  Push directly to `master`.
10. Summarize:

-   Files changed
-   Database commands run
-   Testing performed
-   Local verification steps

**Hard Rule:** If the Prisma schema changes, a successful build is not
enough. The database must be synchronized and the affected pages must be
tested before the sprint is considered complete.
