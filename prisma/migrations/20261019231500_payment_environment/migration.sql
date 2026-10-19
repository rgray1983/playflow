ALTER TABLE "EventPayment" ADD COLUMN "providerMode" TEXT CHECK ("providerMode" IS NULL OR "providerMode" IN ('sandbox','live'));
ALTER TABLE "CounterPayment" ADD COLUMN "providerMode" TEXT CHECK ("providerMode" IS NULL OR "providerMode" IN ('sandbox','live'));
