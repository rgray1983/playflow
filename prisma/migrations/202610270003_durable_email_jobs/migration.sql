-- AlterTable
ALTER TABLE "BookingMessage" ADD COLUMN     "automationAt" TIMESTAMP(3),
ADD COLUMN     "automationClaimedAt" TIMESTAMP(3),
ADD COLUMN     "automationError" TEXT,
ADD COLUMN     "automationKey" TEXT,
ADD COLUMN     "automationRunId" TEXT;

