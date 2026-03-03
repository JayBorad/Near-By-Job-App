CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserMode" AS ENUM ('JOB_PICKER', 'JOB_POSTER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE
      WHEN "role"::text = 'JOB_POSTER' THEN 'USER'
      WHEN "role"::text = 'JOB_PICKER' THEN 'USER'
      ELSE "role"::text
    END
  )::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User"
  ADD COLUMN "userMode" "UserMode" NOT NULL DEFAULT 'JOB_PICKER';

UPDATE "User"
SET "userMode" = CASE
  WHEN "role" = 'ADMIN' THEN 'JOB_POSTER'::"UserMode"
  ELSE 'JOB_PICKER'::"UserMode"
END;

UPDATE "User"
SET "userMode" = 'JOB_POSTER'::"UserMode"
WHERE "role" = 'USER' AND EXISTS (
  SELECT 1 FROM "Job" j WHERE j."createdBy" = "User"."id"
);

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

CREATE INDEX "User_userMode_idx" ON "User"("userMode");
