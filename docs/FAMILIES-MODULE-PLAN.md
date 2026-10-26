# Families module — implementation plan

Prepared October 25, 2026. The owner approved stages 1–4, now implemented: staff directory/profile editing; shared quick edits; full family history and manager portal assistance; guarded whole-family archive/restore. Owner decision: archiving is sufficient for the current release; permanent deletion is deferred.

## Purpose and boundaries

Families becomes the shared customer-record module for PlayFlow. It manages families, parents/guardians, children, contacts, portal access, and links to their activity and documents. Check-In, Bookings, POS and the Parent Portal reuse the same records and permitted editing services.

Families is a core dependency, not an optional business switch. Permissions control which staff can use its controls. Each business sees only its own customer records. Reusing a module does not give parent accounts staff privileges.

## Current foundation verified in the repository

- Family, Parent and Child are existing tenant-scoped models. Family has ACTIVE/INACTIVE/ARCHIVED status; Child has an active flag. Parents can have individual portal identities and multiple adults can belong to one family.
- Parent Portal already supports editing a parent's own profile, adding/editing children, and guarded child archive/restore. Staff can intake families/children and select records for check-in and booking; the Families module now adds a staff family editor.
- Existing profile validators reject invalid dates/phones and stale versions. Child identity corrections mark liability coverage as needing a new signature without rewriting signed wording or historical snapshots.
- Family-access tools already issue time-limited, single-use links to an existing parent with a matching verified account email. Email matching alone does not grant family access.
- Visits, memberships, parties, signatures, payment records and checkout attempts reference family members. Some database relationships cascade deletion, some retain nullable references, and others restrict deletion. A raw family-row deletion is not a finished erasure workflow.

## Location and page design

Add **Families** to the shared left navigation, after Dashboard and before Check-In. Use `/families` for the directory and `/families/[familyId]` for a family record. Add the routes to application authentication as well as navigation; displaying a link is not an access guard.

The directory supports paginated search by family name, adult/child name, contact email or phone. Default to active families, with explicit archived filters and an Add family action. Summaries show family members and useful operational flags; medical notes stay in the relevant child details rather than the search list.

Family detail areas:

| Area | Contents and actions |
|---|---|
| Overview | Family display name, parents/guardians, contact information, address and emergency contacts; clear Edit buttons on each applicable record |
| Children | Names, dates of birth, allergies/accessibility notes and waiver status; add/edit child and guarded child archive/restore |
| Activity | Visits, parties, memberships and permitted financial history, with links to the existing workflow; no duplicate payment ledger |
| Forms & waivers | Saved liability waivers and rental agreements, recorded versions/signatures, printable copies and existing guardian signing flows |
| Access & management | Portal connection status, authorized access-link assistance, change history, archive/restore and later privacy/deletion controls |

Keep primary edits visible. Put infrequent or destructive actions under Manage family with a specific action name and impact preview. Small screens use the same record areas with an accessible tab/section selector.

## Shared editing rules

- Reuse and generalize the current profile and child field validators. Keep one editing service with separate staff and parent authorization wrappers.
- Parent/guardian fields: first/last name, contact phone/email, relationship, address, emergency contact and emergency phone. These values belong to the selected adult; do not invent a shared household address that silently overwrites every adult.
- Family-level fields: display name and permitted internal family notes. Staff notes are not exposed through parent responses.
- Child fields: first/last name, DOB, allergies and medical/accessibility notes. Reuse existing validation and child coverage checks.
- Preserve the existing rule requiring a new child liability signature after substantive child name/DOB corrections. Show the effect before saving and return a clear Needs waiver action. Contact or medical-note corrections do not manufacture or silently alter a signature.
- Keep original signed documents, booking pricing/identity snapshots and historical attendance intact. Editing the current profile is not editing the document previously signed.
- Use version checks to prevent one session overwriting another. Update the profile and related coverage flags atomically, with the same business locks used by existing workflows where applicable.
- Store an audit entry identifying business, family/member, actor, time, action, changed field names and any required reason. Minimize duplicated sensitive values; do not copy complete medical notes, signatures or payment credentials into a general audit feed. Include audit data in the later privacy/deletion design.
- A contact-email correction is not an authentication-email change or a portal ownership transfer. Keep auth IDs, verified login email and business membership out of ordinary profile payloads. Invalidate unused claim links affected by a contact-email change; issuing replacement access remains a separate authorized action.

