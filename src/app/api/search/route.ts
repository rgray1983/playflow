import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SearchResult = {
  id: string;
  type: "Child" | "Parent" | "Family" | "Party" | "Employee";
  name: string;
  details: string;
  initials: string;
  meta?: {
    waiverStatus?: string;
    membershipStatus?: string;
    lastVisit?: string;
    totalVisits?: number;
  };
};

function getInitials(first?: string | null, last?: string | null) {
  const firstInitial = first?.trim()?.[0] ?? "";
  const lastInitial = last?.trim()?.[0] ?? "";

  return `${firstInitial}${lastInitial}`.toUpperCase() || "?";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: "palmetto-playhouse",
    },
  });

  if (!tenant) {
    return NextResponse.json({ results: [] });
  }

  const hasQuery = query.length > 0;

  const [children, parents, families, parties, employees] = await Promise.all([
    prisma.child.findMany({
      where: hasQuery
        ? {
            tenantId: tenant.id,
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            tenantId: tenant.id,
          },
      take: 8,
      include: {
        memberships: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        waivers: {
          include: {
            waiver: true,
          },
          take: 1,
        },
        visits: {
          orderBy: {
            checkedInAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            visits: true,
          },
        },
      },
    }),

    prisma.parent.findMany({
      where: hasQuery
        ? {
            tenantId: tenant.id,
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            tenantId: tenant.id,
          },
      take: 8,
      include: {
        family: {
          include: {
            _count: {
              select: {
                children: true,
              },
            },
          },
        },
      },
    }),

    prisma.family.findMany({
      where: hasQuery
        ? {
            tenantId: tenant.id,
            name: { contains: query, mode: "insensitive" },
          }
        : {
            tenantId: tenant.id,
          },
      take: 8,
      include: {
        _count: {
          select: {
            parents: true,
            children: true,
          },
        },
      },
    }),

    prisma.party.findMany({
      where: hasQuery
        ? {
            tenantId: tenant.id,
            title: { contains: query, mode: "insensitive" },
          }
        : {
            tenantId: tenant.id,
          },
      take: 8,
      orderBy: {
        eventDate: "asc",
      },
    }),

    prisma.employee.findMany({
      where: hasQuery
        ? {
            tenantId: tenant.id,
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { role: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            tenantId: tenant.id,
          },
      take: 8,
    }),
  ]);

  const results: SearchResult[] = [
    ...children.map((child) => {
      const membershipStatus = child.memberships[0]?.status ?? "MISSING";
      const waiverStatus = child.waivers[0]?.waiver.status ?? "MISSING";
      const lastVisit = child.visits[0]?.checkedInAt
        ? formatDate(child.visits[0].checkedInAt)
        : "No visits yet";

      return {
        id: child.id,
        type: "Child" as const,
        name: `${child.firstName} ${child.lastName}`,
        details: `Membership ${membershipStatus} • Waiver ${waiverStatus}`,
        initials: getInitials(child.firstName, child.lastName),
        meta: {
          waiverStatus,
          membershipStatus,
          lastVisit,
          totalVisits: child._count.visits,
        },
      };
    }),

    ...parents.map((parent) => ({
      id: parent.id,
      type: "Parent" as const,
      name: `${parent.firstName} ${parent.lastName}`,
      details: `${parent.family._count.children} child${
        parent.family._count.children === 1 ? "" : "ren"
      } • ${parent.phone ?? parent.email ?? "Contact info missing"}`,
      initials: getInitials(parent.firstName, parent.lastName),
      meta: {
        waiverStatus: "Family",
        membershipStatus: "Family",
        lastVisit: "View child records",
        totalVisits: parent.family._count.children,
      },
    })),

    ...families.map((family) => ({
      id: family.id,
      type: "Family" as const,
      name: family.name,
      details: `${family._count.parents} parent${
        family._count.parents === 1 ? "" : "s"
      } • ${family._count.children} child${
        family._count.children === 1 ? "" : "ren"
      }`,
      initials: "FM",
      meta: {
        waiverStatus: "Family",
        membershipStatus: family.status,
        lastVisit: "View family profile",
        totalVisits: family._count.children,
      },
    })),

    ...parties.map((party) => ({
      id: party.id,
      type: "Party" as const,
      name: party.title,
      details: `${party.status} • ${formatDate(party.eventDate)} • ${
        party.room ?? "Room TBD"
      }`,
      initials: "🎂",
      meta: {
        waiverStatus: "Party",
        membershipStatus: party.status,
        lastVisit: formatDate(party.eventDate),
        totalVisits: party.guestCount ?? 0,
      },
    })),

    ...employees.map((employee) => ({
      id: employee.id,
      type: "Employee" as const,
      name: `${employee.firstName} ${employee.lastName}`,
      details: `${employee.role ?? "Employee"} • ${employee.status}`,
      initials: getInitials(employee.firstName, employee.lastName),
      meta: {
        waiverStatus: "Employee",
        membershipStatus: employee.status,
        lastVisit: employee.role ?? "Employee",
        totalVisits: 0,
      },
    })),
  ];

  return NextResponse.json({
    results,
  });
}
