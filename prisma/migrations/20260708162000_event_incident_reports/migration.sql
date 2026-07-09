CREATE TABLE IF NOT EXISTS "EventIncidentReport" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "incidentType" TEXT NOT NULL DEFAULT 'Incident',
  severity TEXT NOT NULL DEFAULT 'LOW',
  description TEXT NOT NULL,
  "staffMember" TEXT,
  "guestName" TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventIncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventIncidentReport_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EventIncidentReport_tenantId_idx" ON "EventIncidentReport"("tenantId");
CREATE INDEX IF NOT EXISTS "EventIncidentReport_partyId_idx" ON "EventIncidentReport"("partyId");
CREATE INDEX IF NOT EXISTS "EventIncidentReport_incidentType_idx" ON "EventIncidentReport"("incidentType");
CREATE INDEX IF NOT EXISTS "EventIncidentReport_status_idx" ON "EventIncidentReport"(status);
CREATE INDEX IF NOT EXISTS "EventIncidentReport_createdAt_idx" ON "EventIncidentReport"("createdAt");
