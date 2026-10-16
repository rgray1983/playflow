-- Keep invitation links unchanged. Host access gets an independent secret.
ALTER TABLE "Party" ADD COLUMN IF NOT EXISTS "hostToken" TEXT;

-- Two random UUIDs provide independent, unguessable tokens without extensions.
UPDATE "Party"
SET "hostToken" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "hostToken" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Party_hostToken_key" ON "Party"("hostToken");
