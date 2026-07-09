CREATE TABLE "CommerceSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentMethods" JSONB NOT NULL,
    "depositRules" JSONB NOT NULL,
    "taxRules" JSONB NOT NULL,
    "feeRules" JSONB NOT NULL,
    "tipRules" JSONB NOT NULL,
    "discountRules" JSONB NOT NULL,
    "refundRules" JSONB NOT NULL,
    "receiptRules" JSONB NOT NULL,
    "checkoutRules" JSONB NOT NULL,
    "processorRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommerceSettings_tenantId_key" ON "CommerceSettings"("tenantId");

ALTER TABLE "CommerceSettings" ADD CONSTRAINT "CommerceSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
