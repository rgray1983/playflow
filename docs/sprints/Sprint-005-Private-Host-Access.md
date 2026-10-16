# Sprint 005 — Private host access

Status: Implemented; production rollout pending staff authentication

Guest invitations must not authorize access to the host RSVP dashboard.
Preserve the current UI and all existing guest invitation URLs.

## Scope

- Add an independent, unique Party.hostToken and backfill existing parties.
- Generate separate guest and host tokens for new bookings.
- Resolve host dashboards only by hostToken, with no inviteToken fallback.
- Open the private host link from Party Manager.
- Prevent caching of host responses and referrer leakage from host pages.

## Acceptance

- Guest tokens still load invitations and submit RSVPs.
- Guest tokens return 404 from the host endpoint.
- Private host tokens return the correct host dashboard.
- Unknown tokens return 404.
- Existing parties receive unique host tokens without changing guest tokens.
- TypeScript and production build pass; changed API files pass lint.
- Test migration on an isolated Neon branch and token access through route tests.

## Remaining release blocker

Internal APIs, including /api/events, still require staff authentication and
tenant authorization. Separate bearer links do not secure those APIs. Do not
describe this sprint alone as making PlayFlow safe for public production use.

## Deployment

Apply this additive migration before deploying code that selects hostToken.
Do not deploy or migrate production as part of this sprint's development work.
Existing shared host URLs based on guest tokens intentionally stop working;
staff must share the new host link from Party Manager.

## Verification — 2026-10-16

- Neon branch: `dev-release-foundation` (`br-lingering-math-at4d4nlr`).
- Applied the committed migration SQL in a transaction on that branch only.
- All 7 existing parties have unique host tokens; no host token equals its
  guest token. Guest-link fingerprints match production after the migration.
- `npm run test:host-access`: 6 passing route tests with a mocked Prisma client.
  Covers guest/host separation, unknown tokens, no-store headers, guest response
  privacy, and independent token generation when a booking is created.
- TypeScript, production build, changed API/layout/test lint, and diff checks pass.
- The existing repository-wide lint failures are outside this sprint.
- Live browser-to-database verification remains blocked: this workspace cannot
  reach Neon's PostgreSQL port (Prisma P1001). The Neon connector can access it.
- Production database and deployment remain unchanged. Vercel detailed project
  access currently returns 403 for the `gray-dev` team.

Run regression tests with Node.js 22.3+ (module mocks are experimental):

```bash
npm run test:host-access
```
