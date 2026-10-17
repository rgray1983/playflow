# Sprint 012 — Parent family management and saved records

The core parent portal now includes compact profile/child editing dialogs, child archive/restore, private saved forms with printable copies, upcoming/past booking views, scoped family history, and an account/password-recovery entry point and parent-context sign-out. It retains the existing booking wizard, child-specific waivers and separate host/guest links.

## Family management

Parents update their own name, phone, optional address, emergency contact and relationship to the children. Account email/bindings, family membership, staff permissions, staff notes, and source Wix identifiers are never accepted from editable profile fields. Sign-in email stays verified through the existing auth flow; account-email changes remain venue-assisted.

Parents may add/edit their family's children, including DOB, allergy and medical/accessibility notes. Changing name/DOB marks the child's prior valid liability coverage as revoked for new check-in/booking use and requires a new signature. Original waiver text, version, signature, signer and child snapshot remain unchanged; other children on the same document retain their coverage. Contact/notes changes do not invalidate coverage. Upcoming expected party attendance is marked as needing a waiver after identity edits; a replacement parent signature attaches the new child coverage. Already checked-in or historical attendance is not rewritten. Existing booking snapshots do not silently change with profile edits.

Archive changes only `Child.active`; it never deletes the child, signatures, attendance or history. Active visits, active/pending/paused memberships (including recorded auto-renewal), and upcoming non-declined party attendance must be resolved with the venue first. Archived children can be restored to the same ID from history. Updates serialize with reservation/signing operations through the tenant lock and require the current `updatedAt` token to avoid overwriting another session's edits.

## Records

The portal shows the latest valid child waiver and provides document access from child cards, rental agreements from booking cards, and a paginated saved-form list. Liability records are limited to the linked family. Rental agreements and party payments additionally require the requesting parent to be the booking's primary host. Documents show stored wording and signing metadata; printable HTML copies escape all stored/user text and include the original terms, optional photo choice, electronic-signature consent, child details, booking/price snapshot when present, and current recorded status. Opening the downloaded copy in a browser supports print/save-PDF without creating a new signature. No public historical PDF URLs or internal hashes are exposed.

Paginated history reads only actual PlayFlow visit, membership and party-payment records. Staff notes, payment processor identifiers, and internal billing/auth data are omitted. Archived children have a restore action. Empty sections do not invent data. Previous Wix records are not yet imported; the app says so. Membership purchase/renewal/billing, playtime photo gallery/uploads and consent withdrawal, Square checkout, emails, and the Wix data migration remain separate integrations/work. The staff walk-in flow still needs real visit persistence before it can generate new play history here.

## Validation

Tests cover profile field whitelists and verified bindings, stale-update rejection, child/family ownership, real DOB/phone validation, notes versus identity changes, atomic coverage invalidation, archive blockers and same-ID restore, signed-record ownership and original snapshot preservation, paginated private history, and HTML export escaping. Existing booking, calendar, payments, auth, RSVP and party-link suites remain in place. No real customer's agreement is signed or messages sent by automated tests. No schema migration, additional Neon branch, Wix write or new external dependency is required.
