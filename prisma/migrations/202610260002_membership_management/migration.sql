ALTER TABLE "Membership" ADD COLUMN "visitCreditAdjustment" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "renewedFromId" TEXT;
CREATE UNIQUE INDEX "Membership_renewedFromId_key" ON "Membership"("renewedFromId");
CREATE TABLE "MembershipChange" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT,
 "membershipId" TEXT NOT NULL REFERENCES "Membership"("id") ON DELETE RESTRICT, "familyId" TEXT NOT NULL,
 "action" TEXT NOT NULL, "relatedMembershipId" TEXT, "creditDelta" INTEGER NOT NULL DEFAULT 0,
 "reason" TEXT NOT NULL, "staffId" TEXT NOT NULL, "staffName" TEXT NOT NULL,
 "requestId" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MembershipChange_tenantId_requestId_key" ON "MembershipChange"("tenantId","requestId");
CREATE INDEX "MembershipChange_tenantId_membershipId_createdAt_idx" ON "MembershipChange"("tenantId","membershipId","createdAt");
ALTER TABLE "BookingMessage" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "retryAt" TIMESTAMP(3);
ALTER TABLE "BookingMessage" ADD COLUMN "senderFrom" TEXT;
