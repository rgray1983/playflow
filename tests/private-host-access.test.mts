import assert from "node:assert/strict";
import { mock, test } from "node:test";

const guestToken = "guest-invitation-secret";
const hostToken = "private-host-secret";
let createdTokens: { inviteToken?: string; hostToken?: string } = {};
const party = {
  id: "test-party",
  eventNumber: "TEST-1",
  title: "Test party",
  eventDate: new Date("2026-11-01T12:00:00Z"),
  startTime: new Date("2026-11-01T12:00:00Z"),
  endTime: new Date("2026-11-01T14:00:00Z"),
  packageName: "Test package",
  guestOfHonor: "Test child",
  notes: "",
  guestCount: 1,
  guests: [{
    id: "test-guest", guestName: "Test guest", parentName: "Test parent",
    guestEmail: "test@example.invalid", guestPhone: null,
    status: "EXPECTED", rsvpStatus: "ATTENDING", waiverStatus: "NEEDED",
    notes: null, declineReason: null, declinedAt: null, createdAt: new Date(),
  }],
};

// Match the database's unique-field lookup, rather than accepting any token.
mock.module("../src/lib/prisma.ts", {
  namedExports: {
    prisma: {
      tenant: { findUnique: async () => ({ id: "test-tenant" }) },
      party: {
        count: async () => 7,
        findUnique: async ({ where }: { where: { hostToken?: string; inviteToken?: string } }) => {
          if (where.hostToken === hostToken || where.inviteToken === guestToken) return party;
          return null;
        },
      },
      $transaction: async (callback: (tx: object) => Promise<unknown>) => callback({
        party: {
          create: async ({ data }: { data: typeof createdTokens }) => {
            createdTokens = data;
            return { id: "new-test-party" };
          },
          findUniqueOrThrow: async () => ({
            ...party, ...createdTokens, depositAmount: 0, balanceDue: 100,
            depositStatus: "PENDING", depositMethod: null, inviteUrl: null,
            timelineItems: [], payments: [], guests: [],
          }),
        },
        eventTimelineItem: { createMany: async () => ({ count: 4 }) },
      }),
    },
  },
});

const { GET: getHost } = await import("../src/app/api/rsvp/[token]/host/route");
const { GET: getGuest } = await import("../src/app/api/rsvp/[token]/route");
const { POST: createEvent } = await import("../src/app/api/events/route");

function context(token: string) { return { params: Promise.resolve({ token }) }; }
const request = new Request("http://localhost/test");

test("guest invitation cannot open the host dashboard", async () => {
  const response = await getHost(request, context(guestToken));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Host RSVP dashboard was not found." });
});

test("private host link returns planning data without exposing tokens", async () => {
  const response = await getHost(request, context(hostToken));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const body = await response.json();
  assert.equal(body.event.totals.attending, 1);
  assert.equal(body.event.attendingGuests[0].guestEmail, "test@example.invalid");
  assert.equal(body.event.hostToken, undefined);
  assert.equal(body.event.inviteToken, undefined);
});

test("unknown host token returns 404", async () => {
  assert.equal((await getHost(request, context("unknown-token"))).status, 404);
});

test("guest invitation still works and exposes no guest list or host secret", async () => {
  const response = await getGuest(request, context(guestToken));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.event.id, party.id);
  assert.equal(body.event.guests, undefined);
  assert.equal(body.event.attendingGuests, undefined);
  assert.equal(body.event.hostToken, undefined);
});

test("host token cannot be used as a guest invitation", async () => {
  assert.equal((await getGuest(request, context(hostToken))).status, 404);
});

test("new bookings generate independent guest and host secrets", async () => {
  const response = await createEvent(new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventTypeId: "test-event-type", packageId: "test-package",
      parentFirstName: "Test", parentLastName: "Parent",
      eventDate: "2026-11-01", startTime: "12:00 PM", balanceDue: 100,
    }),
  }));
  assert.equal(response.status, 200);
  assert.match(createdTokens.inviteToken ?? "", /^[A-Za-z0-9_-]{24}$/);
  assert.match(createdTokens.hostToken ?? "", /^[A-Za-z0-9_-]{24}$/);
  assert.notEqual(createdTokens.hostToken, createdTokens.inviteToken);
  assert.equal((await response.json()).event.hostToken, createdTokens.hostToken);
});
