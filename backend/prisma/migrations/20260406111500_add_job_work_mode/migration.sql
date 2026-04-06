-- CreateEnum
CREATE TYPE "JobWorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "workMode" "JobWorkMode" NOT NULL DEFAULT 'ONSITE';

-- CreateIndex
CREATE INDEX "Job_workMode_idx" ON "Job"("workMode");
