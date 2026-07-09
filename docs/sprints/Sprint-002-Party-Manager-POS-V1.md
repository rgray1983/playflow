# Sprint 002 --- Party Manager POS V1

**Module:** Commerce\
**Status:** Ready for Implementation\
**Priority:** High

------------------------------------------------------------------------

# Objective

Implement the first production-ready payment workflow inside the Party
Manager.

The Payments card must use Commerce Settings as the source of truth and
allow staff to collect balances during a party.

------------------------------------------------------------------------

# Why We're Building This

Commerce Settings now defines how payments work. The Party Manager
should consume those settings instead of hard-coded payment logic. This
connects PlayFlow's commerce "brain" to day-to-day operations.

------------------------------------------------------------------------

# Business Rules

-   Do not redesign unrelated UI.
-   Reuse existing PlayFlow components and styling.
-   Use enabled payment methods from Commerce Settings only.
-   Focus on the application brain before processor integrations.
-   No refunds in this sprint.
-   No payment processor integration in this sprint.

------------------------------------------------------------------------

# Functional Requirements

## Payments Card

-   Show current balance due.
-   Payment Amount (default = remaining balance).
-   Payment Method dropdown from Commerce Settings.
-   Optional Notes field.
-   Submit Payment button.

## Successful Payment

-   Create EventPayment record.
-   Reduce balance due immediately.
-   Add Timeline entry.
-   Refresh payment history.
-   Show Paid state when balance reaches \$0.00.

## Payment History

Display: - Date / Time - Amount - Method - Notes - Staff (placeholder
until authentication exists)

## Workflow

-   Automatically focus/open Payments during the Payment stage.
-   Complete Party remains unavailable until Cleanup is complete.

------------------------------------------------------------------------

# API

Create:

POST /api/events/\[eventId\]/payments

Responsibilities: - Validate amount. - Validate payment method. - Create
payment. - Update balance. - Create timeline entry. - Return updated
party.

------------------------------------------------------------------------

# Likely Files

-   src/app/parties/\[eventId\]/page.tsx
-   src/app/api/events/\[eventId\]/payments/route.ts
-   src/app/api/events/route.ts
-   src/lib/commerce/\*

Only modify prisma/schema.prisma if absolutely necessary.

------------------------------------------------------------------------

# Acceptance Criteria

-   Payment saves successfully.
-   Balance updates immediately.
-   Payment history refreshes.
-   Timeline updated.
-   Commerce Settings respected.
-   Build passes.
-   No unrelated UI changes.

------------------------------------------------------------------------

# Future Ideas

-   Refunds
-   Split Payments
-   Tips
-   Cash Drawer
-   Receipt Printing
-   Gift Cards
-   Store Credit
-   Square Integration
-   Stripe Integration

------------------------------------------------------------------------

# Codex Execution Rules

Repository: rgray1983/playflow\
Branch: master

Implement ONLY this sprint.

Before saying complete:

1.  Pull latest master.
2.  Run npm install if needed.
3.  Run npx prisma generate.
4.  If Prisma schema changed:
    -   Run npx prisma db push or npx prisma migrate dev.
    -   Never run prisma migrate reset.
5.  Run npm run build.
6.  Run npm run dev.
7.  Click-test modified pages/APIs.
8.  Verify:
    -   No TypeScript errors
    -   No Prisma errors
    -   No missing table errors
    -   No HTTP 500 errors
9.  Push directly to master.
10. Summarize:

-   Files changed
-   Database commands run
-   Testing performed
-   Local verification steps

**Hard Rule:** If the Prisma schema changes, a successful build is not
enough. The database must be synchronized and the affected pages must be
tested before the sprint is considered complete.
