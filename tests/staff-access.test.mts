import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

type Identity = { id: string; email: string; name: string; emailVerified: boolean };
type Employee = { id: string; tenantId: string; authUserId: string | null; firstName: string; lastName: string; status: string; accessRole: string; accessApproved: boolean; staffRole: { active: boolean } | null };
const identity: Identity = { id: "identity-a", email: "staff@example.invalid", name: "Test Staff", emailVerified: true };
const approved: Employee = { id: "staff-a", tenantId: "business-a", authUserId: "identity-a", firstName: "Test", lastName: "Staff", status: "ACTIVE", accessRole: "OWNER", accessApproved: true, staffRole: null };
let user: Identity | null = null;
let employee: Employee | null = null;
let approvals: Employee[] = [];
let reads = 0;
let writes = 0;
let lastWhere: unknown;
let ownerClaimed = false;

mock.module("../src/lib/auth/server.ts", { namedExports: { getAuth: () => ({ getSession: async () => ({ data: user ? { user } : null, error: null }) }) } });
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: {
  employee: {
    findUnique: async () => { reads++; return employee; },
    findMany: async () => { reads++; return approvals; },
    updateMany: async () => { writes++; return { count: 1 }; },
  },
  package: { update: async ({ where }: { where: unknown }) => { writes++; lastWhere = where; throw Object.assign(new Error("not found"), { code: "P2025" }); } },
  party: { findUnique: async ({ where }: { where: unknown }) => { reads++; lastWhere = where; return null; } },
  $transaction: async (callback: (tx: object) => Promise<unknown>) => callback({
    tenant: { updateMany: async () => { const count = ownerClaimed ? 0 : 1; ownerClaimed = true; return { count }; } },
    employee: { create: async () => { writes++; return {}; } },
  }),
} } });

const { requireStaff, withStaff, getStaffContext } = await import("../src/lib/auth/staff");
const { hasPermission } = await import("../src/lib/auth/permissions");
const { POST: setupOwner } = await import("../src/app/api/staff/setup/route");
const { PUT: updatePackage } = await import("../src/app/api/packages/route");
const { POST: confirmParty } = await import("../src/app/api/events/[eventId]/confirm/route");

