CREATE TABLE "PaymentConnection" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT,
 "mode" TEXT NOT NULL CHECK ("mode" IN ('sandbox','live')),
 "merchantId" TEXT, "locationId" TEXT, "locationLabel" TEXT,
 "accessToken" TEXT, "refreshToken" TEXT, "expiresAt" TIMESTAMP(3),
 "stateHash" TEXT UNIQUE, "stateExpiresAt" TIMESTAMP(3), "stateUserId" TEXT,
 "connectedBy" TEXT, "checkedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE ("tenantId","mode")
);
CREATE TABLE "ProviderCheckout" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT,
 "connectionId" TEXT NOT NULL REFERENCES "PaymentConnection"("id") ON DELETE RESTRICT,
 "mode" TEXT NOT NULL CHECK ("mode" IN ('sandbox','live')),
 "requestId" TEXT NOT NULL,"requestHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','PAID','FAILED','REVIEW')),
 "amountCents" INTEGER NOT NULL CHECK ("amountCents">0 AND "amountCents"<=100000000),
 "targetKeys" TEXT[] NOT NULL,"payload" JSONB NOT NULL,"actor" JSONB NOT NULL,"sourceToken" TEXT,
 "providerPaymentId" TEXT UNIQUE,"receiptUrl" TEXT,"failureCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE ("tenantId","requestId")
);
CREATE INDEX "ProviderCheckout_tenantId_status_idx" ON "ProviderCheckout"("tenantId","status");
CREATE INDEX "ProviderCheckout_targetKeys_idx" ON "ProviderCheckout" USING GIN("targetKeys");
