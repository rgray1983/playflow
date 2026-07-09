# Sprint 004 — Responsive Scroll + Low-Resolution Layout Fix

**Module:** App Shell / Responsive Layout  
**Status:** Ready for Implementation  
**Priority:** High

---

# Objective

Audit and fix PlayFlow pages where content becomes inaccessible on lower-resolution screens because containers do not scroll correctly.

The immediate known problem areas are:
- Party Manager Payments section
- Party Manager right sidebar
- Possible Company Settings sections

The goal is to make all existing screens usable on smaller desktop/laptop resolutions without visually redesigning the app.

---

# Why We're Building This

PlayFlow is being tested by real users on different screen sizes. Some page sections currently use fixed-height or overflow-hidden layouts that can prevent users from scrolling to the bottom of important content.

This creates a serious usability issue: staff may be unable to access payment controls, sidebar details, settings fields, or save buttons.

---

# Business Rules

- Do not redesign unrelated UI.
- Do not change app functionality.
- Do not change business logic.
- Preserve the current visual style.
- Fix scrolling and layout accessibility only.
- Prefer reusable layout fixes over one-off hacks.
- Do not remove content to make things fit.
- Nothing should be inaccessible because a parent container refuses to scroll.

---

# Known Problem Areas

## Party Manager

Review and fix:
- Main content scroll area
- Payments card
- Incident card if affected
- Guest Check-In card if affected
- Timeline card if affected
- Right sidebar
- Header/content height calculations
- Nested scroll containers

Known symptoms:
- Payments section may not scroll all the way down on lower-resolution screens.
- Right sidebar may cut off content.

## Company Settings

Review and fix:
- Commerce Settings
- Other settings sections with tabs/cards/forms
- Save buttons
- Long setting forms
- Any page using fixed screen height plus nested overflow containers

## Other App Pages

Search for layout patterns that may cause the same issue:
- `h-screen`
- `overflow-hidden`
- `h-full`
- `max-h`
- `calc(100vh`
- nested `overflow-y-auto`

Fix only where content can become inaccessible.

---

# Technical Guidance

Common causes to look for:
- Parent containers using `overflow-hidden` while children need to scroll
- Fixed `h-screen` wrappers without internal scroll allowance
- Nested scroll areas with missing `min-h-0`
- CSS grid/flex children missing `min-h-0`
- Sidebars missing `overflow-y-auto`
- Scroll containers without enough bottom padding
- Header height calculations that break on lower resolutions

Preferred fixes:
- Add `min-h-0` to flex/grid parents where needed.
- Use `overflow-y-auto` on content regions that need scrolling.
- Preserve `h-screen` app shell only if internal regions scroll correctly.
- Add bottom padding where action areas are cut off.
- Avoid large visual/layout redesigns.

---

# Acceptance Criteria

- Party Manager Payments section can scroll to the bottom on lower-resolution screens.
- Party Manager right sidebar can scroll to the bottom.
- Company Settings long sections can scroll to the bottom.
- Save/action buttons remain reachable.
- No existing UI functionality is broken.
- No unrelated visual redesign.
- Build passes.
- No TypeScript errors.
- No HTTP 500 errors from changed pages.

---

# Testing Requirements

Test at normal desktop size and at smaller/lower-resolution sizes.

Minimum viewport tests:
- 1440 × 900
- 1366 × 768
- 1280 × 720

Click-test:
- Party Manager → Payments
- Party Manager → Sidebar
- Party Manager → Guest Check-In
- Party Manager → Incidents
- Company Settings → Commerce
- Company Settings → any long settings page

Verify that users can reach the bottom of every scrollable section.

---

# Likely Files

Codex should inspect the repo and determine exact files.

Likely areas:
- src/app/parties/[eventId]/page.tsx
- src/app/company-settings/page.tsx
- shared layout components if they exist
- app shell/sidebar files if they exist

Do not modify Prisma schema for this sprint.

---

# Future Ideas

- Create reusable scroll-safe layout components.
- Add a PlayFlow app shell component.
- Add responsive QA checklist to sprint template.
- Add screenshot/viewport test instructions for every sprint.

---

# Codex Execution Rules

Repository: `rgray1983/playflow`  
Branch: `master`

Implement ONLY Sprint 004.

Do not redesign unrelated pages.  
Do not change unrelated workflows.  
Do not create a new branch.  
Do not create a pull request.  
Push directly to `master` only after all checks pass.

## Before saying complete

1. Pull latest `master`.
2. Run `npm install` if dependencies changed.
3. Run `npx prisma generate`.
4. Do not change Prisma schema unless absolutely necessary.
5. Never run `prisma migrate reset`.
6. Run `npm run build`.
7. Run `npm run dev`.
8. Click-test changed pages at:
   - 1440 × 900
   - 1366 × 768
   - 1280 × 720
9. Verify:
   - No TypeScript errors
   - No Prisma errors
   - No missing table errors
   - No HTTP 500 errors
   - Payment content is reachable
   - Party Manager sidebar content is reachable
   - Company Settings long forms are reachable
10. Push directly to `master`.
11. Summarize:
   - Files changed
   - Layout patterns fixed
   - Viewports tested
   - Local verification steps

**Hard Rule:** This sprint is not complete until lower-resolution screens can reach the bottom of the affected content areas.
