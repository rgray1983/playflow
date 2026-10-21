import {scheduleDelivery} from "@/lib/communications/background";
import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedUser, assertSameOrigin, accessErrorResponse, AccessError } from "@/lib/auth/staff";
import { FormError } from "@/lib/waivers/signing";
import type { Parent, Tenant } from "@/generated/prisma/client";
type ParentContext = { user: Awaited<ReturnType<typeof getVerifiedUser>>; tenant: Tenant; parent: Parent | null };
const storage = new AsyncLocalStorage<ParentContext>();
export function getParentContext() { const context = storage.getStore(); if (!context) throw new Error("Parent context missing."); return context; }
export async function resolveParent(slug: string): Promise<ParentContext> {
  const user = await getVerifiedUser();
  const tenant = await prisma.tenant.findUnique({ where: {slug} });
  if (!tenant) throw new AccessError(404, "Business not found.", "NOT_FOUND");
  const parent = await prisma.parent.findFirst({where: {tenantId: tenant.id, authUserId: user.id}, include: {family: true}});
  if (parent && parent.family.status !== "ACTIVE") throw new AccessError(403, "Contact the venue about access to this family.", "FAMILY_ACCESS_REQUIRED");
  return {user, tenant, parent};
}
export function withParent<T extends (...args: never[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      const request = args[0] as Request;
      assertSameOrigin(request);
      const params = await (args[1] as {params: Promise<{slug: string}>}).params;
      const context = await resolveParent(params.slug);
      const response = await storage.run(context, () => handler(...args));
      response.headers.set("Cache-Control", "private, no-store");
      if(response.ok&&!["GET","HEAD","OPTIONS"].includes(request.method))scheduleDelivery(context.tenant.id);
      return response;
    } catch (error) {
      if (error instanceof FormError) return NextResponse.json({error: error.message}, {status: error.status});
      return accessErrorResponse(error);
    }
  }) as T;
}
