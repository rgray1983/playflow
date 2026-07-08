import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type CreateEventPayload = {
  eventTypeId?: string;
  packageId?: string;
  packageName?: string;
  title?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  guestOfHonor?: string;
  parentFirstName?: string;
  parentLastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  packagePrice?: number;
  depositAmount?: number;
  balanceDue?: number;
  depositStatus?: "pending" | "cash" | "card" | "waived";
  addOns?: {
    id: string;
    name: string;
    price: number;
  }[];
};

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({
    where: {
      slug: "palmetto-playhouse",
    },
  });

  if (palmettoTenant) return palmettoTenant;

  return prisma.tenant.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });
}

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status }
  );
}

function toDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0);
  }

  const parsed = Number(value);

  return new Prisma.Decimal(Number.isFinite(parsed) ? parsed : 0);
}

function parseEventDate(value: string | undefined) {
  if (!value) return new Date();

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function combineDateAndTime(dateValue: string | undefined, timeValue: string | undefined) {
  const date = parseEventDate(dateValue);
  const cleanTime = timeValue?.trim() || "12:00 PM";
  const parsed = new Date(`${date.toDateString()} ${cleanTime}`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed;
}

function addDuration(startTime: Date, minutes = 120) {
  return new Date(startTime.getTime() + minutes * 60 * 1000);
}

function toDepositStatus(value: CreateEventPayload["depositStatus"]) {
  if (value === "cash") return "CASH_COLLECTED";
  if (value === "card") return "CARD_COLLECTED";
  if (value === "waived") return "WAIVED";
  return "PENDING";
}

function toPaymentMethod(value: CreateEventPayload["depositStatus"]) {
  if (value === "cash") return "CASH";
  if (value === "card") return "CARD";
  return null;
}

function serializeParty(party: {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  packageName: string | null;
  guestOfHonor: string | null;
  depositAmount: unknown;
  depositStatus: string;
  depositMethod: string | null;
  balanceDue: unknown;
  notes: string | null;
  inviteToken: string | null;
  inviteUrl: string | null;
  timelineItems?: {
    id: string;
    title: string;
    body: string | null;
    icon: string | null;
    createdAt: Date;
  }[];
  guests?: {
    id: string;
    guestName: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    parentName?: string | null;
    status: string;
    waiverStatus?: string | null;
    waiverSignedAt?: Date | null;
    checkedInAt: Date | null;
  }[];
}) {
  return {
    id: party.id,
    eventNumber: party.eventNumber,
    title: party.title,
    eventDate: party.eventDate,
    startTime: party.startTime,
    endTime: party.endTime,
    status: party.status,
    packageName: party.packageName,
    guestOfHonor: party.guestOfHonor,
    depositAmount: Number(party.depositAmount ?? 0),
    depositStatus: party.depositStatus,
    depositMethod: party.depositMethod,
    balanceDue: Number(party.balanceDue ?? 0),
    notes: party.notes ?? "",
    inviteToken: party.inviteToken,
    inviteUrl: party.inviteUrl,
    timelineItems: party.timelineItems ?? [],
    guests: (party.guests ?? []).map((guest) => ({
      id: guest.id,
      guestName: guest.guestName,
      guestEmail: guest.guestEmail ?? null,
      guestPhone: guest.guestPhone ?? null,
      parentName: guest.parentName ?? null,
      status: guest.status,
      waiverStatus: guest.waiverStatus ?? "NEEDED",
      waiverSignedAt: guest.waiverSignedAt ?? null,
      checkedInAt: guest.checkedInAt,
    })),
  };
}


function createInviteToken() {
  return randomBytes(18).toString("base64url");
}

function createInviteUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/rsvp/${token}`;
}

async function nextEventNumber(tenantId: string) {
  const count = await prisma.party.count({
    where: {
      tenantId,
    },
  });

  return `EVT-${String(count + 1).padStart(6, "0")}`;
}

export async function GET() {
  try {
    const tenant = await getTenant();

    if (!tenant) {
      return NextResponse.json({ events: [] });
    }

    const events = await prisma.party.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        guests: {
          orderBy: {
            createdAt: "asc",
          },
        },
        timelineItems: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
      orderBy: {
        eventDate: "asc",
      },
    });

    return NextResponse.json({
      events: events.map(serializeParty),
    });
  } catch (error) {
    return jsonError(error, "Unable to load events.");
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();

    if (!tenant) {
      return NextResponse.json(
        { error: "No tenant found. Create a tenant before adding events." },
        { status: 400 }
      );
    }

    let body: CreateEventPayload;

    try {
      body = (await request.json()) as CreateEventPayload;
    } catch (error) {
      return jsonError(error, "Invalid event request body.", 400);
    }

    if (!body.eventTypeId) {
      return NextResponse.json({ error: "Event type is required." }, { status: 400 });
    }

    if (!body.packageId) {
      return NextResponse.json({ error: "Package is required." }, { status: 400 });
    }

    const parentFirstName = body.parentFirstName?.trim() || "";
    const parentLastName = body.parentLastName?.trim() || "";
    const customerName = `${parentFirstName} ${parentLastName}`.trim();

    if (!customerName) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }

    const eventDate = parseEventDate(body.eventDate);
    const startTime = combineDateAndTime(body.eventDate, body.startTime);
    const endTime = body.endTime
      ? combineDateAndTime(body.eventDate, body.endTime)
      : addDuration(startTime);

    const eventNumber = await nextEventNumber(tenant.id);
    const inviteToken = createInviteToken();
    const inviteUrl = createInviteUrl(inviteToken);
    const depositStatus = toDepositStatus(body.depositStatus);
    const depositMethod = toPaymentMethod(body.depositStatus);
    const depositAmount =
      body.depositStatus === "waived" ? new Prisma.Decimal(0) : toDecimal(body.depositAmount);
    const balanceDue = toDecimal(body.balanceDue);

    const event = await prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          tenantId: tenant.id,
          eventNumber,
          inviteToken,
          inviteUrl,
          eventTypeId: body.eventTypeId,
          packageId: body.packageId,
          title: body.title?.trim() || `${body.guestOfHonor || customerName} Booking`,
          eventDate,
          startTime,
          endTime,
          status: "CONFIRMED",
          packageName: body.packageName?.trim() || null,
          guestOfHonor: body.guestOfHonor?.trim() || null,
          depositAmount,
          depositStatus,
          depositMethod,
          balanceDue,
          notes: body.notes?.trim() || null,
        },
      });

      const addOns = body.addOns ?? [];

      for (const addOn of addOns) {
        await tx.partyAddOnItem.create({
          data: {
            tenantId: tenant.id,
            partyId: party.id,
            partyAddOnId: addOn.id,
            quantity: 1,
            unitPrice: toDecimal(addOn.price),
            totalPrice: toDecimal(addOn.price),
          },
        });
      }

      await tx.eventTimelineItem.createMany({
        data: [
          {
            tenantId: tenant.id,
            partyId: party.id,
            icon: "✓",
            title: "Booking Created",
            body: `${customerName} created ${eventNumber}.`,
          },
          {
            tenantId: tenant.id,
            partyId: party.id,
            icon: "✉",
            title: "Confirmation Email Queued",
            body: body.email
              ? `Confirmation will be sent to ${body.email}. RSVP link: ${inviteUrl}`
              : `No email address was entered. RSVP link created: ${inviteUrl}`,
          },
          {
            tenantId: tenant.id,
            partyId: party.id,
            icon: "🔗",
            title: "RSVP Link Generated",
            body: `Guest RSVP and waiver link created: ${inviteUrl}`,
          },
          {
            tenantId: tenant.id,
            partyId: party.id,
            icon: depositStatus === "WAIVED" ? "○" : "$",
            title: depositStatus === "WAIVED" ? "Deposit Waived" : "Deposit Recorded",
            body:
              depositStatus === "WAIVED"
                ? "Deposit was waived by staff."
                : `${depositMethod === "CASH" ? "Cash" : "Card"} deposit recorded for ${depositAmount.toFixed(2)}.`,
          },
        ],
      });

      if (depositMethod && depositAmount.greaterThan(0)) {
        await tx.eventPayment.create({
          data: {
            tenantId: tenant.id,
            partyId: party.id,
            amount: depositAmount,
            method: depositMethod,
            status: "PAID",
            notes: "Deposit collected during booking.",
          },
        });
      }

      return tx.party.findUniqueOrThrow({
        where: {
          id: party.id,
        },
        include: {
          guests: {
            orderBy: {
              createdAt: "asc",
            },
          },
          timelineItems: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    });

    return NextResponse.json({
      event: serializeParty(event),
    });
  } catch (error) {
    return jsonError(error, "Unable to create event.");
  }
}
