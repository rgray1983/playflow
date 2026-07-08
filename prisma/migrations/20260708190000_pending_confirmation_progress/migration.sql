ALTER TABLE "Party"
  ADD COLUMN IF NOT EXISTS "workflowStep" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "confirmationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "depositCapturedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Party_confirmationToken_key" ON "Party"("confirmationToken");
CREATE INDEX IF NOT EXISTS "Party_workflowStep_idx" ON "Party"("workflowStep");
CREATE INDEX IF NOT EXISTS "Party_confirmationExpiresAt_idx" ON "Party"("confirmationExpiresAt");

UPDATE "Party"
SET "workflowStep" = CASE
  WHEN status = 'PENDING' THEN 'PENDING'
  WHEN status = 'CONFIRMED' THEN 'CONFIRMED'
  WHEN status = 'READY' THEN 'ROOM_SETUP'
  WHEN status = 'IN_PROGRESS' THEN 'PARTY_TIME'
  WHEN status = 'CLEANING_UP' THEN 'PAYMENT'
  WHEN status = 'COMPLETED' THEN 'CLEANUP'
  ELSE "workflowStep"
END
WHERE "workflowStep" IS NULL OR "workflowStep" = 'PENDING';