function reset() { user = null; employee = null; approvals = []; reads = 0; writes = 0; lastWhere = undefined; }
const req = (method = "GET", body?: object, origin?: string) => new Request("http://localhost/api/test", {
  method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(origin ? { origin } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

function routes(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? routes(join(directory, entry.name)) : entry.name === "route.ts" ? [join(directory, entry.name)] : []);
}
const apiRoot = resolve("src/app/api");
for (const file of routes(apiRoot)) {
  const relative = file.slice(apiRoot.length + 1);
  if (/^parent\//.test(relative)) { assert.ok(readFileSync(file,"utf8").includes("withParent("), `Parent API must declare parent guards: ${relative}`); continue; }
  if(relative === "payments/square/webhook/route.ts") { assert.ok(readFileSync(file,"utf8").includes("validSignature("),"Square webhook must verify its signature"); continue; }
  if(relative === "onboarding/route.ts") { assert.ok(readFileSync(file,"utf8").includes("getVerifiedUser("),"Workspace creation must require a verified identity"); continue; }
  if (/^(auth|rsvp|confirm-party)\//.test(relative) || relative === "staff/setup/route.ts") continue;
  const methods = [...readFileSync(file, "utf8").matchAll(/export const (GET|POST|PUT|DELETE|PATCH) = withStaff/g)].map((match) => match[1]);
  assert.ok(methods.length, `Staff API must declare guards: ${relative}`);
  const handlers = await import(file) as Record<string, (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>>;
  for (const method of methods) test(`${method} ${relative} denies direct signed-out requests`, async () => {
    reset();
    const response = await handlers[method](req(method), { params: Promise.resolve({ eventId: "foreign-party", guestId: "foreign-guest" }) });
    assert.equal(response.status, 401);
    assert.equal(reads, 0); assert.equal(writes, 0);
  });
}

test("unverified identity cannot query staff or claim an approval", async () => {
  reset(); user = { ...identity, emailVerified: false };
  await assert.rejects(requireStaff(), { code: "EMAIL_VERIFICATION_REQUIRED" });
  assert.equal(reads, 0); assert.equal(writes, 0);
});
test("new identities do not get a default business", async () => {
  reset(); user = identity;
  await assert.rejects(requireStaff(), { code: "STAFF_ACCESS_REQUIRED" });
});
test("deactivated and unapproved employees are denied", async () => {
  for (const changes of [{ status: "INACTIVE" }, { accessApproved: false }, { staffRole: { active: false } }]) {
    reset(); user = identity; employee = { ...approved, ...changes };
    await assert.rejects(requireStaff(), { code: "STAFF_ACCESS_REQUIRED" });
  }
});
test("only an explicitly approved unique email can claim a staff record", async () => {
  reset(); user = identity; approvals = [{ ...approved, authUserId: null }];
  const staff = await requireStaff(); assert.equal(staff.tenantId, "business-a"); assert.equal(writes, 1);
  reset(); user = identity; approvals = [{ ...approved }, { ...approved, tenantId: "business-b" }];
  await assert.rejects(requireStaff(), { code: "STAFF_ACCESS_REQUIRED" }); assert.equal(writes, 0);
});
test("party hosts cannot collect payments or edit settings", async () => {
  reset(); user = identity; employee = { ...approved, accessRole: "PARTY_HOST" };
  let invoked = false;
  const handler = withStaff("payments.write", async (request: Request) => { void request; invoked = true; return Response.json({ ok: true }); });
  assert.equal((await handler(req("POST"))).status, 403); assert.equal(invoked, false);
  assert.equal(hasPermission("PARTY_HOST", "settings.write"), false);
  assert.equal(hasPermission("MANAGER", "staff.manage"), false);
  assert.equal(hasPermission("OWNER", "staff.manage"), true);
  assert.equal(hasPermission("unexpected", "read"), false);
});
test("authorized handler receives the staff business context and cannot be cached", async () => {
  reset(); user = identity; employee = approved;
  const handler = withStaff("read", async () => Response.json({ tenantId: getStaffContext().tenantId }));
  const response = await handler(); assert.equal(response.status, 200);
  assert.equal((await response.json()).tenantId, "business-a");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("cross-site mutations are rejected before authentication or database work", async () => {
  reset(); user = identity; employee = approved;
  const handler = withStaff("settings.write", async (request: Request) => { void request; return Response.json({ ok: true }); });
  assert.equal((await handler(req("PUT", {}, "https://other.invalid"))).status, 403); assert.equal(reads, 0);
});
test("settings updates include tenant ownership even when given another business's ID", async () => {
  reset(); user = identity; employee = approved;
  const response = await updatePackage(req("PUT", { id: "foreign-package", name: "Changed" }));
  assert.equal(response.status, 404); assert.deepEqual(lastWhere, { id: "foreign-package", tenantId: "business-a" });
});
test("event actions cannot read a party outside the staff business", async () => {
  reset(); user = identity; employee = approved;
  const response = await confirmParty(req("POST"), { params: Promise.resolve({ eventId: "foreign-party" }) });
  assert.equal(response.status, 404); assert.deepEqual(lastWhere, { id: "foreign-party", tenantId: "business-a" }); assert.equal(writes, 0);
});
test("owner setup requires a verified login, correct secret, and an unclaimed tenant", async () => {
  reset(); process.env.PLAYFLOW_SETUP_TOKEN = "test-only-setup-secret-with-32-plus-characters"; process.env.PLAYFLOW_SETUP_TENANT_ID = "business-a";
  assert.equal((await setupOwner(req("POST", { setupCode: process.env.PLAYFLOW_SETUP_TOKEN }))).status, 401);
  user = identity;
  assert.equal((await setupOwner(req("POST", { setupCode: "wrong" }))).status, 403);
  ownerClaimed = false;
  assert.equal((await setupOwner(req("POST", { setupCode: process.env.PLAYFLOW_SETUP_TOKEN }))).status, 200);
  assert.equal(writes, 1);
  assert.equal((await setupOwner(req("POST", { setupCode: process.env.PLAYFLOW_SETUP_TOKEN }))).status, 409);
  assert.equal(writes, 1);
});
