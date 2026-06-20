import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.tenant.deleteMany({
    where: {
      slug: "palmetto-playhouse",
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Palmetto Playhouse",
      slug: "palmetto-playhouse",
      timezone: "America/New_York",
    },
  });

  const family = await prisma.family.create({
    data: {
      tenantId: tenant.id,
      name: "Gray Family",
      notes: "Pilot family record for PlayFlow testing.",
    },
  });

  const nicole = await prisma.parent.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      firstName: "Nicole",
      lastName: "Gray",
      email: "nicole@example.com",
      phone: "843-555-0102",
      city: "Hartsville",
      state: "SC",
      notes: "Test parent record.",
    },
  });

  await prisma.parent.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      firstName: "David",
      lastName: "Gray",
      email: "david@example.com",
      phone: "843-555-0101",
      city: "Hartsville",
      state: "SC",
      notes: "Test parent record.",
    },
  });

  const dava = await prisma.child.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      firstName: "Dava",
      lastName: "Gray",
      dateOfBirth: new Date("2017-06-14"),
      allergies: "None listed",
      medicalNotes: "No medical notes on file.",
      active: true,
    },
  });

  const membershipPlan = await prisma.membershipPlan.create({
    data: {
      tenantId: tenant.id,
      name: "Monthly Unlimited Play",
      description: "Recurring monthly unlimited open play membership.",
      price: "49.99",
      billingInterval: "MONTHLY",
      autoRenewDefault: true,
      active: true,
    },
  });

  const membership = await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      childId: dava.id,
      membershipPlanId: membershipPlan.id,
      name: "Monthly Unlimited Play",
      status: "ACTIVE",
      startsAt: new Date(),
      nextBillingAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      autoRenew: true,
      stripeCustomerId: "test_customer_placeholder",
      stripeSubscriptionId: "test_subscription_placeholder",
    },
  });

  await prisma.membershipPayment.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      membershipId: membership.id,
      amount: "49.99",
      status: "PAID",
      paidAt: new Date(),
      dueAt: new Date(),
      processor: "Test",
      processorPaymentId: "test_payment_001",
    },
  });

  const waiver = await prisma.waiver.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      signedById: nicole.id,
      status: "VALID",
      signedAt: new Date(),
      expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      signature: "Nicole Gray",
      waiverText: "Sample signed waiver for PlayFlow testing.",
    },
  });

  await prisma.waiverChild.create({
    data: {
      waiverId: waiver.id,
      childId: dava.id,
    },
  });

  await prisma.visit.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      childId: dava.id,
      checkedInAt: new Date(),
      status: "CHECKED_IN",
      visitType: "Open Play",
      notes: "Seeded active visit.",
    },
  });

  const balloonArch = await prisma.partyAddOn.create({
    data: {
      tenantId: tenant.id,
      name: "Balloon Arch",
      description: "Decorative balloon arch party add-on.",
      price: "75.00",
      active: true,
    },
  });

  const party = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      familyId: family.id,
      primaryParentId: nicole.id,
      title: "Dava Gray Birthday Party",
      eventDate: new Date("2026-06-20"),
      startTime: new Date("2026-06-20T12:00:00"),
      endTime: new Date("2026-06-20T14:00:00"),
      status: "CONFIRMED",
      packageName: "Birthday Party Package",
      guestCount: 12,
      room: "Main Party Room",
      depositAmount: "100.00",
      balanceDue: "200.00",
      notes: "Seeded test birthday party.",
    },
  });

  await prisma.partyAddOnItem.create({
    data: {
      tenantId: tenant.id,
      partyId: party.id,
      partyAddOnId: balloonArch.id,
      quantity: 1,
      unitPrice: "75.00",
      totalPrice: "75.00",
    },
  });

  await prisma.partyGuest.create({
    data: {
      tenantId: tenant.id,
      partyId: party.id,
      childId: dava.id,
      status: "EXPECTED",
      notes: "Birthday child.",
    },
  });

  await prisma.employee.createMany({
    data: [
      {
        tenantId: tenant.id,
        firstName: "Devin",
        lastName: "Test",
        email: "devin@example.com",
        role: "Owner",
        status: "ACTIVE",
      },
      {
        tenantId: tenant.id,
        firstName: "Chyanne",
        lastName: "Test",
        email: "chyanne@example.com",
        role: "Manager",
        status: "ACTIVE",
      },
    ],
  });

  console.log("Seed reset complete: Palmetto Playhouse test data recreated cleanly.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
