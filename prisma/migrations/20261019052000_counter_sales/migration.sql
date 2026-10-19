-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "counterSaleId" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "termsSnapshot" JSONB;

-- CreateTable
CREATE TABLE "CounterSale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "quoteSnapshot" JSONB NOT NULL,
    "businessSnapshot" JSONB NOT NULL,
    "membershipId" TEXT,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "methodLabel" TEXT NOT NULL,
    "notes" TEXT,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CounterSale_membershipId_key" ON "CounterSale"("membershipId");

-- CreateIndex
CREATE INDEX "CounterSale_tenantId_familyId_createdAt_idx" ON "CounterSale"("tenantId", "familyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CounterSale_tenantId_requestId_key" ON "CounterSale"("tenantId", "requestId");

-- CreateIndex
CREATE INDEX "CounterPayment_saleId_collectedAt_idx" ON "CounterPayment"("saleId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CounterPayment_tenantId_requestId_key" ON "CounterPayment"("tenantId", "requestId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_counterSaleId_fkey" FOREIGN KEY ("counterSaleId") REFERENCES "CounterSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterPayment" ADD CONSTRAINT "CounterPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterPayment" ADD CONSTRAINT "CounterPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CounterSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE INDEX "Visit_counterSaleId_idx" ON "Visit"("counterSaleId");
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_valid_amounts" CHECK ("subtotalCents">=0 AND "taxCents">=0 AND "feeCents">=0 AND "totalCents"="subtotalCents"+"taxCents"+"feeCents" AND "totalCents"<=100000000);
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_valid_kind_status" CHECK ("kind" IN ('ADMISSION','MEMBERSHIP') AND "status" IN ('OPEN','PAID','VOID'));
ALTER TABLE "CounterPayment" ADD CONSTRAINT "CounterPayment_valid_amount" CHECK ("amountCents">0 AND "amountCents"<=100000000 AND "method" IN ('cash','card','other'));
