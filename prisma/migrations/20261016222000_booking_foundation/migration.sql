ALTER TABLE "Tenant" ADD COLUMN "bookingSettings" JSONB;
ALTER TABLE "Party" ADD COLUMN "bookingRequestId" TEXT, ADD COLUMN "pricingSnapshot" JSONB;
CREATE UNIQUE INDEX "Party_tenantId_bookingRequestId_key" ON "Party"("tenantId", "bookingRequestId");
ALTER TABLE "PartyAddOn" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 0;