## Proposed default permissions

These defaults are implemented for stages 1–4. Permanent deletion remains a later policy-controlled workflow.

| Action | Owner / manager | Front desk | Party host | Parent account |
|---|---|---|---|---|
| Search/view family directory | Yes | Yes | Event roster only; no general family directory | Own linked family only |
| Edit ordinary contact/child details | Yes | Yes, with audit | No | Own profile and permitted family-child details |
| Create family / add child | Yes | Yes | No | Existing verified setup and own-family rules |
| Add another guardian to an existing family / manage portal access | Yes, explicit confirmation | Refer to manager | No | Keep current restrictions until shared-adult rules are decided |
| Archive/restore whole family | Yes, guarded | No | No | No whole-family archive in the initial release |
| Approve permanent deletion | Later policy-controlled workflow | No | No | May request it after the policy/workflow is implemented |

Introduce explicit family read/edit/manage permissions rather than assuming every approved staff login may change family ownership. Protect APIs and fields, not just buttons. Financial history/actions retain their existing payment permissions.

## Build sequence and acceptance

### Phase 1 — Family directory and staff editing

Build the authenticated directory/detail shell, scoped read/edit APIs, permission checks, audit records, profile/child editing dialogs and Add family/child actions. Reuse the current intake and signing components.

Acceptance: a front-desk employee can find a family and correct a phone number, emergency contact, DOB or allergy note. Edits persist, conflict handling works, required new waivers are flagged, and another business's records cannot be accessed. Signed documents and payments remain unchanged.

### Phase 2 — Quick edits inside daily workflows

Reuse the family finder and editor from Check-In, staff Bookings and POS. Add View family / Edit family shortcuts. Dialogs preserve the selected family, children, booking draft and register basket. Refresh the affected details after a successful edit and revalidate any financial/booking quotes through their existing services.

Acceptance: correct a contact detail during check-in or booking, then continue the same task without reselecting the household or losing the basket. The Parent Portal sees the permitted updated profile information.

### Phase 3 — Full family record and portal assistance

Connect the Activity and Forms areas to existing visit, booking, membership, document and financial history services. Make supported guardian/contact additions and access-link assistance available to managers from the family record. Company Settings can link to these controls instead of growing a separate customer editor.

Acceptance: manager can inspect the family history, view the stored agreement and assist the intended adult's portal connection. Staff cannot claim an account merely by changing a contact email. Parent responses never include staff-only notes or another family's data.

### Phase 4 — Whole-family archive and restore

Use reversible Family status changes and record archive/restore actor, time and reason. Preview blockers before applying the change: active visits, unresolved future hosted/guest parties, live memberships, unpaid bills and pending/review payment or refund attempts. Resolve those through their existing workflows; archive itself does not cancel bookings, refund money or cancel subscriptions.

Archive removes the family from default new-activity searches and prevents new visits/bookings/enrollments while preserving historical records and staff access. Explicitly test the effect on parent access: current parent authorization rejects inactive families, so initial whole-family restore is a staff action. Keep archived/history lookup and any required correction/reconciliation paths usable; do not strand existing money records. Restore the same record IDs and links instead of creating duplicates. Child archive/restore remains a separate, existing operation.

Acceptance: archive/restore is reversible, blockers are accurate, history remains readable, pending payments are not abandoned, and active/archived searches and portal behavior agree.

