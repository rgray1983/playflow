ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "workflowStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmationToken" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmationUrl" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "pendingExpiresAt" TIMESTAMP(3);
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Party_confirmationToken_key" ON "Party"("confirmationToken");
CREATE INDEX IF NOT EXISTS "Party_workflowStep_idx" ON "Party"("workflowStep");
CREATE INDEX IF NOT EXISTS "Party_pendingExpiresAt_idx" ON "Party"("pendingExpiresAt");

UPDATE "Party"
SET "workflowStep" = CASE
  WHEN status = 'PENDING' THEN 0
  WHEN status = 'CONFIRMED' THEN 1
  WHEN status = 'READY' THEN 2
  WHEN status = 'IN_PROGRESS' THEN 3
  WHEN status = 'CLEANING_UP' THEN 5
  WHEN status = 'COMPLETED' THEN 7
  ELSE "workflowStep"
END
WHERE "workflowStep" IS NULL OR "workflowStep" = 0;
