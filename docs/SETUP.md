# PlayFlow Setup Guide

This document describes how to set up a local PlayFlow development
environment.

------------------------------------------------------------------------

# Source of Truth

-   GitHub repository: `rgray1983/playflow`
-   Primary branch: `master`

Always pull the latest `master` before beginning work.

``` bash
git pull origin master
```

------------------------------------------------------------------------

# Prerequisites

-   Node.js 22+
-   npm
-   Git
-   PostgreSQL / Neon database
-   Prisma
-   VS Code (recommended)

------------------------------------------------------------------------

# Initial Installation

``` bash
git clone https://github.com/rgray1983/playflow.git
cd playflow
npm install
```

------------------------------------------------------------------------

# Environment Variables

**Do NOT commit `.env` to GitHub.**

Create a local `.env` file from `.env.example`.

Typical variables include:

``` text
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
PLAYFLOW_SETUP_TOKEN=
PLAYFLOW_SETUP_TENANT_ID=
NEXT_PUBLIC_APP_URL=
```

Only `.env.example` should be committed.

PlayFlow uses Neon Managed Auth. Generate independent random secrets of at
least 32 characters for the cookie secret and first-owner setup token. Add
the exact application origin to the Neon Auth trusted domains. The setup
tenant ID must identify the business receiving its first owner. Do not put
these secrets in NEXT_PUBLIC variables.

Create and verify an account, then use `/auth/setup` with the private setup
code. Owners approve staff emails in Company Settings → Staff Access. A new
login identity has no access to business data until explicitly approved.

The current original Neon branch is named `production`, but the owner has
confirmed all current records are development/test data. Use that branch for
routine development; a second database branch is not needed by default.

See Sprint 006 for enforced roles and preview configuration. Email code
delivery and password recovery must be exercised with the owner's own email
before marking owner onboarding verified.

------------------------------------------------------------------------

# Prisma

Generate the Prisma client:

``` bash
npx prisma generate
```

During active development, if the schema changes:

``` bash
npx prisma db push
```

or, when appropriate:

``` bash
npx prisma migrate dev
```

**Never run:**

``` bash
npx prisma migrate reset
```

unless you intentionally want to erase the development database.

------------------------------------------------------------------------

# Running PlayFlow

``` bash
npm run dev
```

Production build:

``` bash
npm run build
```

------------------------------------------------------------------------

# Development Workflow

1.  Pull latest `master`.
2.  Review the sprint specification in `/docs/sprints`.
3.  Implement only that sprint.
4.  If Prisma changes:
    -   Run `npx prisma generate`
    -   Run `npx prisma db push` or `npx prisma migrate dev`
5.  Run `npm run build`.
6.  Run `npm run dev`.
7.  Click-test the modified feature.
8.  Push to `master` only after all checks pass.

------------------------------------------------------------------------

# Codex Rules

Codex should:

-   Read the sprint specification before coding.
-   Use `master` as the source of truth.
-   Never redesign unrelated UI.
-   Never wipe the development database.
-   Never commit `.env`.
-   Verify there are:
    -   no TypeScript errors
    -   no Prisma errors
    -   no missing table errors
    -   no HTTP 500 errors

------------------------------------------------------------------------

# Project Documentation

``` text
/docs
├── architecture
├── decisions
├── specifications
├── sprints
├── NEXT.md
└── SETUP.md
```

------------------------------------------------------------------------

# Product Philosophy

-   Build the **brain** before the UI.
-   Make systems configurable instead of hard-coded.
-   Design for SaaS from the beginning.
-   Keep interfaces simple.
-   Every sprint begins with discussion and a written specification
    before implementation.
