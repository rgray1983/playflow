# PlayFlow Component Library

Last updated: 2026-07-05

## Component Policy

Shared components should be built once and reused. Approved shared components are locked and should not be modified unless explicitly requested.

## Locked Components

### ColorPickerField

Path: `src/components/ColorPickerField.tsx`

Status: LOCKED

Purpose: reusable color selection control for all color settings.

Features:

- Compact swatch
- Manual HEX input
- Fixed-position popover
- Color grid
- Brand color swatches
- Recent color swatches
- Native color picker fallback

Do not resend or overwrite this component unless intentionally updating it.

## Planned Components

- PageHeader
- SectionCard
- EmptyState
- MoneyInput
- DurationInput
- ToggleSwitch
- ConfirmModal
- StatusBadge
- DataTable
- LogoUploader
- SearchBar

## Component Rules

1. Shared components live in `src/components`.
2. Feature-specific components live inside their feature folder.
3. Do not duplicate shared component logic.
4. Approved shared components are locked.
5. New shared components should be documented here.