### Phase 5 — Privacy requests and permanent deletion (deferred)

Owner decision, October 26, 2026: reversible archiving is sufficient for now. Do not add permanent deletion to the active build scope. Revisit only for a specific privacy/data-removal need.

Implement after the unresolved policy decisions below are settled. Staff control belongs in Family → Access & management; parent controls belong in Parent Portal → Privacy & account. Distinguish requesting erasure from completed erasure. Do not ship an active Delete family control that only archives records or makes an undefined promise.

A deletion workflow should verify identity, show the exact family and affected adults/children, inventory linked data, show unresolved activity, and preview which data would be removed, anonymized or retained. Execution must be auditable, resilient to retries and checked for residual personal information. Keep original financial corrections within the payment workflow rather than rewriting totals to make deletion easier.

Decisions still required:

1. Distinguish leaving a shared family, deleting a business's family record, and closing a person's PlayFlow login. An identity may also belong to another business or be a staff account.
2. Decide which adult may request whole-family deletion, how other linked adults are handled, and what happens to remaining guardians/children. Do not silently delete another adult's account.
3. Decide how to handle signed documents, payment and incident records, any data retained and its duration. No retention rule or legal conclusion is chosen by this engineering plan.
4. Decide whether parents use immediate erasure in eligible cases or a reviewed request, and who resolves exceptions. Parent-facing wording must describe the actual behavior.
5. Define how backups, exported copies, audit data and a future Wix import interact with completed deletion, including preventing a later import/restore from silently recreating a deleted profile. Separate PlayFlow's data from independently held Square/Wix records.

Acceptance: approved test cases demonstrate the advertised deletion outcome across linked records and search/history surfaces; shared adults and other businesses retain the appropriate access; retries do not repeat destructive work; unresolved/retained data is disclosed accurately. No real family is deleted during automated tests.

## Implementation notes for the first stage

Suggested organization: `src/lib/families` for field validation, access, changes and lifecycle services; `src/components/families` for family finder, summary and edit dialogs; `/api/families` and scoped member endpoints for staff. Keep parent access under the existing verified parent wrapper while using the shared services.

Add audit/lifecycle schema only when its stage is implemented. Do not change deletion cascades or run destructive migrations as part of initial editing work. Use the original development database branch and preserve existing record IDs. Family ownership, account identity and immutable document fields are never accepted as ordinary editable fields.

Verification covers tenant/family ownership, staff and parent permissions, stale edits, original document preservation, coverage invalidation, audit scope, portal access assistance, archive blockers, and continuing check-in/booking/POS after quick edits. Perform a signed-in desktop/tablet walkthrough before considering each stage accepted; automated tests alone do not establish the complete front-desk experience.

## Recommended starting scope

Start with Phase 1, then Phase 2. This delivers the immediate need to help a parent at the counter while leaving shared-adult ownership and permanent erasure for a deliberate decision. Phases 3–4 are now implemented as described below. Phase 5 remains planned follow-up work.

## Stages 1 and 2 delivery — October 25, 2026

- Shared left-navigation directory, paginated family/adult/child/email/phone search, status filters, staff family detail, add family and add child. Existing inactive families are read-only.
- Shared contact, child and family metadata editors. Owner/Manager can edit internal notes; Front Desk can edit ordinary profile details; Party Host has no general Families access. Every API uses the authenticated business scope.
- Edit family dialogs in Check-In, staff Bookings (including the booking wizard) and POS. Refreshing an edit retains the workflow's selected children, booking choices or current basket.
- Version checks reject stale writes; staff request IDs replay safely. Profile/coverage updates and minimal field-name audit entries commit together. Parent profile/child edits also record their actor.
- Contact email changes preserve authentication IDs and invalidate unused claim links. Child identity corrections invalidate current liability coverage and flag upcoming guests without rewriting saved signature snapshots.
- Additive FamilyChange migration applied on the existing development database branch; no additional branch created.

