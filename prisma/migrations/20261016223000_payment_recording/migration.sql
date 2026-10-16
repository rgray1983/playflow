ALTER TABLE "EventPayment" ADD COLUMN "requestId" TEXT, ADD COLUMN "requestFingerprint" TEXT, ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'BALANCE', ADD COLUMN "staffName" TEXT, ADD COLUMN "staffEmployeeId" TEXT;
CREATE UNIQUE INDEX "EventPayment_tenantId_partyId_requestId_key" ON "EventPayment"("tenantId", "partyId", "requestId");
ALTER TYPE "EventDepositStatus" ADD VALUE IF NOT EXISTS 'OTHER_COLLECTED';
