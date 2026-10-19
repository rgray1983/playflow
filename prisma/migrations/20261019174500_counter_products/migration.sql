CREATE TABLE "CounterProduct" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "name" TEXT NOT NULL,
 "category" TEXT NOT NULL,
 "priceCents" INTEGER NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "updatedBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CounterProduct_valid_values" CHECK ("priceCents">=0 AND "priceCents"<=100000000 AND "category" IN ('SNACK','RETAIL'))
);
CREATE INDEX "CounterProduct_tenantId_active_category_idx" ON "CounterProduct"("tenantId","active","category");
-- Widen the existing classification check atomically; no sales are removed or rewritten.
ALTER TABLE "CounterSale" DROP CONSTRAINT "CounterSale_valid_kind_status", ADD CONSTRAINT "CounterSale_valid_kind_status" CHECK ("kind" IN ('ADMISSION','MEMBERSHIP','RETAIL','CUSTOM') AND "status" IN ('OPEN','PAID','VOID'));
-- Restore the four original development POS items with their original demo prices.
INSERT INTO "CounterProduct" ("id","tenantId","name","category","priceCents","updatedBy","updatedAt")
SELECT 'starter-pos-'||items.key,t.id,items.name,items.category,items.price,'development-pos-restore',CURRENT_TIMESTAMP
FROM "Tenant" t CROSS JOIN (VALUES
 ('water','Bottled Water','SNACK',200),('juice','Juice Box','SNACK',250),('chips','Chips','SNACK',175),('socks','Grip Socks','RETAIL',400)
) AS items(key,name,category,price) WHERE t.slug='palmetto-playhouse';
