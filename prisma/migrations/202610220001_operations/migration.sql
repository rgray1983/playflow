ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "operationalSettings" JSONB;
CREATE TABLE "BookingMessage" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id"), "partyId" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "dedupeKey" TEXT NOT NULL, "recipient" TEXT NOT NULL, "subject" TEXT NOT NULL,
 "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3), "providerId" TEXT, "attemptedAt" TIMESTAMP(3), "failureCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "BookingMessage_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id")
);
CREATE UNIQUE INDEX "BookingMessage_tenantId_dedupeKey_key" ON "BookingMessage"("tenantId","dedupeKey");
CREATE INDEX "BookingMessage_tenantId_status_scheduledAt_idx" ON "BookingMessage"("tenantId","status","scheduledAt");
CREATE TABLE "PaymentRefund" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id"),
 "checkoutId" TEXT NOT NULL REFERENCES "ProviderCheckout"("id"), "requestId" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "reason" TEXT NOT NULL, "staffId" TEXT NOT NULL,
 "staffName" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "providerRefundId" TEXT,
 "mode" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PaymentRefund_tenantId_requestId_key" ON "PaymentRefund"("tenantId","requestId");
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");
CREATE INDEX "PaymentRefund_tenantId_createdAt_idx" ON "PaymentRefund"("tenantId","createdAt");
ALTER TABLE "ProviderCheckout" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'CARD', ADD COLUMN "readerState" TEXT, ADD COLUMN "readerOrderId" TEXT;
