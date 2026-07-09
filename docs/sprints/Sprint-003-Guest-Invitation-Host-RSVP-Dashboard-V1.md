# Sprint 003 — Guest Invitation + Host RSVP Dashboard V1

**Module:** Party / RSVP  
**Status:** Ready for Implementation  
**Priority:** High

---

# Objective

Separate the guest-facing RSVP experience from the hosting parent’s planning experience.

The guest invite link should feel like a simple party invitation and only show the guest their own response options. The host parent link should become a private planning dashboard where the party owner can see who is coming, who declined, and any notes/reasons.

---

# Why We're Building This

The current RSVP page works functionally, but it exposes the guest list beside the form. That may be useful for the party owner, but it is not appropriate for invited guests.

This sprint improves privacy, makes the RSVP experience feel more like a real invitation, and gives hosting parents a better planning tool.

---

# Business Rules

- Guest invite links should not show the full guest list.
- Guest invite links should only allow a guest to respond for themselves.
- Host parent dashboard links may show RSVP totals, attending guests, declined guests, and optional notes.
- Keep the existing RSVP token/link behavior working unless a safer structure is needed.
- Do not redesign unrelated pages.
- Do not remove existing Party Manager RSVP functionality.
- Focus on the customer-facing RSVP brain and data flow.

---

# Functional Requirements

## Guest RSVP Invite Page

The guest-facing RSVP page should show invitation-style copy such as:

> Emma has invited you to their Birthday Party!

Include:
- Guest of honor
- Party date
- Party time
- Basic party/event details
- Two clear response buttons:
  - I’m coming!
  - Sorry, I can’t make it

## “I’m Coming!” Flow

When the guest selects **I’m coming!**:
- Reveal the RSVP / guest intake form.
- Collect the existing guest intake fields.
- Save guest response as attending / expected.
- Preserve waiver-related fields and behavior currently in RSVP V1.

## “Sorry, I Can’t Make It” Flow

When the guest selects **Sorry, I can’t make it**:
- Reveal an optional reason box.
- Allow guest to submit decline response.
- Save response as declined / not attending.
- Declined guests should not count as expected attendees.

## Host Parent Dashboard

Create a host-facing planning view that can be linked from the Party Manager or generated for the hosting parent.

It should show:
- Party details
- RSVP totals
- Attending guests
- Declined guests
- Optional decline reasons
- Basic planning counts to help with supplies/favors

This dashboard can be V1 simple. It does not need parent login yet unless the current app structure already supports it.

---

# Data Requirements

Use existing PartyGuest fields where possible.

If needed, add fields such as:
- rsvpStatus
- declinedAt
- declineReason

Do not overbuild. Only add schema fields required for clean data handling.

---

# API Requirements

Update or add API routes as needed for:
- Guest RSVP attending response
- Guest RSVP decline response
- Host RSVP dashboard data

Likely routes:
- src/app/api/rsvp/[token]/route.ts
- possible new host RSVP route if needed

---

# UI Expectations

## Guest Page
- Simple, friendly invitation feel.
- No visible guest list.
- No internal operations language.
- Clear “I’m coming!” and “Sorry, I can’t make it” options.

## Host Dashboard
- Clean planning dashboard.
- Shows who is coming and who declined.
- Helps the hosting parent prepare for food, supplies, favors, and expected attendance.

---

# Likely Files

- src/app/rsvp/[token]/page.tsx
- src/app/api/rsvp/[token]/route.ts
- src/app/parties/[eventId]/page.tsx
- src/app/api/events/route.ts
- prisma/schema.prisma (only if required)
- possibly new host dashboard page/API route

---

# Acceptance Criteria

- Guest RSVP page no longer shows the full guest list.
- Guest can choose “I’m coming!” and submit RSVP form.
- Guest can choose “Sorry, I can’t make it” and submit optional reason.
- Declined RSVP is saved.
- Host parent dashboard shows attending and declined responses.
- Party Manager still works.
- RSVP links still work.
- Build passes.
- No unrelated visual redesign.

---

# Future Ideas

- Host parent authentication
- Host parent share link
- RSVP reminder emails
- RSVP deadline
- Meal / allergy planning
- Party favor count
- Guest message to birthday child
- Parent mobile dashboard
- Invite resend
- SMS RSVP

---

# Codex Execution Rules

Repository: `rgray1983/playflow`  
Branch: `master`

Implement ONLY Sprint 003.

Do not redesign unrelated pages.  
Do not change unrelated workflows.  
Do not create a new branch.  
Do not create a pull request.  
Push directly to `master` only after all checks pass.

## Before saying complete

1. Pull latest `master`.
2. Run `npm install` if dependencies changed.
3. Run `npx prisma generate`.
4. If Prisma schema changed:
   - Run `npx prisma db push` or `npx prisma migrate dev`.
   - Never run `prisma migrate reset`.
5. Run `npm run build`.
6. Run `npm run dev`.
7. Click-test:
   - Guest RSVP invite page
   - “I’m coming!” flow
   - “Sorry, I can’t make it” flow
   - Host RSVP dashboard
   - Party Manager RSVP link access
8. Verify:
   - No TypeScript errors
   - No Prisma errors
   - No missing table errors
   - No HTTP 500 errors
   - Guest list is not visible on guest invite page
   - Declined guests do not count as expected attendees
9. Push directly to `master`.
10. Summarize:
   - Files changed
   - Database commands run
   - Testing performed
   - Local verification steps

**Hard Rule:** If the Prisma schema changes, a successful build is not enough. The database must be synchronized and the affected pages must be tested before the sprint is considered complete.
