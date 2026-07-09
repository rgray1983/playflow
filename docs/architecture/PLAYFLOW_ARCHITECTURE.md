# PlayFlow Architecture & Development Standards

Last updated: 2026-07-05

## Product Vision

PlayFlow is a configurable SaaS operations platform for indoor play centers, party/event venues, family activity businesses, and similar businesses.

The product must be flexible enough that each business can make it feel like their own system without requiring custom code.

## Core Principles

1. Configuration over hardcoding.
2. Small focused files over giant pages.
3. Shared components are reused, not copied.
4. Approved shared components are locked unless intentionally revised.
5. Schema, API, and UI must match before code is delivered.
6. Every feature follows the same workflow: Plan, Schema, API, UI, Test, Lock.
7. Only changed files should be returned.
8. Do not overwrite stable files unnecessarily.
9. Avoid regressions by checking current files before editing.
10. Build for multi-tenant SaaS from the beginning.

## Multi-Tenant Rule

Every business-specific data model must be scoped by `tenantId`.

Examples: admissions, membership plans, event types, packages, add-ons, staff roles, POS settings, and waiver settings.

## Folder Structure

```txt
src/
  app/
    company-settings/
      page.tsx
      components/
        BusinessProfileSettings.tsx
        BrandingSettings.tsx
        ModulesSettings.tsx
        AdmissionsSettings.tsx
        MembershipsSettings.tsx
        EventTypesSettings.tsx
        PackagesSettings.tsx
        AddOnsSettings.tsx
        WaiversSettings.tsx
        POSSettings.tsx
        StaffRolesSettings.tsx
    api/
      admissions/route.ts
      memberships/route.ts
      event-types/route.ts
      packages/route.ts
      add-ons/route.ts
      business-profile/route.ts
      branding/route.ts
      modules/route.ts
      pos-settings/route.ts
      waiver-settings/route.ts
      staff-roles/route.ts
  components/
    ColorPickerField.tsx
    PageHeader.tsx
    SectionCard.tsx
    EmptyState.tsx
    ToggleSwitch.tsx
    MoneyInput.tsx
    DurationInput.tsx
    StatusBadge.tsx
    ConfirmModal.tsx
  lib/
    prisma.ts
    tenant.ts
```

## Company Settings Architecture

`src/app/company-settings/page.tsx` should only manage the page shell, settings navigation, active tab state, and rendering the selected settings component.

Each settings section should live in its own component file.

## API Standards

Each configurable feature gets its own route.

Example:

```txt
GET     /api/admissions
POST    /api/admissions
PUT     /api/admissions
DELETE  /api/admissions?id=
```

API route requirements:

1. Resolve tenant first.
2. Validate required fields.
3. Return JSON for every path, including errors.
4. Serialize Decimal values to numbers before returning.
5. Keep API field names aligned with Prisma schema.
6. Never send a field to Prisma that does not exist in the model.

## Schema Standards

Before creating or updating an API route:

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

## Shared Component Rule

Approved shared components are locked.

Current locked components:

- `src/components/ColorPickerField.tsx`

Locked means do not resend, overwrite, or modify it unless intentionally updating that component.

## Color Picker Standard

Any user-facing color setting must use `ColorPickerField`.

Color picker requirements:

- Compact swatch trigger
- Manual HEX input
- Floating popover
- Standard color grid
- Brand color swatches
- Recent color swatches
- Native color picker fallback

## Color Ownership Rules

Use colors for admissions, event types, calendar categories, statuses, and brand controls.

Do not add colors by default to packages. Packages are pricing structures; Event Types own visual identity.

## Company Settings Sections

Company Settings V2 should include:

1. Modules
2. Business Profile
3. Branding
4. Admissions
5. Memberships
6. Party & Event Types
7. Packages
8. Add-Ons
9. Waivers
10. POS Settings
11. Staff Roles
12. Staff Users later

## PlayFlow Modules

Modules let each business enable only what they need.

Initial modules: Admissions, Parties, Calendar, POS, Memberships, Retail, Café, Camps, Classes, Field Trips, Rentals, Reports.

Modules should control sidebar visibility, settings sections, feature availability, and future pricing tiers.

## CRUD Standard

Every CRUD section should include empty state, add button, create form, edit form, delete action, active toggle, loading state, error/success message, save button, and cancel button.

## Testing Checklist

Before delivering files:

- Prisma schema matches API fields.
- API route compiles.
- Page component compiles.
- No approved shared components overwritten.
- Existing working sections are preserved.
- JSX structure is valid.
- Only changed files are included.
- User can test with clear steps.
- Vercel build should not fail because of the change.

## Current Stable Decisions

- Waivers are intake source of truth for Families, Parents, Children, and future Parent Portal accounts.
- Party guest list starts empty and fills from waiver intake or existing child/family search.
- POS is general checkout only.
- Party checkout should be accessed from Party & Events.
- Packages do not have colors.
- Admissions can have colors.
- Event Types can have colors.
- ColorPickerField is locked.
