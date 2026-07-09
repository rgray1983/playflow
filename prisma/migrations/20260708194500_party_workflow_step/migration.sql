ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "workflowStep" TEXT DEFAULT 'PENDING';
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmationToken" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmationUrl" TEXT;
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "pendingExpiresAt" TIMESTAMP(3);
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Party_confirmationToken_key" ON "Party"("confirmationToken");
CREATE INDEX IF NOT EXISTS "Party_workflowStep_idx" ON "Party"("workflowStep");
CREATE INDEX IF NOT EXISTS "Party_pendingExpiresAt_idx" ON "Party"("pendingExpiresAt");

UPDATE "Party"
SET "workflowStep" = CASE
  WHEN status = 'PENDING' THEN 'PENDING'
  WHEN status = 'CONFIRMED' THEN 'CONFIRMED'
  WHEN status = 'READY' THEN 'ROOM_SETUP'
  WHEN status = 'IN_PROGRESS' THEN 'CHECK_IN'
  WHEN status = 'CLEANING_UP' THEN 'PAYMENT'
  WHEN status = 'COMPLETED' THEN 'CLEANUP'
  ELSE COALESCE("workflowStep", 'PENDING')
END
WHERE "workflowStep" IS NULL OR "workflowStep" = 'PENDING';