# PlayFlow Decisions Log

Last updated: 2026-07-05

## Waivers are the intake source of truth

Waivers should create or update Family, Parent/Guardian, Children, Waiver records, and Party Guest records when connected to a party.

## Parent Portal comes after waiver intake

A parent account can be activated later using the email provided on the waiver.

## POS is general checkout only

The POS page should not include customer/party search by default.

## Party checkout belongs inside Party & Events

Party page → Open Party → Collect Balance.

## Packages do not have colors

Packages represent pricing structures. Event Types own calendar and visual identity.

## Event Types can have colors

Event Types appear on Calendar and need visual distinction.

## Admissions can have colors

Admissions may show in POS, Check-In, Calendar, or reports.

## ColorPickerField is locked

Path: `src/components/ColorPickerField.tsx`

Do not modify or resend unless intentionally updating it.

## Only changed files should be returned

Avoid overwriting stable files and causing regressions.

## Company Settings should be split into section components

`company-settings/page.tsx` should become a shell, not a giant CRUD file.

## Modules belong in Company Settings

Modules allow businesses to enable or disable major feature areas.

## Shared components become locked after approval

Examples: ColorPickerField, Sidebar, PageHeader, Modal, MoneyInput, ToggleSwitch.
