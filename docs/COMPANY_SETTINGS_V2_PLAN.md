# Company Settings V2 Implementation Plan

Last updated: 2026-07-07

## Goal

Build Company Settings V2 as a stable, scalable, database-driven settings system.

This sprint should stop the pattern of repeatedly rebuilding `company-settings/page.tsx`.

## Main Refactor

Current:

```txt
src/app/company-settings/page.tsx
```

Problem:

- Too much logic in one file
- Admissions CRUD and Packages CRUD live inside the page
- Future CRUD sections will make it fragile

Target:

```txt
src/app/company-settings/
  page.tsx
  components/
    CompanySettingsShell.tsx
    BusinessProfileSettings.tsx
    BrandingSettings.tsx
    ModulesSettings.tsx
    AdmissionsSettings.tsx
    MembershipsSettings.tsx
    EventTypesSettings.tsx
    PackagesSettings.tsx
    AddOnsSettings.tsx
    WaiverSettings.tsx
    POSSettings.tsx
    StaffRolesSettings.tsx
```

## API Routes To Build

```txt
src/app/api/admissions/route.ts       existing
src/app/api/packages/route.ts         existing
src/app/api/memberships/route.ts      new
src/app/api/event-types/route.ts      new
src/app/api/add-ons/route.ts          new
src/app/api/staff-roles/route.ts      new
src/app/api/business-profile/route.ts new
src/app/api/branding/route.ts         new
```

Optional later:

```txt
src/app/api/modules/route.ts
src/app/api/pos-settings/route.ts
src/app/api/waiver-settings/route.ts
```

## File Rules

Do not resend:

```txt
src/components/ColorPickerField.tsx
```

unless we intentionally update it.

Only send changed files.

## Section Build Order

### 1. Refactor Shell

Move settings tab navigation and page layout into a cleaner page.

No business logic inside the main page.

### 2. Move Admissions Into Its Own Component

Create:

```txt
src/app/company-settings/components/AdmissionsSettings.tsx
```

Preserve current working admissions CRUD and color picker.

### 3. Move Packages Into Its Own Component

Create:

```txt
src/app/company-settings/components/PackagesSettings.tsx
```

Preserve current packages CRUD.

No package color.

### 4. Add Memberships CRUD

Model:

```txt
MembershipPlan
```

Fields:

- name
- description
- price
- billingInterval
- durationDays
- visitLimit
- autoRenewDefault
- active

### 5. Add Event Types CRUD

Model:

```txt
EventType
```

Fields:

- name
- description
- color
- active

Use ColorPickerField.

### 6. Add Add-Ons CRUD

Model:

```txt
PartyAddOn
```

Fields:

- name
- description
- price
- active

If schema is updated later:

- taxable

### 7. Add Staff Roles CRUD

Model:

```txt
StaffRole
```

Fields:

- name
- description
- permissions
- active

Permissions can start as placeholder JSON or simple toggles later.

### 8. Business Profile

Model:

```txt
Tenant
```

Fields:

- name
- phone
- email
- website
- address1
- address2
- city
- state
- zip
- timezone

### 9. Branding

Model:

```txt
Tenant
```

Fields:

- logoUrl
- primaryColor
- accentColor

Use ColorPickerField.

### 10. Modules

Use placeholder UI until schema is finalized, or add TenantModule first.

## Regression Protection

Before delivering any Company Settings V2 files:

- Admissions still creates, edits, deletes, and preserves color.
- Packages still creates, edits, and deletes.
- Packages do not have a color field.
- ColorPickerField is not included in the zip unless intentionally modified.
- All API fields exist in schema.
- All JSX compiles.
- page.tsx is smaller after refactor.
- Each settings section lives in its own file.

## Expected Result

After Company Settings V2:

- The settings page is stable.
- Each configurable section has its own file.
- Future sections can be added without risking existing ones.
- Other app pages can begin consuming settings data.