Validation: 330 automated tests pass, including staff permissions, business/family scope, protected field rejection, contact-email/auth preservation, stale edit/replay handling, waiver corrections, safe parameterized search and bounded detail responses. TypeScript, changed-source lint and production build pass. Signed-in browser/tablet acceptance still requires the owner session; deployment protection prevents automated browser verification.

Owner acceptance: open Families, search by an adult/child/phone, correct contact details, and verify the same correction through Edit family in Check-In, Bookings and POS without losing the in-progress selection/cart. Confirm a child identity correction displays the new-waiver message and a corresponding recent change. Whole-family archive/delete, access assistance and full history tabs remain later stages.

## Stages 3 and 4 delivery — October 25, 2026

- Family history and saved forms reuse the parent history/document components with a staff-only scoped history endpoint. Sections include original signed forms/printable copies, visits, hosted bookings/guest attendance, memberships, receipts, party payments, Square checkout/refund status and archived children. Financial sections require existing payment permission. History remains readable when the family is archived.
- Access & management is restricted to Owner/Manager. Add guardian requires confirmation of the adult's authority, validated contact data and a fresh family version; it creates an unconnected adult, never an authentication identity. Existing business email matches require review instead of silently merging or transferring a family.
- Portal access links require confirmation of the intended adult and exact current contact email. Only the hash is stored; links expire after 30 minutes and are claimed through the existing verified-email, single-use flow. Replacement invalidates the previous link; raw tokens never enter the audit feed. Connected accounts cannot be reassigned. No access email is sent automatically. Company Settings links to these family controls; the old unconfirmed link-issuance POST is retired with a 410 guidance response.
- Archive/restore previews current status and blockers, requires the exact family display name and a manager reason, checks a fresh version, and rechecks blockers under the shared business lock when saving. The audit stores actor/time/action and manager-visible reason atomically. New status changes are idempotent; conflicting/stale requests are rejected.
- Blockers cover open-play and party check-ins, future hosted/guest parties, live/pending/paused memberships, unpaid counter bills, unbilled admissions (including unknown legacy amounts), party balances/deposits, unresolved legacy payment rows, and pending/review Square payments/refunds. Resolved records, expired holds, declined future guests and unrelated businesses/families do not block. Old Square target keys are checked as well as canonical payloads.
- Archive preserves family/member IDs, children statuses, auth IDs, signatures, attendance and financial records. It removes active search eligibility, pauses linked parent portal access and revokes unused claim links. Restore reactivates the same family/auth links without restoring individually archived children or reviving expired claim links. Existing new-visit/booking/enrollment guards remain; party restoration, workflow start, guest check-in and public RSVP now also respect archived hosting/guest families under the business lock. Financial review/refund paths remain independent of active-family lookup.
- Additive nullable FamilyChange.reason migration applied on the original development branch. No customer family was archived or restored by the agent.

Validation: 345 automated tests pass; TypeScript, changed-source ESLint, production build and diff checks pass. New tests cover every blocker category, manager permissions, explicit confirmations, guardian email duplication, contact/auth separation, token hashing/replacement, stale edits, replay/concurrency, route transaction rollback, archive/restore identity preservation, scoped bounded history, archived parent denial/restored access, and old invite/check-in/booking guards. Three read-only Postgres fixture scenarios verify the actual archive SQL against real schema types (all blockers; resolved/foreign records; legacy/review cases). Reproduce the SQL with `node --import tsx scripts/family-archive-sql-fixtures.mts`; the generated queries use CTEs and do not write records.

Signed-in desktop/tablet acceptance remains the owner check because the preview is protected. See `docs/reviews/2026-10-25-families-management.md`. This delivery does not add permanent erasure, automated access email delivery, membership/subscription cancellation, or financial reversal tools. Live memberships and unresolved money remain blockers until resolved through supported operations; archive never bypasses them.
