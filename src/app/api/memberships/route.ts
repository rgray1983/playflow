import {withStaff,getStaffContext,getStaffTenant} from "@/lib/auth/staff";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {membershipPlanFields} from "@/lib/settings/membership-plan";
import {FormError} from "@/lib/waivers/signing";
async function getTenant(){return getStaffTenant();}
function serializeMembershipPlan(plan: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  billingInterval: string;
  durationDays: number | null;
  visitLimit: number | null;
  autoRenewDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "",
    price: Number(plan.price ?? 0),
    billingInterval: plan.billingInterval,
    durationDays: plan.durationDays,
    visitLimit: plan.visitLimit,
    autoRenewDefault: plan.autoRenewDefault,
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();

  if (!tenant) return NextResponse.json({ memberships: [] });

  const memberships = await prisma.membershipPlan.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ memberships: memberships.map(serializeMembershipPlan) });
}


async function readBody(request:Request){try{return await request.json();}catch{throw new FormError("Invalid membership request.");}}
function failure(error:unknown){if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});throw error;}
async function handlePOST(request:Request){try{const fields=membershipPlanFields(await readBody(request));const membership=await prisma.membershipPlan.create({data:{tenantId:getStaffContext().tenantId,...fields}});return NextResponse.json({membership:serializeMembershipPlan(membership)});}catch(error){return failure(error);}}
async function handlePUT(request:Request){try{const body=await readBody(request),fields=membershipPlanFields(body);if(typeof body.id!=="string"||!body.id.trim()||body.id.length>100)throw new FormError("Choose a membership plan.");const membership=await prisma.membershipPlan.update({where:{id:body.id,tenantId:getStaffContext().tenantId},data:fields});return NextResponse.json({membership:serializeMembershipPlan(membership)});}catch(error){return failure(error);}}
async function handleDELETE(request:Request){const id=new URL(request.url).searchParams.get("id")?.trim();if(!id||id.length>100)return NextResponse.json({error:"Choose a membership plan."},{status:400});await prisma.membershipPlan.update({where:{id,tenantId:getStaffContext().tenantId},data:{active:false}});return NextResponse.json({ok:true,disabled:true});}
export const GET = withStaff("read",handleGET);
export const POST = withStaff("settings.write",handlePOST);
export const PUT = withStaff("settings.write",handlePUT);
export const DELETE = withStaff("settings.write",handleDELETE);
