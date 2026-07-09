# PlayFlow Database Notes

Last updated: 2026-07-05

## Database Philosophy

PlayFlow is multi-tenant. Business data must be tied to a tenant.

Use `tenantId` for configurable and operational records.

## Core Models

Important models:

- Tenant
- Family
- Parent
- Child
- Visit
- MembershipPlan
- Membership
- Waiver
- WaiverChild
- Party
- PartyGuest
- PartyAddOn / AddOn depending final schema naming
- Package
- AdmissionType
- EventType
- Employee
- StaffRole
- EmployeeTimeClock

## Admissions

AdmissionType powers Check-In, POS admissions, Reports, and possibly Calendar blocks.

Fields should include name, description, price, color, active, and tenantId.

## Event Types

EventType powers Calendar, Party & Events, and Reports.

Fields should include name, description, color, active, and tenantId.

## Packages

Package powers Party & Events, Party booking, and Party checkout.

Fields should include name, description, price, depositAmount, guestLimit, durationMinutes, active, and tenantId.

No color field.

## Membership Plans

MembershipPlan powers Membership Settings, Parent accounts, Check-In, POS, and Reports.

## Add-Ons

Add-ons should become configurable and reusable.

Examples: Balloon Arch, Balloon Columns, Extra Time, Pizza, Face Painting.

Fields should include name, description, price, taxable, active, and tenantId.

## Staff Roles

StaffRole should include name, permissions JSON, active, and tenantId.

Employee should reference StaffRole instead of only using a role string.

## Schema Validation Checklist

Before generating any API route:

- Verify model exists.
- Verify exact field names.
- Verify required fields.
- Verify relation names.
- Verify Decimal fields.
- Verify model client name, such as `prisma.package`.
