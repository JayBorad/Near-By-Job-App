DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "gender" "Gender",
  ADD COLUMN IF NOT EXISTS "address" TEXT;

UPDATE "User"
SET "username" = split_part("email", '@', 1)
WHERE "username" IS NULL;

WITH duplicates AS (
  SELECT id,
         username,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY "createdAt", id) AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = CONCAT(u."username", '_', d.rn)
FROM duplicates d
WHERE u.id = d.id AND d.rn > 1;

ALTER TABLE "User"
  ALTER COLUMN "username" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_username_key'
  ) THEN
    CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
  END IF;
END $$;
