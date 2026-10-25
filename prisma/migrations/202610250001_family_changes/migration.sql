CREATE TABLE "FamilyChange" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT,
 "familyId" TEXT NOT NULL REFERENCES "Family"("id") ON DELETE RESTRICT,
 "memberId" TEXT, "actorKind" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL,
 "action" TEXT NOT NULL, "changedFields" TEXT[] NOT NULL,
 "requestId" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "needsNewWaiver" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "FamilyChange_tenantId_requestId_key" ON "FamilyChange"("tenantId","requestId");
CREATE INDEX "FamilyChange_tenantId_familyId_createdAt_idx" ON "FamilyChange"("tenantId","familyId","createdAt");
