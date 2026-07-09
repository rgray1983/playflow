# PlayFlow Schema Audit

Last updated: 2026-07-07

## Purpose

This audit locks down the current Prisma schema before we build Company Settings V2.

The goal is to stop adding one feature at a time into `company-settings/page.tsx` and instead build the full Company Settings foundation against the existing schema.

## Current Schema Status

The current schema already supports the first major configurable PlayFlow sections:

| Company Settings Section | Schema Model / Location | Status |
|---|---|---|
| Business Profile | `Tenant` | Partially ready |
| Branding | `Tenant` | Partially ready |
| Admissions | `AdmissionType` | Ready |
| Memberships | `MembershipPlan` | Ready |
| Party & Event Types | `EventType` | Ready |
| Packages | `Package` | Ready |
| Add-Ons | `PartyAddOn` | Ready but naming should be reviewed later |
| Staff Roles | `StaffRole` | Ready |
| Staff Users | `Employee` | Ready for later |
| Waiver Settings | `Waiver` only | Needs settings model or Tenant fields |
| POS Settings | No dedicated model yet | Needs settings model or Tenant fields |
| Modules | No dedicated model yet | Needs model or Tenant JSON field |

## Tenant

Current Tenant supports:

- name
- slug
- timezone
- phone
- email
- website
- address1
- address2
- city
- state
- zip
- logoUrl
- primaryColor
- accentColor

### Recommendation

Tenant is good enough for Business Profile and basic Branding V1.

Later, consider adding:

- secondaryColor
- successColor
- warningColor
- dangerColor
- receiptFooter
- taxRate
- currency
- businessHours Json?
- moduleSettings Json?
- posSettings Json?
- waiverSettings Json?

For Company Settings V2, I recommend we add dedicated lightweight settings fields or models only if needed by the first working UI.

## AdmissionType

Status: Ready.

Purpose:

- Check-In admission choices
- POS admission products
- Reports
- Possibly calendar/open play blocks

Fields are appropriate:

- name
- description
- price
- color
- active
- tenantId

Decision:

Admissions keep colors.

## EventType

Status: Ready.

Purpose:

- Birthday Party
- Private Event
- Field Trip
- Camp
- Class
- Rental

Fields are appropriate:

- name
- description
- color
- active
- tenantId

Decision:

Event Types keep colors because they drive Calendar/Party visual identity.

## Package

Status: Ready.

Purpose:

- Basic Party
- Premium Party
- Private Event Package
- Field Trip Package

Fields are appropriate:

- eventTypeId
- name
- description
- price
- depositAmount
- guestLimit
- durationMinutes
- active
- tenantId

Decision:

Packages do not have colors.

Packages are pricing structures. Event Types own colors.

## MembershipPlan

Status: Ready.

Purpose:

- Monthly Unlimited
- Annual Membership
- Summer Pass
- Toddler Membership

Fields are appropriate:

- name
- description
- price
- billingInterval
- durationDays
- visitLimit
- autoRenewDefault
- active
- tenantId

Recommendation:

Memberships CRUD can be built directly against this model.

## PartyAddOn

Status: Usable, but naming should be reviewed later.

Purpose:

- Balloon Arch
- Balloon Columns
- Extra Time
- Pizza
- Face Painting

Current model name is `PartyAddOn`.

Recommendation:

For now, keep `PartyAddOn` to avoid schema churn.

Later, consider renaming to `AddOn` if we want the same add-ons available to POS, parties, events, and retail workflows.

Immediate Company Settings V2 can use the current `PartyAddOn` model.

Potential missing field:

- taxable Boolean @default(false)

If we want POS tax behavior later, add `taxable`.

## StaffRole

Status: Ready.

Purpose:

- Owner
- Manager
- Front Desk
- Party Host

Fields are appropriate:

- name
- description
- permissions Json?
- active
- tenantId

Recommendation:

Company Settings V2 can build Staff Roles CRUD directly.

## Employee

Status: Ready for Staff Users later.

Fields include both:

- staffRoleId
- role String?

Recommendation:

Use `staffRoleId` going forward.

Keep `role String?` temporarily for backward compatibility, but avoid building new features around it.

## Waiver Settings

Current schema supports waiver records but not waiver configuration.

Current Waiver fields are operational waiver records:

- signedAt
- expiresAt
- signature
- pdfUrl
- waiverText
- status

Recommendation:

Do not overload `Waiver` with global settings.

For Company Settings V2, use Tenant-level settings first if schema supports it, or create a future `WaiverSettings` model.

Suggested future model:

```prisma
model WaiverSettings {
  id                         String   @id @default(cuid())
  tenantId                   String   @unique
  requireWaiver              Boolean  @default(true)
  expirationDays             Int?
  autoCreateFamilyFromWaiver Boolean  @default(true)
  requireEmergencyContact    Boolean  @default(true)
  waiverText                 String?
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

## POS Settings

Current schema does not have dedicated POS settings.

Recommendation:

For Company Settings V2, POS Settings can be UI placeholder or saved later.

Suggested future model:

```prisma
model POSSettings {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  salesTaxRate    Decimal? @db.Decimal(5, 2)
  cashEnabled     Boolean  @default(true)
  cardEnabled     Boolean  @default(true)
  splitEnabled    Boolean  @default(true)
  giftCardsEnabled Boolean @default(false)
  receiptFooter   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

## Modules

Current schema does not have modules.

Recommendation:

Add modules during Company Settings V2 or immediately after.

Simplest future model:

```prisma
model TenantModule {
  id        String   @id @default(cuid())
  tenantId  String
  key       String
  enabled   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key])
  @@index([tenantId])
}
```

Initial module keys:

- admissions
- parties
- calendar
- pos
- memberships
- retail
- cafe
- camps
- classes
- field_trips
- rentals
- reports

## Immediate Build Recommendation

Do not change the schema yet except if we decide to add:

- TenantModule
- POSSettings
- WaiverSettings
- PartyAddOn.taxable

The current schema is already good enough to refactor Company Settings into separate components and complete:

- Admissions CRUD
- Packages CRUD
- Memberships CRUD
- Event Types CRUD
- Add-Ons CRUD using PartyAddOn
- Staff Roles CRUD

## Risk Notes

1. `company-settings/page.tsx` is already too large and should be refactored before adding more CRUD sections.
2. Approved shared components must not be resent unless changed intentionally.
3. `ColorPickerField.tsx` is locked.
4. API routes must match schema exactly.
5. Package color must not be reintroduced.
