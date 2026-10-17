# Sprint 009 — Live weekly calendar

Replace the demo week and sample bookings with a business-scoped calendar that uses real reservation times.

- Previous/next week, Today, a date picker, actual date-range headings and selected-day details.
- A guarded read-only `/api/calendar` endpoint fetches only overlapping reservations for the requested week, the next five future events and the saved event-type legend. The response excludes guest/contact records, invitation secrets and payment history.
- Business-timezone date and time labels, including correct 167/169-hour daylight-saving weeks. Calendar-day arithmetic does not use the viewing device's timezone.
- Pending holds remain visible until expiry. Cancelled bookings and expired holds are omitted without changing their records. Completed events remain in historical weeks; upcoming excludes them.
- Fractional-hour placement, daily segments for overnight bookings, separate lanes for overlapping reservations and a grid that expands for early/late events.
- Booking cards open the specific party. Saved event type names/colors replace name guessing. Empty/error states never invent sample bookings. Refresh and a 30-second refresh interval keep data current; superseded requests are aborted.
- Existing styling is retained, with scrolling in the calendar and detail column.

No database migration or account provisioning is required. Week view is the implemented view; month view, drag-and-drop/rescheduling and blackout-date editing remain separate features.

Validation: calendar tests cover date boundaries, leap years, business-local clock values, week filtering, overnight and midnight ends, overlap layout, expiry visibility, scoped API query windows, DST changes and invalid dates. Existing booking/payment/auth suites are also run. Owner visual review follows preview publication.
