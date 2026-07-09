import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

type CreateIncidentPayload = {
  incidentType?: string;
  severity?: string;
  description?: string;
  staffMember?: string;
  guestName?: string;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function createIncidentId() {
  return `inc_${randomBytes(12).toString("hex")}`;
}

function normalizeIncident(row: {
  id: string;
  tenantId: string;
  partyId: string;
  incidentType: string;
  severity: string;
  description: string;
  staffMember: string | null;
  guestName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    partyId: row.partyId,
    incidentType: row.incidentType,
    severity: row.severity,
    description: row.description,
    staffMember: row.staffMember,
    guestName: row.guestName,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    const incidents = await prisma.$queryRawUnsafe<{
      id: string;
      tenantId: string;
      partyId: string;
      incidentType: string;
      severity: string;
      description: string;
      staffMember: string | null;
      guestName: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }[]>(
      `SELECT id, "tenantId", "partyId", "incidentType", severity, description, "staffMember", "guestName", status, "createdAt", "updatedAt"
       FROM "EventIncidentReport"
       WHERE "partyId" = $1
       ORDER BY "createdAt" DESC`,
      eventId,
    );

    return NextResponse.json({ incidents: incidents.map(normalizeIncident) });
  } catch (error) {
    return jsonError(error, "Unable to load incident reports.");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const body = (await request.json().catch(() => ({}))) as CreateIncidentPayload;
    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json({ error: "Restore this party before adding an incident report." }, { status: 400 });
    }

    const incidentType = cleanText(body.incidentType, "Incident") || "Incident";
    const severity = cleanText(body.severity, "LOW") || "LOW";
    const description = cleanText(body.description);
    const staffMember = cleanText(body.staffMember) || null;
    const guestName = cleanText(body.guestName) || null;

    if (!description) {
      return NextResponse.json({ error: "Incident description is required." }, { status: 400 });
    }

    const incidentId = createIncidentId();

    const incident = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO "EventIncidentReport" (id, "tenantId", "partyId", "incidentType", severity, description, "staffMember", "guestName", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', NOW(), NOW())`,
        incidentId,
        party.tenantId,
        party.id,
        incidentType,
        severity,
        description,
        staffMember,
        guestName,
      );

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "⚠",
          title: `${incidentType} Report Created`,
          body: guestName ? `${guestName}: ${description}` : description,
          metadata: {
            source: "party-manager",
            action: "create-incident-report",
            incidentId,
            incidentType,
            severity,
            staffMember,
            guestName,
          },
        },
      });

      const [createdIncident] = await tx.$queryRawUnsafe<{
        id: string;
        tenantId: string;
        partyId: string;
        incidentType: string;
        severity: string;
        description: string;
        staffMember: string | null;
        guestName: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }[]>(
        `SELECT id, "tenantId", "partyId", "incidentType", severity, description, "staffMember", "guestName", status, "createdAt", "updatedAt"
         FROM "EventIncidentReport"
         WHERE id = $1`,
        incidentId,
      );

      return createdIncident;
    });

    return NextResponse.json({ incident: normalizeIncident(incident) });
  } catch (error) {
    return jsonError(error, "Unable to create incident report.");
  }
}
