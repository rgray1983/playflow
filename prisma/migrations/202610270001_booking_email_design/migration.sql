-- Frozen HTML and inline logo attachments keep retries identical to the original email.
ALTER TABLE "BookingMessage" ADD COLUMN "presentation" JSONB;
