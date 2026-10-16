# Sprint 006 — Staff authentication and business access

Status: In verification

## Scope

- Neon Managed Auth for email/password login, verification, password recovery,
  session restoration, and sign out.
- Staff API handlers validate verified identity and explicit staff approval.
- Staff pages redirect to sign in, email verification, or access approval.
- Owner setup requires a verified login and a server-configured one-time secret.
  A conditional transaction allows only the first owner claim for the business.
- Owners approve employee emails. A verified identity can link to exactly one
  approved record. Existing demo employees are not automatically approved.
- Owner, Manager, Front Desk, and Party Host roles have enforced permissions.
- Remove hard-coded business selection from staff APIs. Scope staff record reads,
  updates, deletes, event actions, guests, and booking references to that business.
- Public guest RSVP, private host links, and booking confirmation stay public.
- Preserve the existing application design. Add Staff Access to Company Settings.

## Permissions

| Action | Owner | Manager | Front Desk | Party Host |
| --- | --- | --- | --- | --- |
| Read operations | Yes | Yes | Yes | Yes |
| Settings | Yes | Yes | No | No |
| Bookings / party workflow | Yes | Yes | Yes | No |
| Record payments | Yes | Yes | Yes | No |
| Guest actions / incidents | Yes | Yes | Yes | Yes |
| Manage staff access | Yes | No | No | No |

Staff Roles remain descriptive/custom records; Staff Access controls enforced
login permissions. No role is inferred from a display name or client payload.

## Configuration

Use the existing Neon branch (all current data is development/test data).
Do not create another database branch for routine work.

Apply `20261016182000_staff_access/migration.sql`. Existing employees receive
`accessApproved=false`. No existing demo login is silently authorized.
The previously committed incident-report migration was also applied to the
existing database to resolve the missing table found in the initial audit.

Required server environment values: `DATABASE_URL`, `NEON_AUTH_BASE_URL`,
`NEON_AUTH_COOKIE_SECRET` (32+ random characters), `PLAYFLOW_SETUP_TOKEN`
(32+ random characters), and `PLAYFLOW_SETUP_TENANT_ID`.

Add exact deployed preview origins to Neon's trusted domains. Never expose
cookie secrets or setup codes through NEXT_PUBLIC variables, source code,
screenshots, or logs. Auth settings are configured for the preview branch;
the main Vercel deployment is not changed as part of this sprint.

## Owner onboarding

1. Create an account at `/auth/sign-up`.
2. At `/auth/verify`, request the email code and verify the email.
3. At `/auth/setup`, use the private owner setup code.
4. Company Settings → Staff Access approves additional staff emails.
5. Approved staff create accounts and verify the same email.

Anyone can create a login identity. Unapproved identities cannot read or write
business data. Owner setup is closed after the configured tenant has an owner.

## Verification

`npm test` covers direct signed-out access to every staff API method, verified
identity, approvals, deactivation, role restrictions, tenant ownership filters,
cross-site mutations, one-time owner setup, and guest/host link separation.

Database changes, deployed/browser checks, and any limitations are recorded
below before marking this sprint complete.
